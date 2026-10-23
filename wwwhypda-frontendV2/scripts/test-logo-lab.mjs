import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const base=createRequire(import.meta.url), modules=new Map();
function load(path) {
    if (modules.has(path)) return modules.get(path);
    if (path.endsWith('?raw')) return {default:readFileSync(path.slice(0,-4),'utf8')};
    const exports={}; modules.set(path,exports);
    const resolve=name => {
        if (!name.startsWith('.')) return base(name);
        const absolute=new URL(name+(name.endsWith('?raw')?'':'.ts'),new URL(path,`file://${process.cwd()}/`));
        return load(absolute.pathname+absolute.search);
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
        {exports,require:resolve,performance,AbortController,setTimeout,Uint8Array,Uint32Array});
    return exports;
}
const rocks=load('src/components/logoLab/rockNames.ts');
const geometry=load('src/components/logoLab/geometry.ts');
const packing=load('src/components/logoLab/packing.ts');
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


test('all logo inks meet 4.5:1 on the corresponding site body background',()=>{
    const css=readFileSync('src/components/menu.module.scss','utf8');
    const token=name=>css.match(new RegExp(`--logo-lab-${name}:\\s*(#[a-f0-9]{6})`,'i'))[1];
    const luminance=hex=>{
        const rgb=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
        return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    for(const surface of ['light','dark'])for(let slot=1;slot<=10;slot++){
        const backgrounds=[...css.matchAll(/--body-color:\s*(#[a-f0-9]{6})/gi)].map(match=>match[1]);
        const a=luminance(backgrounds[surface==='light'?0:1]),b=luminance(token(`ink-${surface}-${slot}`));
        const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        assert.ok(ratio>=4.5,`${surface}/${slot}: ${ratio}`);
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
    const require=name=>name==='react' ? {useEffect:callback=>effects.push(callback())} : {gsap};
    vm.runInNewContext(ts.transpileModule(readFileSync('src/components/logoLab/useLogoAnimation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
        {exports,require,window:{matchMedia:()=>media}});
    return {run:exports.useLogoAnimation,effects,timelines,listeners,media};
}
test('four finite reveal modes preserve coordinates, replay is local and reduced motion finishes immediately and on change',()=>{
    const layout={width:100,height:100,words:[{bbox:{x:10,y:10}},{bbox:{x:40,y:30}},{bbox:{x:80,y:60}}]};
    for(const mode of ['soft','left','sequence','centre']) {
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
    reduced.run({current:{querySelectorAll:()=>elements}},layout,1,'soft');
    assert.equal(reduced.timelines[0].played,false);assert.ok(elements.every(element=>element.opacity===1));
    reduced.effects[0]();assert.equal(reduced.listeners.size,0);
    const initial=animationHarness(false);
    initial.run({current:{querySelectorAll:()=>elements}},layout,0,'sequence');assert.equal(initial.timelines[0].played,false);initial.effects[0]();
});

test('frozen catalogue snapshot contains complete unique names and stable source IDs in extractor order',()=>{
    const snapshot=JSON.parse(readFileSync('src/components/logoLab/rockNames.snapshot.json','utf8'));
    assert.ok(snapshot.length>0);
    assert.equal(new Set(snapshot.map(node=>node.rt_name)).size,snapshot.length);
    assert.equal(new Set(snapshot.map(node=>node.rt_id)).size,snapshot.length);
    assert.ok(snapshot.every(node=>Number.isSafeInteger(node.rt_id) && typeof node.rt_name==='string' && node.rt_name.length>0 && node.rt_name===node.rt_name.trim()));
    const extracted=rocks.extractRockNames(snapshot.map(node=>({...node,rt_id_parent:-2})));
    assert.equal(JSON.stringify(snapshot),JSON.stringify(extracted));
    assert.ok(snapshot.some(node=>node.rt_name.includes(',')));
});
