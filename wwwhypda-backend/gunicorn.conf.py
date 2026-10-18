"""Bounded production default. Set GUNICORN_WORKERS/THREADS explicitly to tune."""
import os


def bounded(name, default, maximum):
    value=int(os.environ.get(name,default))
    if not 1<=value<=maximum:raise ValueError(name+' outside supported range')
    return value

workers=bounded('GUNICORN_WORKERS',2,8)
threads=bounded('GUNICORN_THREADS',4,16)
if threads<2:raise ValueError('GUNICORN_THREADS must reserve capacity for ordinary reads')
worker_class='gthread'
bind='0.0.0.0:5000'
timeout=30
graceful_timeout=30
