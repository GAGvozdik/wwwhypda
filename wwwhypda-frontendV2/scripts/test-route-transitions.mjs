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
const location=(pathname,key=pathname,extra={})=>({pathname,key,search:'',hash:'',state:null,...extra});
function fixture(initial=location('/login')){
 const module=compile('src/components/mainWindow/routePresentation.ts'),tasks=new Map(),views=[];
 let now=0,id=0;
 const after=(delay,callback)=>{const next=++id;tasks.set(next,{at:now+delay,callback});return ()=>tasks.delete(next);};
 const clock={now:()=>now,after,frame:callback=>after(16,callback)};
 const controller=module.createRoutePresentation(initial,view=>views.push(view),clock);
 const advance=target=>{
  while(true){
   const next=[...tasks].filter(([,task])=>task.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next)break;
   tasks.delete(next[0]);now=next[1].at;next[1].callback();
  }
  now=target;
 };
 return {controller,tasks,views,advance};
}
test('every destination follows old-page exit, one route replacement and new-page entry without overlapping page instances',()=>{
 const f=fixture(),c=f.controller;
 c.update(location('/login'));f.advance(32);
 assert.equal(c.getView().phase,'ready');
 for(const [i,path] of ['/register','/forgot-password','/input','/search','/account','/superaccount','/privacy-policy','/'].entries()){
  const start=100+i*500,previous=c.getView().location;
  f.advance(start);c.update(location(path));
  assert.equal(c.getView().location,previous);
  assert.equal(c.getView().phase,'exiting');
  f.advance(start+179);assert.equal(c.getView().location,previous);
  f.advance(start+180);assert.equal(c.getView().location.pathname,path);
  assert.equal(c.getView().phase,'entering');
  f.advance(start+211);assert.equal(c.getView().phase,'entering');
  f.advance(start+212);assert.equal(c.getView().phase,'ready');
 }
 assert.equal(f.tasks.size,0);
});
test('rapid navigation selects the latest destination and back to the visible page cancels a pending replacement',()=>{
 const f=fixture(),c=f.controller;
 c.update(location('/login'));f.advance(32);
 f.advance(100);c.update(location('/input'));
 const stale=[...f.tasks.values()][0].callback;
 f.advance(160);c.update(location('/search'));
 f.advance(279);assert.equal(c.getView().location.pathname,'/login');
 f.advance(280);assert.equal(c.getView().location.pathname,'/search');
 f.advance(312);
 f.advance(400);c.update(location('/account'));
 f.advance(420);c.update(location('/search'));
 assert.equal(c.getView().phase,'ready');
 stale();f.advance(1000);
 assert.equal(c.getView().location.pathname,'/search');assert.equal(f.tasks.size,0);
 assert.equal(f.views.some(view=>view.location.pathname==='/input'),false);
});
test('query/state navigation is retained; reduced motion immediately chooses the current target and cancels exit',()=>{
 const f=fixture(location('/search','first')),c=f.controller;
 c.update(location('/search','first'));f.advance(32);
 const next=location('/search','second',{search:'?rock=42',state:{message:'public'}});
 c.update(next);
 assert.equal(c.getView().phase,'exiting');
 c.update(next,true);
 assert.equal(c.getView().location,next);assert.equal(c.getView().phase,'ready');assert.equal(f.tasks.size,0);
 f.advance(1000);assert.equal(c.getView().location,next);
});
test('cleanup cancels frames/timers and strict-effect resumption preserves the remaining exit time',()=>{
 const f=fixture(),c=f.controller;
 c.update(location('/login'));assert.equal(f.tasks.size,1);
 c.dispose();assert.equal(f.tasks.size,0);
 c.update(location('/login'));f.advance(32);assert.equal(c.getView().phase,'ready');
 f.advance(100);c.update(location('/input'));
 const stale=[...f.tasks.values()][0].callback;
 f.advance(150);c.dispose();stale();assert.equal(c.getView().location.pathname,'/login');
 f.advance(170);c.update(location('/account'));
 f.advance(279);assert.equal(c.getView().location.pathname,'/login');
 f.advance(280);assert.equal(c.getView().location.pathname,'/account');
 c.dispose();assert.equal(f.tasks.size,0);
 f.advance(1000);assert.equal(c.getView().phase,'entering');
});
test('the route body renders the displayed location and disables outgoing/hidden content interaction',()=>{
 let phase='exiting';
 const shown=location('/account','shown');
 const jsx=(type,props)=>({type,props});
 const module=compile('src/components/mainWindow/mainBody.tsx',id=>{
  if(id==='react')return {useRef:()=>({current:null})};
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='react-redux')return {useSelector:selector=>selector({isDarkTheme:false})};
  if(id==='react-router-dom')return {Route:'Route',Routes:'Routes'};
  if(id==='../modal/modalContext')return {ModalProvider:'Provider'};
  if(id==='./routePresentationContext')return {useRoutePresentation:()=>({location:shown,phase})};
  if(id.endsWith('.scss'))return {};
  return id;
 });
 let tree=module.default();
 assert.equal(tree.props['data-route-phase'],'exiting');assert.equal(tree.props.inert,true);
 assert.equal(tree.props.children.props.children.props.location,shown);
 phase='entering';assert.equal(module.default().props['aria-hidden'],true);
 phase='ready';tree=module.default();assert.equal(tree.props.inert,false);assert.equal(tree.props['aria-hidden'],undefined);
});
test('an outgoing guard cannot replace the destination with its own redirect',()=>{
 let phase='exiting';
 const jsx=(type,props)=>({type,props});
 const module=compile('src/components/mainWindow/RouteRedirect.tsx',id=>{
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
  if(id==='react-router-dom')return {Navigate:'Navigate'};
  if(id==='./routePresentationContext')return {useRoutePresentation:()=>({phase})};
  throw Error(id);
 });
 const props={to:'/login',replace:true,state:{termsRequired:true}};
 assert.equal(module.default(props),null);
 phase='ready';const redirect=module.default(props);
 assert.equal(redirect.type,'Navigate');assert.equal(redirect.props.state,props.state);assert.equal(redirect.props.to,'/login');
 const fallback={type:'login-placeholder',props:{}};
 phase='exiting';
 const outgoing=module.default({...props,fallback});
 assert.equal(outgoing.props.children[0],fallback);
 assert.equal(outgoing.props.children[1],null);
 phase='ready';
 const waiting=module.default({...props,fallback});
 assert.equal(waiting.props.children[0],fallback);
 assert.equal(waiting.props.children[1].props.to,'/login');
});
test('a changed destination marks the outgoing context before effects, preventing a stale guard redirect in the navigation render',()=>{
 const current=location('/account','current'),target=location('/','target');
 let view={location:current,target,phase:'ready'};
 const context=compile('src/components/mainWindow/routePresentationContext.ts',id=>{
  if(id==='react')return {createContext:()=>({}),useContext:()=>view};
  if(id==='react-router-dom')return {useLocation:()=>target};
  throw Error(id);
 });
 const outgoing=context.useRoutePresentation();
 assert.equal(outgoing.location,current);
 assert.equal(outgoing.phase,'exiting');
 view={location:target,target,phase:'entering'};
 assert.equal(context.useRoutePresentation().phase,'entering');
 view={location:target,target,phase:'ready'};
 assert.equal(context.useRoutePresentation().phase,'ready');
});