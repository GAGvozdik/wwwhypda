import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function compile(file,require=()=>{throw Error('Unexpected dependency');}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true
 }}).outputText,{exports,require});
 return exports;
}
const state=compile('src/components/commonFeatures/initialPageLoadingState.ts');
const timing=compile('src/components/commonFeatures/loadingPresentation.ts');
function clockFixture(){
 let now=0,id=0;const tasks=new Map();
 const after=(ms,callback)=>{const key=++id;tasks.set(key,{at:now+ms,callback});return ()=>tasks.delete(key);};
 const clock={now:()=>now,after,frame:callback=>after(16,callback)};
 const advance=target=>{
  while(true){
   const next=[...tasks].filter(([,task])=>task.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next)break;tasks.delete(next[0]);now=next[1].at;next[1].callback();
  }now=target;
 };
 return {clock,tasks,advance};
}
test('one page waits for the profile and both tables, including first grid paint, before releasing its cover once',()=>{
 const f=clockFixture(),changes=[],page=state.createInitialPageLoading(value=>changes.push(value),f.clock);
 page.set('profile',true);page.set('users',true);page.set('submissions',true);page.start();
 page.set('profile',false);page.paint('users');f.advance(32);
 assert.equal(page.isBusy(),true);assert.equal(changes.length,0);
 page.paint('submissions');f.advance(95);assert.equal(page.isBusy(),true);
 f.advance(96);assert.equal(page.isBusy(),false);assert.deepEqual(changes,[false]);
});
test('late registrations cancel premature completion, and later table refreshes do not restart a completed page cover',()=>{
 const f=clockFixture(),changes=[],page=state.createInitialPageLoading(value=>changes.push(value),f.clock);
 page.start();f.advance(16);page.set('late-grid',true);f.advance(100);
 assert.equal(page.isBusy(),true);
 page.set('late-grid',false);f.advance(132);
 assert.equal(page.isBusy(),false);
 page.set('refresh',true);page.remove('late-grid');page.start();f.advance(1000);
 assert.equal(page.isBusy(),false);assert.deepEqual(changes,[false]);assert.equal(f.tasks.size,0);
});
test('unmount cancels stale paint/settle callbacks and strict-effect resumption can finish without restarting the page lifecycle',()=>{
 const f=clockFixture(),changes=[],page=state.createInitialPageLoading(value=>changes.push(value),f.clock);
 page.set('grid',true);page.start();page.paint('grid');
 const stale=[...f.tasks.values()][0].callback;
 page.dispose();stale();f.advance(100);
 assert.equal(changes.length,0);assert.equal(f.tasks.size,0);
 page.start();page.paint('grid');f.advance(164);
 assert.deepEqual(changes,[false]);assert.equal(f.tasks.size,0);
});
test('input grid readiness handles populated, empty and error responses without relying on a hidden table becoming visible',()=>{
 for(const mode of ['populated','empty','error']){
  const f=clockFixture(),page=state.createInitialPageLoading(()=>{},f.clock);
  let cleanup;
  const hook=compile('src/components/commonFeatures/initialPageLoading.ts',id=>{
   assert.equal(id,'react');
   return {createContext:()=>({}),useContext:()=>page,useId:()=>mode,useLayoutEffect:callback=>cleanup=callback()};
  });
  const ready=hook.useInitialGridReady(mode==='populated'?3:0,mode==='error'?'Safe error':null);
  page.start();
  if(mode==='populated'){
   ready.onGridReady();f.advance(100);
   assert.equal(page.isBusy(),true);ready.onFirstDataRendered();f.advance(164);
  }else if(mode==='empty'){ready.onGridReady();f.advance(64);}
  else f.advance(32);
  assert.equal(page.isBusy(),false,mode);
  cleanup?.();assert.equal(f.tasks.size,0);
 }
});

