import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {test} from 'node:test';import ts from 'typescript';
test('manual 503 never redirects an authenticated guard; off retries the ordinary check',async()=>{
 let state,active=false,fail=false,calls=0;const effects=[],window=new EventTarget();
 let slot=0;const react={useState:initial=>{if(slot++===0){state??=initial;return [state,value=>{state=value;}];}return [typeof initial==="function"?initial():initial,()=>{}];},useEffect:fn=>effects.push(fn)};
 const exports={};const source=ts.transpileModule(readFileSync('src/components/users/useAuthCheck.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{exports,window,require:id=>{
  if(id==='react')return react;
  if(id==='axios')return {isCancel:()=>false};
  if(id.endsWith('maintenanceState'))return {maintenanceActive:()=>active,maintenanceEvent:'maintenance'};
  if(id.endsWith('authPresentation'))return {hasAuthenticatedPresentation:()=>true,rememberAuthenticatedPresentation(){},forgetAuthenticatedPresentation(){}};
  if(id.endsWith('accountSession'))return {sessionVersion:()=>0,sessionEvent:'session',sessionUnavailable:()=>false,sessionEnded:()=>false,termsEvent:'terms',termsAcceptanceRequired:()=>false};
  if(id.endsWith('/api'))return {get:async()=>{calls++;if(fail)throw {response:{status:503,data:{code:'site_maintenance'}}};return {data:{is_superuser:false}};}};
  throw new Error(id);
 }});
 exports.default();const cleanup=effects[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.isAuth,true);assert.equal(calls,1);
 active=true;fail=true;window.dispatchEvent(new Event('session'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.isAuth,true);assert.equal(state.termsRequired,false);
 fail=false;active=false;window.dispatchEvent(new Event('maintenance'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.isAuth,true);assert.equal(calls,3);cleanup();
});
