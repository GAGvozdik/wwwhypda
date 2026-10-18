import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {test} from 'node:test';import ts from 'typescript';
function fixture(){
 const refs=[];let cursor=0;const effects=[];
 const react={useContext:()=>false,useRef:initial=>{const i=cursor++;if(!(i in refs))refs[i]={current:initial};return refs[i];},useLayoutEffect:fn=>effects.push(fn)};
 const jsx=(type,props)=>({type,props});
 const exports={};const code=ts.transpileModule(readFileSync('src/components/commonFeatures/authSkeleton.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.endsWith('.scss')?{}:id.endsWith('authLoadingContext')?{AuthLoadingContext:{}}:id.includes('Skeleton')?'Skeleton':'LoadIcon'});
 return props=>{cursor=0;const tree=exports.default(props);for(const fn of effects.splice(0))fn();return tree;};
}
function nodes(root){return root&&typeof root==='object'?[root,...[root.props?.children].flat(Infinity).flatMap(nodes)]:[];}
test('auth loading keeps the exact form markup mounted and its values through loading/error recovery',()=>{
 const render=fixture(),child={type:'form',props:{children:{type:'input',props:{defaultValue:'unsaved'}}}};
 const ready=render({children:child});const loading=render({loading:true,children:child});
 assert.equal(loading.type,ready.type);assert.equal(nodes(loading).includes(child),true);
 assert.equal(loading.props['aria-busy'],true);assert.equal(loading.props.children[0].props.style.visibility,'hidden');
 assert.equal(nodes(loading).some(n=>n.type==='LoadIcon'&&n.props.size===48),true);
 assert.equal(nodes(loading).find(n=>n.type==='Skeleton').props.animation,'wave');
 assert.equal(nodes(loading).find(n=>n.type==='Skeleton').props.sx.bgcolor,'var(--form-color)');
 const recovered=render({children:child});assert.equal(nodes(recovered).includes(child),true);
 assert.equal(recovered.props.children[0].props.style.visibility,undefined);
});
test('auth skeleton never replaces the established search/tree loader',()=>{
 const source=readFileSync('src/components/commonFeatures/singleSkeleton.tsx','utf8');
 assert.equal(source.includes('authSkeleton'),false);
 assert.equal(source.includes('inputContour'),false);
 assert.equal(source.includes('reserveContent'),false);
});
