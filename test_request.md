(workEnv) PS C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend> pip install -r requirements.txt  
ERROR: Exception:
Traceback (most recent call last):
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\cli\base_command.py", line 180, in exc_logging_wrapper
    status = run_func(*args)
             ^^^^^^^^^^^^^^^
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\cli\req_command.py", line 245, in wrapper
    return func(self, options, args)
           ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\commands\install.py", line 342, in run
    reqs = self.get_requirements(args, options, finder, session)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\cli\req_command.py", line 433, in get_requirements
    for parsed_req in parse_requirements(
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\req\req_file.py", line 156, in parse_requirements
    for parsed_line in parser.parse(filename, constraint):
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\req\req_file.py", line 337, in parse
    yield from self._parse_and_recurse(filename, constraint)
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\req\req_file.py", line 342, in _parse_and_recurse
    for line in self._parse_file(filename, constraint):
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\req\req_file.py", line 373, in _parse_file
    _, content = get_file_content(filename, self._session)
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\req\req_file.py", line 551, in get_file_content
    content = auto_decode(f.read())
              ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\gvozd\Desktop\01_programs\full_stack\18_whypda\wwwhypda\wwwhypda-backend\workEnv\Lib\site-packages\pip\_internal\utils\encoding.py", line 26, in auto_decode
    return data[len(bom) :].decode(encoding)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
UnicodeDecodeError: 'utf-16-le' codec can't decode byte 0x0a in position 1084: truncated data

[notice] A new release of pip is available: 24.0 -> 25.2
[notice] To update, run: python.exe -m pip install --upgrade pip