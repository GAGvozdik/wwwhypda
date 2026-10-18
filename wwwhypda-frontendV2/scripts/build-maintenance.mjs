// Build independent snapshots from canonical React legal documents and palette.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,cpSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const frontend=process.cwd();
const require=createRequire(resolve(frontend,'package.json'));
const {build}=require('esbuild');
const sass=require('sass');
const postcss=require('postcss');
const source=process.env.MAINTENANCE_SOURCE || '../deploy/maintenance';
const out=process.env.MAINTENANCE_OUTPUT || '../tmp/maintenance-public';
mkdirSync(resolve(out,'assets'),{recursive:true});
const css=sass.compile(resolve(frontend,'src/components/menu.module.scss')).css;
const palette=[];
postcss.parse(css).walkRules(rule=>{
  if(rule.selector===':root' || rule.selector.includes('data-theme=')) {
    const declarations=rule.nodes.filter(node=>node.type==='decl' && node.prop.startsWith('--')).map(node=>node.toString());
    if(declarations.length)palette.push(`${rule.selector===':root'?':root':':root[data-theme="dark"]'}{${declarations.join(';')}}`);
  }
});
const policy=sass.compile(resolve(frontend,'src/components/pages/policy.module.scss')).css;
const contour=sass.compileString('@use "formContour"; .maintenance { @include formContour.contour; }',
  {loadPaths:[resolve(frontend,'src/components/commonFeatures')]}).css;
const authCss=postcss.parse(sass.compile(resolve(frontend,'src/components/users/users.module.scss')).css);
const linkRules=[];
authCss.walkRules(rule=>{
  if(rule.selector==='.link'||rule.selector==='.link:hover'){
    const copy=rule.clone();copy.selector=rule.selector.replace('.link','.maintenance a:not(.button)');linkRules.push(copy.toString());
  }
});
writeFileSync(resolve(out,'assets/site.css'),palette.join('\n')+`
@font-face{font-family:Afacad_Flux;src:url('/maintenance/assets/font.ttf') format('truetype')}
body{margin:0;background:var(--body-color);color:var(--tree-text);font-family:Afacad_Flux,sans-serif;font-size:var(--main-font-size);color-scheme:var(--color-scheme)}
a{color:inherit} .maintenance{box-sizing:border-box;max-width:40rem;margin:3rem auto;padding:2rem;background:var(--form-color);text-align:center;overflow-wrap:anywhere}
.button{display:inline-block;background:var(--menu);color:var(--submit-button-text);padding:.75rem 1.25rem;border-radius:4px}nav{line-height:1.8} h1{font-size:var(--head-font-size)}
`+policy+'\n'+contour+'\n'+linkRules.join('\n'));
copyFileSync(resolve(frontend,'src/assets/fonts/Afacad_Flux/AfacadFlux-VariableFont_slnt,wght.ttf'),resolve(out,'assets/font.ttf'));
copyFileSync(resolve(source,'theme.js'),resolve(out,'assets/theme.js'));
copyFileSync(resolve(source,'index.html'),resolve(out,'index.html'));
cpSync(resolve(frontend,'public/legal'),resolve(out,'legal'),{recursive:true});
const bundle=resolve(out,'render.cjs');
await build({stdin:{contents:`
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {MemoryRouter} from 'react-router-dom';
import Privacy from './src/components/pages/privacyPolicy';import Cookie from './src/components/pages/cookiePolicy';import Agreement from './src/components/pages/userAgreement';
console.log(JSON.stringify([['privacy-policy',Privacy],['cookie-policy',Cookie],['user-agreement',Agreement]].map(([slug,Page])=>({slug,html:renderToStaticMarkup(<MemoryRouter><Page/></MemoryRouter>)}))));
`,resolveDir:frontend,loader:'tsx'},bundle:true,platform:'node',format:'cjs',outfile:bundle,jsx:'automatic',define:{'import.meta.env.BASE_URL':'"/"'},plugins:[{name:'canonical-styles',setup(builder){builder.onLoad({filter:/\.scss$/},()=>({contents:'export default new Proxy({}, {get:(_target,key)=>String(key)});',loader:'js'}));}}]});
const rendered=spawnSync(process.execPath,[bundle],{encoding:'utf8'});
if(rendered.status!==0)throw new Error('Canonical legal render failed');
for(const {slug,html} of JSON.parse(rendered.stdout))writeFileSync(resolve(out,slug+'.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WWHYPDA — ${slug}</title><script src="/maintenance/assets/theme.js"></script><link rel="stylesheet" href="/maintenance/assets/site.css"></head><body><nav class="container"><a href="/">Back to website</a></nav>${html}</body></html>`);
console.log('Independent maintenance assets and three canonical legal snapshots generated.');
