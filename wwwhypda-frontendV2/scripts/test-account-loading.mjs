import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
const nodes=root=>root&&typeof root==='object'?[root,...[root.props?.children].flat(Infinity).flatMap(nodes)]:[];
function fixture(file,resolve=()=>undefined){
    const slots=[],effects=[],frames=new Map(),calls=[];
    let cursor=0,frameId=0;
    const hooks={
        useState(initial){
            const index=cursor++;
            if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;
            return [slots[index],value=>slots[index]=typeof value==='function'?value(slots[index]):value];
        },
        useRef(initial){const index=cursor++;return slots[index]??=( {current:initial} );},
        useMemo(callback,deps){
            const index=cursor++,old=slots[index];
            if(!old||deps.some((value,i)=>value!==old.deps[i]))slots[index]={deps,value:callback()};
            return slots[index].value;
        },
        useEffect(callback,deps){
            const index=cursor++,old=slots[index];
            if(!old||deps.some((value,i)=>value!==old.deps[i])){
                effects.push(()=>{old?.cleanup?.();slots[index]={deps,cleanup:callback()};});
            }
        },
        cloneElement:(node,props)=>({...node,props:{...node.props,...props}})
    };
    hooks.useLayoutEffect=hooks.useEffect;
    const exports={};
    const require=name=>{
        if(name==='react')return hooks;
        if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
        if(name.endsWith('.json'))return JSON.parse(readFileSync('src/common/error_messages.json','utf8'));
        if(name.endsWith('.scss'))return new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});
        if(name.endsWith('/useLoadingPresentation'))return {useLoadingPresentation:loading=>loading?'loading':'ready'};
        if(name.endsWith('/loadingPresentation'))return {LOADING_EXIT_MS:220};
        if(name==='react-redux')return {useSelector:selector=>selector({isDarkTheme:true})};
        if(name==='react-router-dom')return {useNavigate:()=>()=>{}};
        if(name.endsWith('/useRemColumns'))return columns=>columns;
        if(name.endsWith('/steps'))return {useStepsTheme:()=>({})};
        if(name==='ag-grid-react')return {AgGridReact:'Grid'};
        if(name.endsWith('/api'))return {get:url=>new Promise((resolve,reject)=>calls.push({url,resolve,reject}))};
        return resolve(name)??name;
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{
        module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true
    }}).outputText,{
        exports,require,
        requestAnimationFrame:callback=>{const id=++frameId;frames.set(id,callback);return id;},
        cancelAnimationFrame:id=>frames.delete(id),
    });
    return {
        calls,frames,
        render(props){cursor=0;const tree=exports.default(props);effects.splice(0).forEach(run=>run());return tree;},
        frame(){const current=[...frames];frames.clear();current.forEach(([,callback])=>callback());},
        unmount(){slots.forEach(slot=>slot?.cleanup?.());}
    };
}
const table=()=>fixture('src/components/users/accounts/AccountTable.tsx');
const grid=(rows,extra={})=>({type:'Grid',props:{rowData:rows,...extra}});
const find=(tree,type)=>nodes(tree).find(node=>node.type===type);
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('table starts covered, mounts populated data invisibly, and waits for first data render plus two frames',()=>{
    const h=table(),rows=[{id:1}],child=grid(rows);
    let tree=h.render({loading:true,children:child});
    assert.equal(tree.props['aria-busy'],true);
    assert.equal(find(tree,'Grid'),undefined);
    tree=h.render({loading:false,children:child});
    const mounted=find(tree,'Grid');
    assert.equal(mounted.props.rowData,rows);
    assert.equal(mounted.props.alwaysShowVerticalScroll,true);
    assert.equal(tree.props.children[0].props.style.visibility,'hidden');
    assert.equal(tree.props.children[0].props.inert,true);
    mounted.props.onGridReady({});
    assert.equal(h.frames.size,0);
    mounted.props.onFirstDataRendered({});
    h.frame();
    assert.equal(h.render({loading:false,children:child}).props['aria-busy'],true);
    h.frame();tree=h.render({loading:false,children:child});
    assert.equal(tree.props['aria-busy'],false);
    assert.equal(tree.props.children[0].props.style.visibility,undefined);
    assert.equal(tree.props.children[0].props.inert,false);
    assert.equal(find(tree,'Grid').props.rowData,rows);
});

test('a genuine empty response finishes through grid-ready and preserves caller callbacks',()=>{
    const h=table();let ready=0;
    const child=grid([],{onGridReady:()=>ready++});
    h.render({loading:true,children:child});
    const tree=h.render({loading:false,children:child});
    find(tree,'Grid').props.onGridReady({});
    assert.equal(ready,1);
    h.frame();h.frame();
    assert.equal(h.render({loading:false,children:child}).props['aria-busy'],false);
});

test('reload/unmount cancels pending paint callbacks, and failure can recover without an empty-grid flash',()=>{
    const h=table(),old=grid([{id:1}]),fresh=grid([{id:2}]);
    h.render({loading:true,children:old});
    const tree=h.render({loading:false,children:old});
    find(tree,'Grid').props.onFirstDataRendered({});
    const stale=[...h.frames.values()][0];
    h.render({loading:true,children:fresh});
    assert.equal(h.frames.size,0);
    stale();h.frame();
    assert.equal(h.render({loading:true,children:fresh}).props['aria-busy'],true);
    const error=h.render({loading:false,error:'Safe error',children:fresh});
    assert.equal(nodes(error).some(node=>node.props?.role==='alert'),true);
    assert.equal(find(error,'Grid'),undefined);
    h.render({loading:true,children:fresh});
    const recovered=h.render({loading:false,children:fresh});
    find(recovered,'Grid').props.onFirstDataRendered({});
    h.unmount();assert.equal(h.frames.size,0);
});

