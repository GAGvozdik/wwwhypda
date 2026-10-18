"""Create source-only ESLint HEAD baseline; run on host from repository root."""
import json
from pathlib import Path
import subprocess
root=Path('wwwhypda-frontendV2')
files=subprocess.check_output(['git','diff','--name-only','HEAD','--',str(root/'src')],text=True).splitlines()
files += [str(root/'src/common/exportWorkbook.ts')]
baseline={}
for name in sorted(set(files)):
    if Path(name).suffix not in ('.ts','.tsx'):continue
    result=subprocess.run(['git','show','HEAD:'+name.replace(chr(92),'/')],capture_output=True,text=True,encoding='utf-8')
    baseline[Path(name).relative_to(root).as_posix()]=result.stdout if result.returncode==0 else None
output=Path('tmp/stage010-lint-baseline.json');output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(baseline,ensure_ascii=False),encoding='utf-8')
print('Baseline files:',len(baseline))
