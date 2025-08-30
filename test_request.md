backend-1   | [2025-08-30 10:30:42 +0000] [8] [ERROR] Exception in worker process
backend-1   | Traceback (most recent call last):
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/arbiter.py", line 608, in spawn_worker
backend-1   |     worker.init_process()
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/workers/base.py", line 135, in init_process
backend-1   |     self.load_wsgi()
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/workers/base.py", line 147, in load_wsgi
backend-1   |     self.wsgi = self.app.wsgi()
backend-1   |                 ^^^^^^^^^^^^^^^
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/app/base.py", line 66, in wsgi
backend-1   |     self.callable = self.load()
backend-1   |                     ^^^^^^^^^^^
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/app/wsgiapp.py", line 57, in load
backend-1   |     return self.load_wsgiapp()
backend-1   |            ^^^^^^^^^^^^^^^^^^^
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/app/wsgiapp.py", line 47, in load_wsgiapp
backend-1   |     return util.import_app(self.app_uri)
backend-1   |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1   |   File "/usr/local/lib/python3.11/site-packages/gunicorn/util.py", line 370, in import_app
backend-1   |     mod = importlib.import_module(module)
backend-1   |           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1   |   File "/usr/local/lib/python3.11/importlib/__init__.py", line 126, in import_module
backend-1   |     return _bootstrap._gcd_import(name[level:], package, level)
backend-1   |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
backend-1   |   File "<frozen importlib._bootstrap>", line 1204, in _gcd_import
backend-1   |   File "<frozen importlib._bootstrap>", line 1176, in _find_and_load
backend-1   |   File "<frozen importlib._bootstrap>", line 1147, in _find_and_load_unlocked
backend-1   |   File "<frozen importlib._bootstrap>", line 690, in _load_unlocked
backend-1   |   File "<frozen importlib._bootstrap_external>", line 940, in exec_module
backend-1   |   File "<frozen importlib._bootstrap>", line 241, in _call_with_frames_removed
backend-1   |   File "/mainApp.py", line 19, in <module>
backend-1   |     from inputData.inputData import input_bp
backend-1   |   File "/inputData/inputData.py", line 3, in <module>
backend-1   |     from inputData.inputDataModels import InputData, db
backend-1   |   File "/inputData/inputDataModels.py", line 3, in <module>
backend-1   |     from flask_login import UserMixin
backend-1   | ModuleNotFoundError: No module named 'flask_login'
backend-1   | [2025-08-30 10:30:42 +0000] [8] [INFO] Worker exiting (pid: 8)
backend-1   | [2025-08-30 10:30:43 +0000] [1] [ERROR] Worker (pid:8) exited with code 3
backend-1   | [2025-08-30 10:30:43 +0000] [1] [ERROR] Shutting down: Master
backend-1   | [2025-08-30 10:30:43 +0000] [1] [ERROR] Reason: Worker failed to boot.