test('admin users grid waits for its own response when the profile finishes first',async()=>{
    const h=fixture('src/components/users/accounts/superuser.tsx',name=>{
        if(name==='./AccountTable')return 'AccountTable';
        if(name==='axios')return {isCancel:()=>false};
        if(name==='@mui/material')return {IconButton:'Button',Tooltip:'Tooltip'};
        if(name==='@mui/icons-material')return {PersonOff:'Icon',Security:'Icon',DoDisturb:'Icon'};
    });
    let tree=h.render();
    assert.equal(find(tree,'AccountTable').props.loading,true);
    assert.deepEqual(h.calls.map(call=>call.url),['/users/','/admin/get_all_users']);
    h.calls[0].resolve({data:{data:{id:1,name:'Synthetic'}}});await flush();
    tree=h.render();assert.equal(find(tree,'AccountTable').props.loading,true);
    h.calls[1].resolve({data:{data:[{id:2,name:'Synthetic second'}]}});await flush();
    tree=h.render();
    assert.equal(find(tree,'AccountTable').props.loading,false);
    assert.equal(find(tree,'Grid').props.rowData.length,1);
});

test('both submissions tables start loading before effects make their first request',()=>{
    for(const name of ['userSuggestions','inputSuggestions']){
        const h=fixture('src/components/users/accounts/'+name+'.tsx',id=>{
            if(id==='./AccountTable')return 'AccountTable';
            if(id.endsWith('/modalContext'))return {useModal:()=>({openModal(){},closeModal(){}})};
            if(id==='@mui/material')return {IconButton:'Button',Tooltip:'Tooltip'};
        });
        const tree=h.render();
        assert.equal(find(tree,'AccountTable').props.loading,true,name);
        assert.equal(h.calls.length,1,name);
    }
});

test('public protected-page placeholders describe account, admin and dataset layouts without mounting auth forms',()=>{
    const h=fixture('src/components/users/routes/ProtectedPageSkeleton.tsx');
    for(const kind of ['account','superaccount','dataset']){
        const tree=h.render({kind});
        assert.equal(tree.props['data-page-skeleton'],kind);
        assert.equal(tree.props.role,'status');
        assert.equal(nodes(tree).some(node=>node.type==='form'||node.type==='input'),false);
        assert.equal(h.calls.length,0);
    }
});
test('page placeholders reuse the real account blocks and dataset step/table layout rather than a generic field grid',()=>{
 const h=fixture('src/components/users/routes/ProtectedPageSkeleton.tsx');
 const account=h.render({kind:'account'}),admin=h.render({kind:'superaccount'}),dataset=h.render({kind:'dataset'});
 const hasClass=(tree,name)=>nodes(tree).some(node=>node.props?.className?.split(' ').includes(name));
 assert.ok(hasClass(account,'topActions'));assert.ok(hasClass(account,'accountDetails'));assert.ok(hasClass(account,'accountPrivacy'));assert.ok(hasClass(account,'bottomActions'));
 assert.equal(nodes(admin).filter(node=>node.type?.name==='TablePlaceholder').length,2);
 assert.ok(hasClass(dataset,'stepContent'));assert.ok(hasClass(dataset,'measurementGrid'));assert.ok(hasClass(dataset,'tableArea'));assert.ok(hasClass(dataset,'stepNavigation'));
 assert.equal(hasClass(dataset,'fields'),false);
 const pageTitle=nodes(dataset).find(node=>node.props?.className==='datasetTitle');
 assert.equal(typeof pageTitle.props.children,'string');
 const stepLabels=nodes(dataset).filter(node=>node.type==='@mui/material/StepLabel');
 assert.equal(stepLabels.length,5);
 assert.ok(stepLabels.every(node=>typeof node.props.children.props.children==='string' && node.props.StepIconComponent==='../../inputData/StepIcon'));
 const tableTitle=nodes(dataset).find(node=>node.props?.className==='stepTitle');
 assert.equal(typeof tableTitle.props.children.props.children,'string');
});
test('account headings, profile labels and privacy descriptions remain ordinary text during loading',()=>{
 const h=fixture('src/components/users/routes/ProtectedPageSkeleton.tsx');
 for(const kind of ['account','superaccount']){
  const tree=h.render({kind});
  const heading=nodes(tree).find(node=>node.props?.className==='formTitle');
  assert.equal(typeof heading.props.children,'string');
  const labels=nodes(tree).filter(node=>node.props?.className==='profileLine');
  assert.equal(labels.length,2);
  assert.ok(labels.every(node=>typeof node.props.children[0]==='string'));
  assert.ok(labels.every(node=>!nodes(node).some(child=>String(child.type).includes('Skeleton'))));
  assert.equal(nodes(tree).some(node=>node.type?.name==='TextPlaceholder'),false);
  if(kind==='account'){
   const privacy=nodes(tree).find(node=>node.type==='section');
   assert.ok(nodes(privacy).filter(node=>node.type==='p').every(node=>typeof node.props.children==='string'));
   assert.equal(nodes(privacy).find(node=>node.type==='a').props.children,'support@wwhypdatestdeployversion.it');
  }
 }
});