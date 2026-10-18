"""Public advisory metadata only; does not import application or execute package code."""
from pathlib import Path
import json,urllib.request,argparse,re,subprocess

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/security/stage010-dependencies.json'

def fetch(url,body=None):
    raw=json.dumps(body).encode() if body is not None else None
    request=urllib.request.Request(url,data=raw,headers={'Content-Type':'application/json','User-Agent':'wwwhypda-local-audit'})
    with urllib.request.urlopen(request,timeout=45) as response:return json.load(response)


def main():
    raw=(ROOT/'wwwhypda-backend/requirements.txt').read_bytes()
    requirements=raw.decode('utf-16' if raw.startswith(b'\xff\xfe') else 'utf-8')
    packages=[dict(name=name,version=version) for name,version in re.findall(r'^([A-Za-z0-9_.-]+)==([^\s]+)',requirements,re.M)]
    assert packages, 'Invalid/empty dependency inventory'
    queries=[dict(package=dict(name=p['name'],ecosystem='PyPI'),version=p['version']) for p in packages]
    response=fetch('https://api.osv.dev/v1/querybatch',dict(queries=queries))
    assert len(response.get('results',[]))==len(packages),'Incomplete OSV batch'
    ids=set()
    for package,result in zip(packages,response['results']):
        package['advisories']=[v['id'] for v in result.get('vulns',[])];ids.update(package['advisories'])
    advisories={name:fetch('https://api.osv.dev/v1/vulns/'+name) for name in sorted(ids)}
    OUT.write_text(json.dumps(dict(source='OSV public API; PyPI ecosystem, explicit package/version for every nonempty query',packages=packages,advisories=advisories),indent=2),encoding='utf-8')
    print('Python packages:',len(packages),'OSV ids:',len(ids))
    for package in packages:
        if package['advisories']:print(package['name'],package['version'],','.join(package['advisories']))

if __name__=='__main__':main()
