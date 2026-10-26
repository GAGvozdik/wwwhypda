import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';

function compile(file,require,globals={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText,{exports,require,...globals});
 return exports;
}
const presentation=()=>compile('src/components/users/authPresentation.ts',()=>{throw Error('No dependencies expected');});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function authFixture(hint,session={epoch:7,ended:false,terms:false}){
 const states=[],effects=[],requests=[],window=new EventTarget();
 let cursor=0,mounted=false;
 const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>states[i]=value];},
  useEffect(callback){if(!mounted)effects.push(callback);}
 };
 const component=compile('src/components/users/useAuthCheck.tsx',id=>{
  if(id==='react')return react;
  if(id==='axios')return {isCancel:()=>false};
  if(id.endsWith('/authPresentation'))return hint;
  if(id.endsWith('maintenanceState'))return {maintenanceActive:()=>false,maintenanceEvent:'maintenance'};
  if(id.endsWith('/accountSession'))return {
   sessionVersion:()=>session.epoch,sessionEvent:'session',sessionUnavailable:()=>session.ended,sessionEnded:()=>session.ended,
   termsEvent:'terms',termsAcceptanceRequired:()=>session.terms
  };
  if(id.endsWith('/api'))return {get:url=>new Promise((resolve,reject)=>requests.push({url,resolve,reject}))};
  throw Error(id);
 },{window});
 const cleanups=[];
 return {
  requests,session,window,
  render(){cursor=0;const result=component.default();if(!mounted){effects.forEach(effect=>cleanups.push(effect()));mounted=true;}return result;},
  unmount(){cleanups.forEach(cleanup=>cleanup?.());}
 };
}
test('unknown guests keep the login presentation; a previous successful check selects only a placeholder and still checks the server',async()=>{
 const hint=presentation(),guest=authFixture(hint);
 assert.equal(guest.render().showPageSkeleton,false);
 assert.equal(guest.requests.length,1);
 assert.equal(guest.requests[0].url,'/users/check');
 guest.requests[0].reject({response:{status:401}});await settle();
 assert.equal(guest.render().isAuth,false);
 assert.equal(hint.hasAuthenticatedPresentation(7),false);
 guest.unmount();
 hint.rememberAuthenticatedPresentation(7);
 const signed=authFixture(hint);
 const pending=signed.render();
 assert.equal(pending.showPageSkeleton,true);
 assert.equal(pending.isAuth,null);
 assert.equal(signed.requests.length,1);
 signed.requests[0].resolve({data:{is_superuser:true}});await settle();
 assert.equal(signed.render().isSuperuser,true);
 signed.unmount();
});
test('presentation evidence expires with session epoch/logout and is forgotten after a failed check',async()=>{
 const hint=presentation();
 hint.rememberAuthenticatedPresentation(7);
 assert.equal(hint.hasAuthenticatedPresentation(8),false);
 const loggedOut=authFixture(hint,{epoch:8,ended:true,terms:false});
 assert.equal(loggedOut.render().showPageSkeleton,false);
 assert.equal(loggedOut.render().isAuth,false);
 loggedOut.unmount();
 const failed=authFixture(hint);
 assert.equal(failed.render().showPageSkeleton,true);
 failed.requests[0].reject({response:{status:401}});await settle();
 assert.equal(failed.render().isAuth,false);
 assert.equal(hint.hasAuthenticatedPresentation(7),false);
 failed.unmount();
 hint.rememberAuthenticatedPresentation(7);
 const restricted=authFixture(hint,{epoch:7,ended:false,terms:true});
 assert.equal(restricted.render().showPageSkeleton,false);
 assert.equal(restricted.render().termsRequired,true);
 restricted.unmount();
});
test('successful checks remember only the session epoch; the next route still starts with unknown authorization',async()=>{
 const hint=presentation(),first=authFixture(hint);
 assert.equal(first.render().showPageSkeleton,false);
 first.requests[0].resolve({data:{is_superuser:false}});await settle();
 assert.equal(hint.hasAuthenticatedPresentation(7),true);
 first.unmount();
 const next=authFixture(hint);
 assert.equal(next.render().showPageSkeleton,true);
 assert.equal(next.render().isAuth,null);
 assert.equal(next.requests.length,1);
 next.unmount();
});
test('all ordinary routes keep a full first screen before the footer; legal pages keep their separate shell',()=>{
 let pathname='/';
 const jsx=(type,props)=>({type,props});
 const component=compile('src/components/mainWindow/mainWindow.tsx',id=>{
  if(id==='react')return {useLayoutEffect(){},useRef:()=>({current:null})};
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='react-router-dom')return {Link:'Link'};
  if(id.endsWith('/routePresentationContext'))return {useRoutePresentation:()=>({location:{pathname},phase:'ready'})};
  if(id==='react-redux')return {useSelector:selector=>selector({isDarkTheme:false})};
  if(id.endsWith('.scss'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});
  if(id.endsWith('.json'))return JSON.parse(readFileSync('src/common/error_messages.json','utf8'));
  if(id.endsWith('/recaptchaRoutes'))return {requiresRecaptcha:()=>false};
  if(id.endsWith('/theme'))return {applyTheme(){}};
  return 'Component';
 });
 for(const route of ['/','/search','/account','/superaccount','/input','/read','/edit','/login','/register']){
  pathname=route;
  const tree=component.default();
  assert.match(tree.props.className,/fullScreenContent/,route);
  assert.ok(tree.props.children.some(child=>child?.type==='footer'));
 }
 pathname='/privacy-policy';
 assert.doesNotMatch(component.default().props.className,/fullScreenContent/);
 const css=readFileSync('src/components/mainWindow/windowStyles.module.scss','utf8');
 assert.match(css,/\.fullScreenContent\s*>\s*\.bodyMenuItem\s*\{\s*min-height:\s*calc\(100dvh - var\(--shell-header-height, 3\.5rem\) \+ 1rem\)/);
});