import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {test} from 'node:test';import ts from 'typescript';
function fixture(){
 const refs=[];let cursor=0;const effects=[];
 const react={useContext:()=>false,useRef:initial=>{const i=cursor++;if(!(i in refs))refs[i]={current:initial};return refs[i];},useLayoutEffect:fn=>effects.push(fn)};
 const jsx=(type,props)=>({type,props});
 const exports={};const code=ts.transpileModule(readFileSync('src/components/commonFeatures/authSkeleton.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id.endsWith('useLoadingPresentation')?{useLoadingPresentation:busy=>busy?'loading':'ready'}:id.endsWith('loadingPresentation')?{LOADING_EXIT_MS:220}:id.endsWith('.json')?JSON.parse(readFileSync('src/common/error_messages.json','utf8')):id==='react'?react:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.endsWith('.scss')?{surface:'surface',noEnter:'noEnter'}:id.endsWith('authLoadingContext')?{AuthLoadingContext:{}}:id.includes('Skeleton')?'Skeleton':'LoadIcon'});
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

function timingFixture(initial=true){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/commonFeatures/loadingPresentation.ts','utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
  {exports,setTimeout,clearTimeout,Date});
 let now=0,next=0;const tasks=new Map(),phases=[];
 const clock={now:()=>now,after:(delay,callback)=>{const id=++next;tasks.set(id,{at:now+delay,callback});return ()=>tasks.delete(id);}};
 const controller=exports.createLoadingPresentation(initial,phase=>phases.push(phase),clock);
 const advance=target=>{while(true){const due=[...tasks].filter(([,task])=>task.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;tasks.delete(due[0]);now=due[1].at;due[1].callback();}now=target;};
 return {controller,advance,tasks,phases};
}
test('fast loads keep the skeleton for 750ms, finish its exit, then reveal content',()=>{
 const f=timingFixture();f.advance(40);f.controller.setLoading(false);
 f.advance(749);assert.equal(f.controller.getPhase(),'loading');
 f.advance(750);assert.equal(f.controller.getPhase(),'exiting');
 f.advance(969);assert.equal(f.controller.getPhase(),'exiting');
 f.advance(970);assert.equal(f.controller.getPhase(),'ready');assert.equal(f.tasks.size,0);
});
test('slow loads do not wait another 750ms after the response',()=>{
 const f=timingFixture();f.advance(1300);f.controller.setLoading(false);
 assert.equal(f.controller.getPhase(),'exiting');f.advance(1520);assert.equal(f.controller.getPhase(),'ready');
});
test('a new request during exit cancels stale completion and starts a fresh minimum',()=>{
 const f=timingFixture();f.advance(50);f.controller.setLoading(false);f.advance(800);
 f.controller.setLoading(true);assert.equal(f.controller.getPhase(),'loading');
 f.advance(820);f.controller.setLoading(false);f.advance(970);assert.equal(f.controller.getPhase(),'loading');
 f.advance(1550);assert.equal(f.controller.getPhase(),'exiting');f.advance(1770);assert.equal(f.controller.getPhase(),'ready');
});
test('reduced motion skips exit animation, including a preference change during exit',()=>{
 const f=timingFixture();f.controller.setLoading(false,true);f.advance(750);
 assert.equal(f.controller.getPhase(),'ready');
 const moving=timingFixture();moving.controller.setLoading(false);moving.advance(800);
 moving.controller.setLoading(false,true);assert.equal(moving.controller.getPhase(),'ready');assert.equal(moving.tasks.size,0);
});
test('unmount cancels timers and strict-effect cleanup can safely resume the same phase',()=>{
 const f=timingFixture();f.controller.setLoading(false);
 const stale=[...f.tasks.values()][0].callback;f.controller.dispose();stale();
 assert.equal(f.tasks.size,0);assert.equal(f.controller.getPhase(),'loading');
 f.advance(100);f.controller.setLoading(false);assert.equal(f.tasks.size,1);f.advance(970);
 assert.equal(f.controller.getPhase(),'ready');assert.deepEqual(f.phases,['exiting','ready']);
});
test('already loaded content is not artificially blocked until a real load starts',()=>{
 const f=timingFixture(false);f.controller.setLoading(false);assert.equal(f.tasks.size,0);
 assert.equal(f.controller.getPhase(),'ready');f.advance(500);f.controller.setLoading(true);
 f.advance(510);f.controller.setLoading(false);f.advance(1249);assert.equal(f.controller.getPhase(),'loading');
 f.advance(1470);assert.equal(f.controller.getPhase(),'ready');
});
function swapFixture(phase){
 const exports={};const jsx=(type,props)=>({type,props});
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/commonFeatures/loadingSwap.tsx','utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
  {exports,require:id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.endsWith('useLoadingPresentation')?
   {useLoadingPresentation:()=>phase}:id.endsWith('loadingPresentation')?{LOADING_EXIT_MS:220}:{pending:'pending',noEnterChildren:'noEnterChildren',staticSwap:'staticSwap'}});
 return exports.default;
}
test('a regular loading boundary does not mount its content before minimum hold and exit finish',()=>{
 const child={type:'private',props:{}},fallback={type:'skeleton',props:{}};
 for(const phase of ['loading','exiting']){
  const tree=swapFixture(phase)({loading:true,fallback,children:child});
  assert.equal(nodes(tree).includes(child),false);assert.equal(nodes(tree).includes(fallback),true);
 }
 assert.equal(nodes(swapFixture('ready')({loading:false,fallback,children:child})).includes(child),true);
});
test('verified content can mount immediately behind an inert hidden boundary without restarting its requests after reveal',()=>{
 const child={type:'verified-page',props:{}},fallback={type:'skeleton',props:{}};
 const pending=swapFixture('exiting')({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(nodes(pending).includes(child),true);
 const retained=nodes(pending).find(node=>node.props?.hidden===true);
 assert.equal(retained.props.inert,true);assert.equal(retained.props['aria-hidden'],true);
 const ready=swapFixture('ready')({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(nodes(ready).includes(child),true);assert.equal(nodes(ready).includes(fallback),false);
});
test('shared loader reserves an automatic minimum but preserves compact dimensions and Search overlay positioning',()=>{
 const exports={};const jsx=(type,props)=>({type,props});
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/commonFeatures/singleSkeleton.tsx','utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,
  {exports,require:id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'Fragment'}:
   id.endsWith('.json')?JSON.parse(readFileSync('src/common/error_messages.json','utf8')):'Component'});
 const render=props=>{const boundary=exports.default({...props,children:{type:'content',props:{}}});return boundary.props.fallback.type(boundary.props.fallback.props);};
 const automatic=render({loading:true});
 assert.equal(automatic.props.sx.minHeight,'var(--loading-min-height)');
 assert.equal(automatic.props.role,'status');
 assert.equal(automatic.props.children[1].type,'Component');
 assert.equal(render({loading:true,isLoadIcon:false}).props.children[1],'');
 assert.equal(automatic.props.sx.boxSizing,'border-box');
 assert.equal(automatic.props.children[0].props.sx.inset,0);
 assert.equal(render({loading:true,borderRadius:'0.25rem'}).props.sx.borderRadius,'0.25rem');
 const compact=render({loading:true,height:'2.5rem'});
 assert.equal(compact.props.sx.height,'2.5rem');assert.equal(compact.props.sx.minHeight,undefined);
 const overlay=render({loading:true,height:'100%',overlay:true});
 assert.equal(overlay.props.sx.position,'absolute');assert.equal(overlay.props.sx.inset,0);
});
test('a route handoff keeps its loading surface opaque while retaining the single exit and private-content boundary',()=>{
 const fallback={type:'skeleton',props:{}},child={type:'private',props:{}};
 for(const phase of ['loading','exiting']){
  const tree=swapFixture(phase)({loading:phase==='loading',animateEnter:false,fallback,children:child});
  const pending=nodes(tree).find(node=>node.props?.['data-phase']===phase);
  assert.equal(pending.props.className,'pending noEnterChildren');
  assert.equal(nodes(tree).includes(child),false);
 }
 const ordinary=swapFixture('loading')({loading:true,fallback,children:child});
 assert.equal(nodes(ordinary).find(node=>node.props?.['data-phase']==='loading').props.className,'pending');
 const routeForm=fixture()({loading:true,animateEnter:false,children:child});
 const cover=nodes(routeForm).find(node=>node.props?.role==='status');
 assert.match(cover.props.className,/surface noEnter/);
 assert.equal(nodes(routeForm).find(node=>node.props?.['aria-hidden']===true).props.style.visibility,'hidden');
 const defaultForm=fixture()({loading:true,children:child});
 assert.doesNotMatch(nodes(defaultForm).find(node=>node.props?.role==='status').props.className,/noEnter/);
});

test('account mounts exactly one authentication/role guard, preventing a second loader cycle after verification',()=>{
 const ast=ts.createSourceFile('mainBody.tsx',readFileSync('src/components/mainWindow/mainBody.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let accountRoute;
 const visit=node=>{
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='Route'){
   const path=node.attributes.properties.find(attribute=>ts.isJsxAttribute(attribute)&&attribute.name.getText(ast)==='path');
   if(path?.initializer?.text==='/account')accountRoute=node;
  }
  ts.forEachChild(node,visit);
 };
 visit(ast);assert.ok(accountRoute);
 const source=accountRoute.getText(ast);
 assert.equal((source.match(/<SuperProtectedRoute\b/g)||[]).length,1);
 assert.doesNotMatch(source,/<ProtectedRoute\b/);
 assert.match(source,/redirectIfSuperuser=\{true\}/);
 assert.match(source,/<Account\s*\/>/);
});
test('the shared circular indicator keeps site colour and paints above the skeleton surface',()=>{
 const exports={},jsx=(type,props)=>({type,props});
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/commonFeatures/loadIcon.tsx','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText,{exports,require:id=>id==='react/jsx-runtime'?{jsx,jsxs:jsx}:'CircularProgress'});
 const icon=exports.default({});
 assert.equal(icon.props.size,30);
 assert.equal(icon.props.sx.color,'var(--border)');
 assert.equal(icon.props.sx.position,'relative');
 assert.equal(icon.props.sx.zIndex,1);
});
test('a protected page keeps its static labels and stepper unchanged while only its data loaders finish',()=>{
 const child={type:'verified-page',props:{}},fallback={type:'page-placeholder',props:{}};
 const tree=swapFixture('exiting')({loading:false,preserveContent:true,animateEnter:false,animateSwap:false,children:child,fallback});
 const pending=nodes(tree).find(node=>node.props?.['data-phase']==='exiting');
 assert.match(pending.props.className,/staticSwap/);
 const ready=swapFixture('ready')({loading:false,preserveContent:true,animateSwap:false,children:child,fallback});
 const retained=nodes(ready).find(node=>node.props?.hidden===false);
 assert.match(retained.props.className,/staticSwap/);
 assert.equal(nodes(ready).includes(child),true);
});