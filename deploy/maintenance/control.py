"""Local/operator-only flag control; never calls Docker, HTTP, env files or VPS."""
import argparse
import os
from pathlib import Path
import stat
import tempfile


def directory(value):
    path=Path(value)
    if not path.is_absolute() or path == Path(path.anchor) or path.resolve()!=path:
        raise ValueError("Use an absolute, dedicated, existing state directory without symlinks")
    if not path.is_dir() or path.is_symlink():
        raise ValueError("State directory must already exist")
    if os.name != 'nt':
        info=path.stat()
        if info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) & 0o022:
            raise ValueError("State directory must be operator-owned and not writable by others")
    for parent in (path,*path.parents):
        if parent.is_symlink():raise ValueError("Symlink state paths are not allowed")
    return path


def control(root,command):
    root=directory(root)
    target=root/'enabled'
    if target.exists() or target.is_symlink():
        info=target.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 128 or target.read_bytes() != b'manual-maintenance-v1\n':
            raise ValueError("Unexpected flag file type")
    if command == 'on' and not target.exists():
        descriptor,name=tempfile.mkstemp(prefix='.maintenance-',dir=root)
        try:
            with os.fdopen(descriptor,'wb') as stream:
                stream.write(b'manual-maintenance-v1\n');stream.flush();os.fsync(stream.fileno())
            os.replace(name,target)
        finally:
            Path(name).unlink(missing_ok=True)
    if command == 'off':target.unlink(missing_ok=True)
    return target.is_file()


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=('on','off','status'))
    parser.add_argument('--state-dir',required=True)
    args=parser.parse_args()
    try:print('on' if control(args.state_dir,args.command) else 'off')
    except (OSError,ValueError) as error:parser.exit(1,'Unsafe or inaccessible maintenance state directory/flag.\n')
