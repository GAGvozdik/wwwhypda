import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const base=createRequire(import.meta.url), modules=new Map();
function load(path) {
    if (path.endsWith('.json')) return {default:JSON.parse(readFileSync(path,'utf8'))};
    if (modules.has(path)) return modules.get(path);
    if (path.endsWith('?raw')) return {default:readFileSync(path.slice(0,-4),'utf8')};
    const exports={}; modules.set(path,exports);
    const resolve=name => {
        if (!name.startsWith('.')) return base(name);
        const absolute=new URL(name+(name.endsWith('?raw')||name.endsWith('.json')?'':'.ts'),new URL(path,`file://${process.cwd()}/`));
        return load(absolute.pathname+absolute.search);
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
        {exports,require:resolve,performance,AbortController,setTimeout,Uint8Array,Uint32Array});
    return exports;
}
const rocks=load('src/components/homeLogo/rockNames.ts');
const geometry=load('src/components/homeLogo/geometry.ts');
const packing=load('src/components/homeLogo/packing.ts');
const row=(rt_id,rt_name,rt_id_parent=10)=>({rt_id,rt_name,rt_id_parent});
test('leaf extractor preserves complete spelling, trims edges, excludes categories, deduplicates by display name',()=>{
    const data=[row(10,' -- Generic earth material -- ',-1),row(11,'Group'),row(12,'Sandstone, chanel',11),row(13,' Clay, silty '),row(14,'Clay, silty'),row(15,' '),row(16,'Service',-1)];
    assert.equal(JSON.stringify(rocks.extractRockNames(data)),JSON.stringify([{rt_id:13,rt_name:'Clay, silty'},{rt_id:12,rt_name:'Sandstone, chanel'}]));
    assert.equal(JSON.stringify(rocks.extractRockNames(data)),JSON.stringify(rocks.extractRockNames(data.reverse())));
    assert.equal(rocks.extractRockNames([]).length,0);
});
test('integral checks every cell, including concave gaps and a hole invisible at all four corners',()=>{
    const cells=new Uint8Array(100).fill(1); cells[55]=0;
    const mask=geometry.createIntegral(10,10,cells);
    assert.equal(mask.contains({x:2,y:2,width:6,height:6}),false);
    assert.equal(mask.contains({x:0,y:0,width:4,height:4}),true);
    assert.equal(mask.contains({x:-.1,y:0,width:1,height:1}),false);
    assert.equal(mask.contains({x:9.5,y:0,width:1,height:1}),false);
    assert.throws(()=>geometry.assetPath('<svg><path transform="translate(1)" d="M0 0"/></svg>'));
});
test('spatial hash catches cross-cell collisions and permits a separated box',()=>{
    const index=new packing.BoxIndex(); index.add({x:63,y:63,width:100,height:20});
    assert.equal(index.collides({x:150,y:70,width:20,height:20}),true);
    assert.equal(index.collides({x:170,y:70,width:20,height:20}),false);
});
test('packing is deterministic, uses whole names and rejects every padded out-of-bounds box',async()=>{
    const names=Array.from({length:40},(_,i)=>row(i,`Complete, rock name ${i}`));
    const cells=new Uint8Array(320*200).fill(1);
    for(let y=60;y<140;y++) for(let x=100;x<180;x++) cells[y*320+x]=0;
    const mask=geometry.createIntegral(320,200,cells);
    const config={id:'A3',group:'A',vertical:.5,gap:2,sizes:[20,12],structure:'blocks'};
    const measure=(name,size)=>({left:1,right:name.length*size*.32,ascent:size*.7,descent:size*.2});
    const first=await packing.pack(config,names,measure,new AbortController().signal,mask);
    const second=await packing.pack(config,[...names].reverse(),measure,new AbortController().signal,mask);
    assert.ok(first.words.length>10); assert.equal(JSON.stringify(first.words),JSON.stringify(second.words));
    const index=new packing.BoxIndex();
    for(const word of first.words){ const box=packing.padded(word.bbox,2); assert.ok(mask.contains(box)); assert.equal(index.collides(box),false); index.add(box); assert.ok(names.some(n=>n.rt_name===word.rt_name)); }
    const aborted=new AbortController(); aborted.abort();
    await assert.rejects(packing.pack(config,names,measure,aborted.signal,mask));
});