function boundaryFixture(reduced=false){
 const f=clockFixture(),slots=[],effects=[];
 let cursor=0,presentation;
 const jsx=(type,props,key)=>({type,props,key});
 const react={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>slots[i]=value];},
  useLayoutEffect(callback,deps){
   const i=cursor++,old=slots[i];
   if(!old||deps.some((value,index)=>value!==old.deps[index]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:callback()};});
  }
 };
 const component=compile('src/components/commonFeatures/loadingSwap.tsx',id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id.endsWith('initialPageLoadingState'))return {createInitialPageLoading:notify=>state.createInitialPageLoading(notify,f.clock)};
  if(id.endsWith('/initialPageLoading'))return {InitialPageLoadingContext:{Provider:'PageProvider'}};
  if(id.endsWith('useLoadingPresentation'))return {useLoadingPresentation:(loading,skipExit)=>{
   presentation??=timing.createLoadingPresentation(loading,()=>{},f.clock);
   presentation.setLoading(loading,reduced||skipExit);
   return loading?'loading':presentation.getPhase();
  }};
  if(id.endsWith('loadingPresentation'))return {LOADING_EXIT_MS:220};
  if(id.endsWith('.scss'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});
  throw Error(id);
 });
 return {...f,render(props){cursor=0;const tree=component.default({coordinatePage:true,animateSwap:false,animateEnter:false,...props});effects.splice(0).forEach(effect=>effect());return tree;}};
}
test('auth-to-data handoff keeps the same cover while verified grids prepare in layout and crossfades it only after all data is ready',()=>{
 const h=boundaryFixture(),fallback={type:'placeholder',props:{'data-page-skeleton':'account'}},child={type:'private-page',props:{}};
 let tree=h.render({loading:true,fallback,children:null});
 assert.equal(tree.props.children[0].props.children,null);
 const cover=tree.props.children[1];
 assert.equal(cover.key,'page-pending');
 assert.equal(cover.props.children,fallback);
 h.advance(50);
 tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 const provider=tree.props.children[0].props.children,page=provider.props.value;
 page.set('users',true);page.set('submissions',true);
 assert.equal(provider.props.children,child);
 assert.equal(tree.props.children[0].props.style.visibility,'hidden');
 assert.equal(tree.props.children[0].props.hidden,undefined);
 h.advance(750);page.set('users',false);
 tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(tree.props.children[1].key,cover.key);
 assert.equal(tree.props.children[1].props.children,fallback);
 assert.equal(tree.props.children[1].props['data-phase'],'loading');
 page.paint('submissions');h.advance(814);
 tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(tree.props.children[1].props['data-phase'],'exiting');
 assert.equal(tree.props.children[0].props.style.visibility,undefined);
 assert.equal(tree.props.children[0].props.inert,true);
 assert.equal(tree.props.children[0].props.children.props.children,child);
 h.advance(1034);tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(tree.props.children[1],false);
 assert.equal(tree.props.children[0].props.inert,false);
 assert.equal(tree.props.children[0].props.children.props.children,child);
 page.set('refresh',true);
 assert.equal(h.render({loading:false,preserveContent:true,fallback,children:child}).props.children[1],false);
});
test('a denied guest never mounts private content and is not blocked by unstarted page-data collection',()=>{
 const h=boundaryFixture(),fallback={type:'login-placeholder',props:{}},redirect={type:'redirect',props:{}};
 h.render({loading:true,fallback,children:null});h.advance(750);
 const tree=h.render({loading:false,fallback,children:redirect});
 assert.equal(tree.props['aria-busy'],false);
 assert.equal(tree.props.children[0].props.children,redirect);
 assert.equal(tree.props.children[1],false);
});
test('reduced motion preserves the initial minimum but does not add a page-cover exit animation',()=>{
 const h=boundaryFixture(true),fallback={type:'placeholder',props:{}},child={type:'private-page',props:{}};
 h.render({loading:true,fallback,children:null});
 let tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 const page=tree.props.children[0].props.children.props.value;
 page.set('grid',true);page.paint('grid');h.advance(64);
 tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(tree.props['aria-busy'],true);
 h.advance(750);tree=h.render({loading:false,preserveContent:true,fallback,children:child});
 assert.equal(tree.props['aria-busy'],false);assert.equal(tree.props.children[1],false);
});