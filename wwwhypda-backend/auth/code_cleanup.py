"""Отдельный процесс очистки кодов; не запускает сервер или рассылку."""
import argparse
import signal
from threading import Event

from common_defenitions import db
from auth.auth_models import ConfirmationCode


def cleanup_once(app):
    with app.app_context():
        try:
            from auth.sessions import cleanup_expired
            from auth.transaction_lock import lock_users_transaction
            lock_users_transaction()
            cleanup_expired()
            count = ConfirmationCode.cleanup_expired()
            app.logger.info("Expired authentication code cleanup: %s records", count)
            return True
        except Exception:
            db.session.rollback()
            app.logger.error("Authentication code cleanup failed; will retry")
            return False
        finally:
            db.session.remove()


def run_worker(app, stop):
    """Первый проход немедленно, затем ожидание с возможностью завершения по сигналу."""
    interval = app.config["AUTH_CODE_CLEANUP_INTERVAL_SECONDS"]
    while not stop.is_set():
        cleanup_once(app)
        stop.wait(interval)


def run_until_stopped(app):
    """Устанавливает обработчики сигналов только в отдельном процессе очистки."""
    stop = Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stop.set())
    run_worker(app, stop)


def main():
    parser = argparse.ArgumentParser(description="Authentication code cleanup")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    from mainApp import app
    if args.once:
        return 0 if cleanup_once(app) else 1
    run_until_stopped(app)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