test('logo inks keep the owner-selected brighter light palette and contrasting dark palette',()=>{
    const css=readFileSync('src/components/menu.module.scss','utf8');
    const token=name=>css.match(new RegExp(`--home-logo-${name}:\\s*(#[a-f0-9]{6})`,'i'))[1];
    const luminance=hex=>{
        const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
        return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    for(const surface of ['light','dark'])for(let slot=1;slot<=10;slot++){
        const backgrounds=[...css.matchAll(/--body-color:\s*(#[a-f0-9]{6})/gi)].map(match=>match[1]);
        const a=luminance(backgrounds[surface==='light'?0:1]),b=luminance(token(`ink-${surface}-${slot}`));
        const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
		assert.ok(surface==='light' ? ratio>=3 && ratio<=3.3 : ratio>=4.5,`${surface}/${slot}: ${ratio}`);
    }
});

function animationHarness(reduced) {
    const effects=[],timelines=[],listeners=new Set();
    const media={matches:reduced,addEventListener:(_,callback)=>listeners.add(callback),removeEventListener:(_,callback)=>listeners.delete(callback)};
    const gsap={
        set:(elements,values)=>elements.forEach(element=>Object.assign(element,values.attr)),
        timeline:()=>{
            const timeline={tweens:[],played:false,killed:false,paused:false,
                pause(){this.paused=true;return this;},kill(){this.killed=true;},
                to(element,values,delay){this.tweens.push({element,values,delay});return this;},
                play(){this.played=true;return this;},complete(){this.tweens.forEach(({element,values})=>Object.assign(element,values.attr));}};
            timelines.push(timeline);return timeline;
        }
    };
    const exports={};
    const require=name=>name==='react' ? {useLayoutEffect:callback=>effects.push(callback())} : {gsap};
    vm.runInNewContext(ts.transpileModule(readFileSync('src/components/homeLogo/useLogoAnimation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
        {exports,require,window:{matchMedia:()=>media}});
    return {run:exports.useLogoAnimation,effects,timelines,listeners,media};
}
test('three finite reveal modes preserve coordinates, replay is local and reduced motion finishes immediately and on change',()=>{
    const layout={width:100,height:100,words:[{bbox:{x:10,y:10}},{bbox:{x:40,y:30}},{bbox:{x:80,y:60}}]};
    for(const mode of ['left','sequence','centre']) {
        const harness=animationHarness(false),elements=[{opacity:1},{opacity:1},{opacity:1}];
        const ref={current:{querySelectorAll:selector=>{assert.equal(selector,'[data-word-reveal]');return elements;}}};
        harness.run(ref,layout,1,mode);
        const timeline=harness.timelines[0];
        assert.ok(timeline.played);assert.equal(timeline.tweens.length,3);
        assert.ok(timeline.tweens.every(tween=>tween.delay>=0 && tween.delay+tween.values.duration<=3));
        assert.ok(timeline.tweens.every(tween=>Object.keys(tween.values).sort().join(',')==='attr,duration,ease'));
        timeline.complete(); assert.ok(elements.every(element=>element.opacity===1));
        harness.effects[0](); assert.ok(timeline.killed);assert.equal(harness.listeners.size,0);
        harness.run(ref,layout,2,mode);assert.ok(harness.timelines[1].played);
        harness.media.matches=true;harness.listeners.forEach(callback=>callback());
        assert.ok(harness.timelines[1].paused);assert.ok(elements.every(element=>element.opacity===1));
        harness.effects[1]();
    }
    const reduced=animationHarness(true),elements=[{opacity:0},{opacity:0},{opacity:0}];
    reduced.run({current:{querySelectorAll:()=>elements}},layout,1,'left');
    assert.equal(reduced.timelines[0].played,false);assert.ok(elements.every(element=>element.opacity===1));
    reduced.effects[0]();assert.equal(reduced.listeners.size,0);
    const initial=animationHarness(false);
    initial.run({current:{querySelectorAll:()=>elements}},layout,0,'sequence');assert.equal(initial.timelines[0].played,false);initial.effects[0]();
});

test('frozen catalogue snapshot contains complete unique names and stable source IDs in extractor order',()=>{
    const snapshot=JSON.parse(readFileSync('src/components/homeLogo/rockNames.snapshot.json','utf8'));
    assert.ok(snapshot.length>0);
    assert.equal(new Set(snapshot.map(node=>node.rt_name)).size,snapshot.length);
    assert.equal(new Set(snapshot.map(node=>node.rt_id)).size,snapshot.length);
    assert.ok(snapshot.every(node=>Number.isSafeInteger(node.rt_id) && typeof node.rt_name==='string' && node.rt_name.length>0 && node.rt_name===node.rt_name.trim()));
    const extracted=rocks.extractRockNames(snapshot.map(node=>({...node,rt_id_parent:-2})));
    assert.equal(JSON.stringify(snapshot),JSON.stringify(extracted));
    assert.ok(snapshot.some(node=>node.rt_name.includes(',')));
});

test('frozen vector words match the exact catalogue and font, and measure by outline bounds at any size',()=>{
    const snapshot=JSON.parse(readFileSync('src/components/homeLogo/wordOutlines.snapshot.json','utf8'));
    const names=JSON.parse(readFileSync('src/components/homeLogo/rockNames.snapshot.json','utf8'));
    assert.equal(snapshot.font_sha256,createHash('sha256').update(readFileSync('src/assets/fonts/Afacad_Flux/AfacadFlux-VariableFont_slnt,wght.ttf')).digest('hex'));
    assert.equal(Object.keys(snapshot.words).length,names.length);
    const outlines=load('src/components/homeLogo/wordOutlines.ts');
    for(const name of names){
        const shape=snapshot.words[String(name.rt_id)];
        assert.equal(shape.name,name.rt_name);
        assert.ok(shape.path.length>0);
        const [left,top,right,bottom]=shape.bounds;
        assert.ok(right>left && bottom>top);
        for(const size of [12,48,80,112,144]){
            const measured=outlines.outlineMetrics(name.rt_name,size);
            assert.ok(Math.abs(measured.left+measured.right-(right-left)*size/snapshot.unitsPerEm)<1e-9);
            assert.ok(Math.abs(measured.ascent+measured.descent-(bottom-top)*size/snapshot.unitsPerEm)<1e-9);
        }
    }
});
test('C hole is enlarged and its filled-area centroid is aligned with the disc centre',()=>{
    const spec=geometry.geometrySpec('C');
    assert.equal(spec.scale,9.6);
    assert.ok(Math.abs(spec.tx+53.480778027633036*spec.scale-700)<.001);
    assert.ok(Math.abs(spec.ty+38.21029965343391*spec.scale-700)<.001);
});
test('dense readable rows cover the usable silhouette with full names, deterministic placement and intact holes',async()=>{
    const width=240,height=180,cells=new Uint8Array(width*height).fill(1);
    for(let y=55;y<125;y++)for(let x=80;x<160;x++)cells[y*width+x]=0;
    const mask=geometry.createIntegral(width,height,cells);
    const config={id:'A10',group:'A',gap:1,vertical:0,sizes:[16,14.4],structure:'denseRows',repeatLimit:30};
    const names=['Till','Tuff','Loam','Peat','Loess'].map((name,i)=>row(i,name));
    const measure=(name,size)=>({left:0,right:name.length*size*.45,ascent:size*.7,descent:size*.15});
    const first=await packing.pack(config,names,measure,new AbortController().signal,mask);
    const second=await packing.pack(config,[...names].reverse(),measure,new AbortController().signal,mask);
    assert.equal(JSON.stringify(first.words),JSON.stringify(second.words));
    assert.ok(first.words.length>30);
    const index=new packing.BoxIndex();let area=0;
    for(const word of first.words){
        const box=packing.padded(word.bbox,config.gap);
        assert.ok(mask.contains(box));assert.equal(index.collides(box),false);index.add(box);
        assert.ok(names.some(name=>name.rt_name===word.rt_name));
        assert.ok(word.fontSize>=14.4);area+=word.bbox.width*word.bbox.height;
    }
    assert.ok(area/(width*height-80*70)>.4);
    const aborted=new AbortController();aborted.abort();
    await assert.rejects(packing.pack(config,names,measure,aborted.signal,mask));
});
test('Home selects exactly C12 on mobile and B12 on desktop without changing their accepted sizes',()=>{
    const configs=load('src/components/homeLogo/compositions.ts');
    assert.equal(configs.HOME_LOGO_MOBILE_QUERY,'(max-width: 48rem)');
    assert.equal(configs.compositions.length,2);
    for(const [mobile,id,sizes] of [[true,'C12',[40,36]],[false,'B12',[48,43.2]]]){
        const config=configs.homeLogoComposition(mobile);
        assert.equal(config.id,id);
        assert.equal(JSON.stringify(config.sizes),JSON.stringify(sizes));
        assert.equal(config.structure,'denseRows');
        assert.equal(config.gap,1);
        assert.equal(config.repeatLimit,24);
    }
});

function homeHarness() {
    const states=[],requests=[];
    let cursor=0,previousDeps,cleanup,nextEffect,mobile=false,dark=false;
    const jsx=(type,props)=>({type,props});
    const configs=load('src/components/homeLogo/compositions.ts');
    const Renderer=()=>null;
    const hooks={
        useState(initial){
            const slot=cursor++;
            if(!(slot in states))states[slot]=initial;
            return [states[slot],value=>states[slot]=typeof value==='function'?value(states[slot]):value];
        },
        useEffect(callback,deps){
            if(!previousDeps || deps.some((value,index)=>value!==previousDeps[index])){
                nextEffect=callback;previousDeps=deps;
            }
        }
    };
    const require=name=>{
        if(name==='react')return hooks;
        if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
        if(name==='react-responsive')return {useMediaQuery:()=>mobile};
        if(name==='react-redux')return {useSelector:selector=>selector({isDarkTheme:dark})};
        if(name==='./compositions')return configs;
        if(name==='./rockNames.snapshot.json')return {default:[{rt_id:1,rt_name:'Clay'}]};
        if(name==='./layoutCache')return {getLayout:(config,names,signal)=>new Promise((resolve,reject)=>requests.push({config,names,signal,resolve,reject}))};
        if(name==='./WordLogo')return {default:Renderer};
        if(name.endsWith('.scss'))return {default:{frame:'frame',dark:'dark',submitButton:'button'}};
        if(name.endsWith('error_messages.json'))return {default:{home_logo_label:'WWHYPDA',home_logo_failed:'Failed',maintenance_retry:'Retry'}};
        if(name.endsWith('singleSkeleton'))return {default:'Skeleton'};
        throw Error('Unexpected import: '+name);
    };
    const exports={};
    vm.runInNewContext(ts.transpileModule(readFileSync('src/components/homeLogo/HomeLogo.tsx','utf8'),{
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
    }).outputText,{exports,require,AbortController});
    return {
        requests,Renderer,
        viewport(value){mobile=value;},
        theme(value){dark=value;},
        render(){
            cursor=0;nextEffect=undefined;
            const tree=exports.default();
            if(nextEffect){cleanup?.();cleanup=nextEffect();}
            return tree;
        },
        unmount(){cleanup?.();}
    };
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Home computes only the active variant, ignores stale viewport responses and aborts on unmount',async()=>{
    const h=homeHarness();
    let tree=h.render();
    assert.equal(tree.props['data-home-logo'],'B12');
    await settle();
    assert.equal(h.requests.length,1);
    assert.equal(h.requests[0].config.id,'B12');
    h.viewport(true);tree=h.render();
    assert.equal(h.requests[0].signal.aborted,true);
    assert.equal(tree.props['data-home-logo'],'C12');
    assert.equal(tree.props['aria-busy'],true);
    await settle();
    assert.equal(h.requests.length,2);
    const [old,current]=h.requests;
    old.resolve({id:'B12'});await settle();
    assert.equal(h.render().props['aria-busy'],true);
    current.resolve({id:'C12'});await settle();
    tree=h.render();
    const logo=tree.props.children.props.children;
    assert.equal(logo.type,h.Renderer);
    assert.equal(logo.props.layout.id,'C12');
    assert.equal(logo.props.replay,1);
    assert.equal(logo.props.reveal,'sequence');
    h.theme(true);tree=h.render();
    assert.equal(tree.props.className,'frame dark');
    assert.equal(h.requests.length,2);
    h.viewport(false);h.render();await settle();
    h.requests[2].resolve({id:'B12'});await settle();
    assert.equal(h.render().props.children.props.children.props.reveal,'centre');
    h.unmount();assert.equal(h.requests[2].signal.aborted,true);
});

test('Home exposes a safe retry and keeps a failed or cancelled preparation from rendering another variant',async()=>{
    const h=homeHarness();
    h.render();await settle();
    h.requests[0].reject(Error('private diagnostics'));await settle();
    let tree=h.render();
    assert.equal(tree.props['aria-busy'],false);
    const fallback=tree.props.children.props.children;
    assert.equal(fallback.props.role,'alert');
    assert.equal(fallback.props.children[0].props.children,'Failed');
    fallback.props.children[1].props.onClick();
    tree=h.render();
    assert.equal(tree.props['aria-busy'],true);
    await settle();
    assert.equal(h.requests.length,2);
    h.unmount();
    h.requests[1].resolve({id:'B12'});await settle();
    assert.equal(h.render().props.children.props.children,null);
});

test('Home route uses the new responsive logo and the laboratory entry points are removed',()=>{
    const home=readFileSync('src/components/pages/home.tsx','utf8');
    const routes=readFileSync('src/components/mainWindow/mainBody.tsx','utf8');
    const menu=readFileSync('src/components/menu/mainMenu.tsx','utf8');
    assert.match(home,/<HomeLogo\s*\/>/);
    assert.doesNotMatch(home,/AnimatedLogo/);
    for(const source of [routes,menu])assert.doesNotMatch(source,/logo-lab|LogoLab|LOGO_LAB_ENABLED/);
    assert.match(routes,/<Route path="\*" element={<NotFound \/>} \/>/);
    const css=readFileSync('src/components/homeLogo/homeLogo.module.scss','utf8');
    assert.match(css,/@media\(max-width: 48rem\)/);
});
