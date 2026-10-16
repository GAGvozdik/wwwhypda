import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const frontend=resolve(root,'wwwhypda-frontendV2');
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(frontend,'public/legal/manifest.json'),'utf8'));
const version=readFileSync(resolve(frontend,'src/common/userAgreementVersion.ts'),'utf8').match(/USER_AGREEMENT_VERSION = '([^']+)'/)[1];
if(manifest.version!==version) throw new Error('Legal PDF version is stale: regenerate.');
for(const [path,digest] of Object.entries(manifest.sources)) {
  if(hash(readFileSync(resolve(root,path),'utf8').replaceAll('\r\n','\n'))!==digest) throw new Error('Legal PDF source changed: '+path);
}
if(manifest.documents.length!==3) throw new Error('Expected three legal PDFs.');
for(const doc of manifest.documents) {
  const raw=readFileSync(resolve(frontend,'public/legal',doc.file));
  if(raw.subarray(0,5).toString()!=='%PDF-' || hash(raw)!==doc.sha256 ||
     doc.file!==doc.slug+'-'+version+'.pdf' || doc.pages<1) throw new Error('Invalid/stale PDF: '+doc.slug);
}
console.log('Three versioned legal PDFs match sources and checksums.');
