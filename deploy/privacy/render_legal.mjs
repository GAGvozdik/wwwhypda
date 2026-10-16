// Render actual React documents; no JSX regex extraction or eval.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = resolve(root, 'wwwhypda-frontendV2');
const require = createRequire(resolve(frontend, 'package.json'));
const { build } = require('esbuild');
const temporary = resolve(root, 'tmp/pdfs');
mkdirSync(temporary, { recursive: true });
const entry = `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import UserAgreement from './src/components/pages/userAgreement';
import PrivacyPolicy from './src/components/pages/privacyPolicy';
import CookiePolicy from './src/components/pages/cookiePolicy';
import {USER_AGREEMENT_VERSION} from './src/common/userAgreementVersion';
const documents=[['user-agreement',UserAgreement],['privacy-policy',PrivacyPolicy],['cookie-policy',CookiePolicy]];
process.stdout.write(JSON.stringify({version:USER_AGREEMENT_VERSION,documents:documents.map(([slug,Page])=>({
  slug,html:renderToStaticMarkup(<MemoryRouter><Page /></MemoryRouter>)
}))}));
`;
const bundle = resolve(temporary, 'legal-render.cjs');
await build({
  stdin: { contents: entry, resolveDir: frontend, sourcefile: 'legal-render.tsx', loader: 'tsx' },
  absWorkingDir: frontend, bundle: true, platform: 'node', format: 'cjs',
  outfile: bundle, jsx: 'automatic',
  define: { 'import.meta.env.BASE_URL': '"/"' },
  plugins: [{ name: 'styles-only', setup(builder) {
    builder.onLoad({filter:/\.scss$/},()=>({contents:'export default new Proxy({}, {get: (_target,key)=>String(key)});',loader:'js'}));
  }}],
});
const result=spawnSync(process.execPath,[bundle],{encoding:'utf8',maxBuffer:4*1024*1024});
if(result.status!==0) throw new Error('React legal rendering failed: '+result.stderr);
JSON.parse(result.stdout);
writeFileSync(resolve(temporary,'legal-rendered.json'),result.stdout);
console.log('Rendered three legal documents from React sources.');
