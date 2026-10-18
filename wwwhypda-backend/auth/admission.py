"""Four nonblocking kernel-held slots, shared across threads/workers in one container.

No email/token lookup. flock releases on process death, exceptions and normal teardown.
The private tmpfs directory must be shared by workers; not shared across containers.
"""
import fcntl
import os
import stat
from threading import BoundedSemaphore
from pathlib import Path
from flask import g, jsonify, request

ROOT=Path('/tmp/wwwhypda-auth-admission')
LIMIT=4
# Reserve at least one gthread per worker for ordinary reads, even when the
# accept loop dispatches every auth connection to the same worker.
LOCAL=BoundedSemaphore(max(1,min(3,int(os.environ.get("GUNICORN_THREADS","4"))-1)))
HEAVY={'users.login','users.add_user','users.request_password_reset',
       'users.confirm_password_reset','users.confirm_registration','users.resend_confirmation'}


def acquire():
    ROOT.mkdir(mode=0o700,exist_ok=True)
    info=ROOT.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid!=os.getuid() or stat.S_IMODE(info.st_mode)!=0o700:
        raise OSError('Unsafe admission directory')
    for index in range(LIMIT):
        fd=os.open(ROOT/str(index),os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW|os.O_CLOEXEC,0o600)
        try:
            info=os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_uid!=os.getuid() or info.st_nlink!=1 or stat.S_IMODE(info.st_mode)!=0o600:
                raise OSError('Unsafe admission slot')
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            return fd
        except BlockingIOError:os.close(fd)
        except BaseException:
            os.close(fd);raise
    return None


def release(fd):
    if fd is not None:os.close(fd)


def admit():
    if request.method!='POST' or request.endpoint not in HEAVY:return
    if not LOCAL.acquire(blocking=False):return jsonify(message='Too many requests'),429
    try:fd=acquire()
    except OSError:fd=None
    if fd is None:
        LOCAL.release()
        return jsonify(message='Too many requests'),429
    g.auth_admission_fd=fd


def finish(_error=None):
    fd=g.pop('auth_admission_fd',None)
    if fd is not None:
        release(fd);LOCAL.release()
