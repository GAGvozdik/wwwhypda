"""Bounded, awaited auth delivery; no background queue or fire-and-forget."""
import multiprocessing
import os
import signal
import ctypes
from contextlib import contextmanager
import time

from flask import Flask, current_app
from common_defenitions import mail, send_auth_email

# A single account-independent response window. SMTP gets less than this budget.
# Isolated tests can shorten it; request data and production env cannot select it.
RESPONSE_SECONDS = 4.0
MAIL_SECONDS = 3.0
MAX_SENDERS = 2


def response_seconds():
    if current_app.testing:
        return current_app.config.get("TEST_AUTH_MAIL_RESPONSE_SECONDS", current_app.config.get("TEST_PASSWORD_RESET_RESPONSE_SECONDS", .01))
    return RESPONSE_SECONDS


def wait_for_response_window(started):
    remaining = response_seconds() - (time.monotonic() - started)
    if remaining > 0:
        time.sleep(remaining)


def _deliver(settings, recipient, body, result, deadline, parent_pid):
    success = False
    try:
        # Linux parent-death signal: an HTTP worker shutdown cannot orphan SMTP.
        if ctypes.CDLL(None, use_errno=True).prctl(1, signal.SIGKILL, 0, 0, 0) != 0:
            raise OSError("Sender supervision unavailable")
        if os.getppid() != parent_pid:
            return
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        def expired(_signal, _frame):
            raise TimeoutError("Authentication email deadline elapsed")
        signal.signal(signal.SIGALRM, expired)
        signal.setitimer(signal.ITIMER_REAL, remaining)
        app = Flask(__name__)
        app.config.update(settings)
        mail.init_app(app)
        with app.app_context():
            subject, text = body
            send_auth_email(subject, recipient, text)
        success = True
    except Exception:
        # Parent logs only a generic failure; no child exception/request content.
        pass
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        try:
            result.send(success)
        except (OSError, EOFError):
            pass
        result.close()


def _send_with_slot(subject, recipient, body, started):
    """Wait for this sender; terminate/reap it before returning on timeout."""
    deadline = min(started + response_seconds() - min(0.5, response_seconds() / 10), time.monotonic() + MAIL_SECONDS)
    if time.monotonic() >= deadline:
        return False
    settings = {key: current_app.config[key] for key in (
        "MAIL_SERVER", "MAIL_PORT", "MAIL_USE_TLS", "MAIL_USE_SSL", "MAIL_USERNAME",
        "MAIL_PASSWORD", "MAIL_DEFAULT_SENDER", "MAIL_SUPPRESS_SEND", "MAIL_DELIVERY_MODE",
    ) if key in current_app.config}
    context = multiprocessing.get_context("spawn")
    receiver, sender = context.Pipe(duplex=False)
    process = None
    launched = False
    try:
        process = context.Process(target=_deliver, args=(settings, recipient,
            (subject, body), sender, deadline, os.getpid()))
        process.start()
        launched = True
        sender.close()
        process.join(max(0, deadline - time.monotonic()))
        if process.is_alive():
            return False
        return process.exitcode == 0 and receiver.poll() and receiver.recv() is True
    except (OSError, EOFError, RuntimeError):
        return False
    finally:
        if launched:
            if process.is_alive():
                process.terminate()
                process.join(0.2)
            if process.is_alive():
                process.kill()
                process.join()
        receiver.close()
        sender.close()
        if process is not None:
            process.close()


@contextmanager
def _sender_slot():
    # Linux container-wide nonblocking locks bound senders across HTTP workers.
    # Empty files contain neither recipients nor codes; locks release on process exit.
    import fcntl
    directory = "/tmp/wwwhypda-auth-mail-slots"
    os.makedirs(directory, mode=0o700, exist_ok=True)
    descriptor = None
    try:
        for index in range(MAX_SENDERS):
            candidate = os.open(f"{directory}/{index}", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
            try:
                fcntl.flock(candidate, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                os.close(candidate)
                continue
            descriptor = candidate
            break
        yield descriptor is not None
    finally:
        if descriptor is not None:
            os.close(descriptor)


def send_auth_code_email(subject, recipient, body, started):
    # Capacity failures have the same neutral HTTP contract and response window.
    with _sender_slot() as available:
        return _send_with_slot(subject, recipient, body, started) if available else False


def send_reset_email(recipient, code, started):
    return send_auth_code_email("Password Reset Code", recipient,
        f"Your password reset code: {code}", started)


def wait_for_failed_login(started):
    # Measured current/representative legacy hashes are covered without rehashing.
    window = current_app.config.get("TEST_FAILED_LOGIN_RESPONSE_SECONDS", 0) if current_app.testing else .4
    remaining = window - (time.monotonic() - started)
    if remaining > 0:
        time.sleep(remaining)
