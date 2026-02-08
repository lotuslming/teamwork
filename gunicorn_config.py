# Gunicorn configuration for TeamWork Kanban Application
# Optimized for 100+ concurrent users with WebSocket support

import os
import multiprocessing

# Server socket
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:5000')
backlog = 2048

# Worker processes
# For eventlet, use more workers as they handle concurrent connections efficiently
workers = int(os.environ.get('GUNICORN_WORKERS', 4))
worker_class = 'eventlet'
worker_connections = 1000  # Each eventlet worker can handle 1000 concurrent connections

# Timeouts
timeout = 120  # Longer timeout for file uploads and OnlyOffice operations
graceful_timeout = 30
keepalive = 5

# Restart workers after this many requests to prevent memory leaks
max_requests = 10000
max_requests_jitter = 1000

# Logging
accesslog = os.environ.get('GUNICORN_ACCESS_LOG', '-')  # '-' means stdout
errorlog = os.environ.get('GUNICORN_ERROR_LOG', '-')
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'teamwork'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (uncomment and configure for HTTPS)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'

# Hooks for application lifecycle
def on_starting(server):
    """Called just before the master process is initialized."""
    pass

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    pass

def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    pass

def worker_abort(worker):
    """Called when a worker receives SIGABRT."""
    pass

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    pass

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    pass

def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    pass

def nworkers_changed(server, new_value, old_value):
    """Called just after num_workers has been changed."""
    pass

def on_exit(server):
    """Called just before exiting Gunicorn."""
    pass
