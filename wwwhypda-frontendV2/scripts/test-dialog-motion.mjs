import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
const nodes=root=>root&&typeof root==='object'?[root,...[root.props?.children].flat(Infinity).flatMap(nodes)]:[];
function compile(file,require){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText,{exports,require});
 return exports;
}
function fixture(file){
 const slots=[],requests=[],destinations=[];
 let cursor=0,resumes=0;
 const react={
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=value];},
  useRef(initial){const i=cursor++;return slots[i]??=({current:initial});}
 };
 const component=compile(file,id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id.endsWith('/useDialogMotion'))return {useDialogMotion:()=>({enter:220,exit:180})};
  if(id==='react-redux')return {useSelector:selector=>selector({isDarkTheme:false})};
  if(id==='react-router-dom')return {useNavigate:()=>url=>destinations.push(url)};
  if(id==='@mui/material')return {Button:'Button',Dialog:'Dialog',DialogActions:'Actions',DialogContent:'Content',DialogTitle:'Title'};
  if(id==='axios')return {isAxiosError:failure=>Boolean(failure.response)};
  if(id.endsWith('/types'))return {getCsrfTokenFromCookie:()=>'synthetic-csrf'};
  if(id.endsWith('/api'))return {delete:(...args)=>new Promise((resolve,reject)=>requests.push({args,resolve,reject}))};
  if(id.endsWith('/accountSession'))return {pauseAccountSession(){},resumeAccountSession(){resumes++;},endAccountSession(){}};
  if(id.endsWith('.json'))return JSON.parse(readFileSync('src/common/error_messages.json','utf8'));
  if(id.endsWith('.scss'))return {};
  return id;
 });
 return {requests,destinations,get resumes(){return resumes;},render(props){cursor=0;return component.default(props);}};
}
test('shared modal fades both surface and backdrop and retains cleared content until exit without changing focus behavior',()=>{
 const h=fixture('src/components/modal/modalWindow.tsx'),body={type:'form',props:{children:'Synthetic form'}};
 const root={current:{synthetic:true}},onClose=()=>{};
 const props={open:true,children:body,onClose,modalRootRef:root,labelledBy:'title',describedBy:'description'};
 let tree=h.render(props);
 assert.equal(tree.props.closeAfterTransition,true);
 assert.deepEqual(JSON.parse(JSON.stringify(tree.props.slotProps.backdrop.transitionDuration)),{enter:220,exit:180});
 assert.equal(tree.props.container(),root.current);
 assert.equal(tree.props.onClose,onClose);
 for(const key of ['disableAutoFocus','disableEnforceFocus','disableRestoreFocus'])assert.equal(tree.props[key],undefined);
 const fade=tree.props.children;
 assert.equal(fade.type,'@mui/material/Fade');assert.equal(fade.props.in,true);
 const box=fade.props.children;
 assert.equal(box.props.role,'dialog');assert.equal(box.props['aria-labelledby'],'title');
 assert.equal(box.props.children,body);assert.equal(box.props.inert,false);
 tree=h.render({...props,open:false,children:null});
 const closing=tree.props.children;
 assert.equal(closing.props.in,false);
 assert.equal(closing.props.children.props.children,body);
 assert.equal(closing.props.children.props.inert,true);
 assert.equal(closing.props.children.props['aria-hidden'],true);
 closing.props.onExited();
 assert.equal(h.render({...props,open:false,children:null}).props.children.props.children.props.children,null);
 const next={type:'p',props:{children:'Next'}};
 assert.equal(h.render({...props,children:next}).props.children.props.children.props.children,next);
});
test('reduced motion disables the shared dialog duration including a live preference change',()=>{
 let reduced=false;
 const hook=compile('src/components/modal/useDialogMotion.ts',id=>{
  assert.equal(id,'react-responsive');
  return {useMediaQuery:({query})=>{assert.equal(query,'(prefers-reduced-motion: reduce)');return reduced;}};
 });
 assert.deepEqual(JSON.parse(JSON.stringify(hook.useDialogMotion())),{enter:220,exit:180});
 reduced=true;assert.equal(hook.useDialogMotion(),0);
 reduced=false;assert.equal(hook.useDialogMotion().enter,220);
});
test('delete dialog shares motion, remains open during a pending request and clears error only after exit',async()=>{
 const h=fixture('src/components/users/accounts/deleteAccount.tsx');
 const find=(tree,type)=>nodes(tree).find(node=>node.type===type);
 let tree=h.render();
 find(tree,'Button').props.onClick();
 tree=h.render();
 assert.equal(find(tree,'Dialog').props.open,true);
 assert.equal(find(tree,'Dialog').props.transitionDuration.enter,220);
 const input=find(tree,'input');
 input.props.onChange({target:{value:'synthetic-password'}});
 tree=h.render();
 const work=find(tree,'form').props.onSubmit({preventDefault(){}});
 tree=h.render();
 const dialog=find(tree,'Dialog');
 assert.equal(h.requests.length,1);
 assert.equal(h.requests[0].args[0],'/users/me');
 dialog.props.onClose();
 assert.equal(find(h.render(),'Dialog').props.open,true);
 h.requests[0].reject({response:{status:403}});
 await work;tree=h.render();
 assert.equal(h.resumes,1);
 assert.ok(nodes(tree).some(node=>node.props?.role==='alert'));
 find(tree,'Dialog').props.onClose();
 tree=h.render();
 const closed=find(tree,'Dialog');
 assert.equal(closed.props.open,false);
 assert.equal(find(tree,'form').props.inert,true);
 assert.equal(find(tree,'input').props.value,'');
 assert.ok(nodes(tree).some(node=>node.props?.role==='alert'));
 closed.props.slotProps.transition.onExited();
 assert.equal(nodes(h.render()).some(node=>node.props?.role==='alert'),false);
 assert.equal(h.destinations.length,0);
});