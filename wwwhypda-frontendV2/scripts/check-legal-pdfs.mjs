import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const manifest=JSON.parse(readFileSync('public/legal/manifest.json','utf8'));
const version=readFileSync('src/common/userAgreementVersion.ts','utf8').match(/USER_AGREEMENT_VERSION = '([^']+)'/)[1];
if(manifest.version!==version || manifest.documents.length!==3) throw new Error('Regenerate all three legal PDFs.');
for(const [path,digest] of Object.entries(manifest.sources)) {
  if(!path.startsWith('wwwhypda-frontendV2/')) continue;
  const raw=readFileSync(path.slice('wwwhypda-frontendV2/'.length),'utf8').replaceAll('\r\n','\n');
  if(hash(raw)!==digest) throw new Error('Stale legal PDF source: '+path);
}
for(const doc of manifest.documents) {
  const raw=readFileSync('public/legal/'+doc.file);
  if(raw.subarray(0,5).toString()!=='%PDF-' || hash(raw)!==doc.sha256 ||
     doc.file!==doc.slug+'-'+version+'.pdf') throw new Error('Invalid/stale PDF: '+doc.slug);
}
console.log('Three legal PDFs are current.');
