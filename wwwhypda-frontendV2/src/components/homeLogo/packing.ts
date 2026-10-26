import type { Box, Composition, Layout, RockName, WordPlacement } from './types';
import { getOccupancy } from './geometry';
import { outlineMetrics } from './wordOutlines';
import { wordmarkRegion, wordmarkRegions } from './regions';
export const PACKING_VERSION = 'afacad-600-dense-rows-v9';
export const yieldToControls = () => new Promise<void>(resolve => setTimeout(resolve, 0));
export function intersects(a: Box, b: Box) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
export function padded(box: Box, gap: number): Box {
    return { x: box.x-gap, y: box.y-gap, width: box.width+2*gap, height: box.height+2*gap };
}
export interface Metrics { left: number; right: number; ascent: number; descent: number }
export type Measure = (name: string, size: number) => Metrics;
export const vectorMeasure: Measure = outlineMetrics;
// Spatial hash indexes padded boxes, independent of glyph rendering and palette.
export class BoxIndex {
    private cells = new Map<string, Box[]>();
    private keys(box: Box) {
        const result: string[] = [];
        for (let y = Math.floor(box.y/64); y <= Math.floor((box.y+box.height)/64); y++)
            for (let x = Math.floor(box.x/64); x <= Math.floor((box.x+box.width)/64); x++) result.push(`${x}:${y}`);
        return result;
    }
    collides(box: Box) { return this.keys(box).some(key => this.cells.get(key)?.some(other => intersects(box, other))); }
    add(box: Box) { for (const key of this.keys(box)) this.cells.set(key, [...(this.cells.get(key) || []), box]); }
}
export async function pack(config: Composition, names: RockName[], measure: Measure, signal: AbortSignal,
    mask = getOccupancy(config.group)): Promise<Layout> {
    if(config.structure==='denseRows') return packDenseRows(config,names,measure,signal,mask);
    const started = performance.now();
    const words: WordPlacement[] = [], index = new BoxIndex();
    const uses = new Map<number, number>();
    const anchors = new Map<string,number>();
    const directions = new Map<number, { total:number; vertical:number }>();
    let attempts = 0, visited = 0;
    const limit = config.group === 'B' ? 360000 : 150000;
    const cap = config.group === 'B' ? 1800 : 700;
    const seed = config.id.charCodeAt(0) * 31 + Number(config.id.slice(1)) * 7919;
    const ordered = [...names].sort((a,b) => a.rt_name < b.rt_name ? -1 : a.rt_name > b.rt_name ? 1 : a.rt_id-b.rt_id);
    for (let sizeIndex = 0; sizeIndex < config.sizes.length; sizeIndex++) {
        const size = config.sizes[sizeIndex];
        attempts = 0;
        const step = Math.max(7, config.gridStep ?? Math.floor(size * .65 + config.gap));
        const positions: {x:number;y:number;rank:number}[] = [];
        for (let y=step; y<mask.height-step; y+=step) for (let x=step; x<mask.width-step; x+=step) {
            let rank = y*mask.width+x;
            if (config.structure === 'columns') rank = x*mask.height+y;
            if (config.structure === 'blocks') rank = (Math.floor(x/180)+Math.floor(y/180))*mask.width*mask.height + y*mask.width+x;
            if (config.structure === 'anchors' && sizeIndex < 2) {
                const band = config.group === 'B' ? (wordmarkRegions[wordmarkRegion(x)][0]+wordmarkRegions[wordmarkRegion(x)][1])/2 : (x<450 ? 150 : x>950 ? 1200 : 675);
                rank = Math.abs(x-band) + Math.abs(y-mask.height*.26)*2;
            }
            if (config.structure === 'sectors' && sizeIndex < 2) rank = Math.abs(Math.hypot(x-700,y-700)-510);
            if (config.structure === 'cells') rank = config.id==='C6' && sizeIndex===0 ? Math.abs(Math.hypot(x-700,y-700)-560) :
                ((Math.floor(x/step)*73856093 ^ Math.floor(y/step)*19349663 ^ seed) >>> 0);
            positions.push({x,y,rank});
        }
        positions.sort((a,b) => a.rank-b.rank || a.y-b.y || a.x-b.x);
        // Interleave spatial regions so a bounded pass cannot spend its budget only at the top.
        const buckets=Array.from({length:config.group==='B' ? 7 : 4},()=>[] as typeof positions);
        for(const point of positions) {
            const region=config.group==='B' ? wordmarkRegion(point.x) :
                (point.x>=mask.width/2 ? 1 : 0)+(point.y>=mask.height/2 ? 2 : 0);
            buckets[region].push(point);
        }
        const balanced: typeof positions=[];
        const longest=Math.max(...buckets.map(bucket=>bucket.length));
        for(let i=0;i<longest;i++) for(const bucket of buckets) if(bucket[i]) balanced.push(bucket[i]);
        for (const point of balanced) {
            if (++visited % 350 === 0) { await yieldToControls(); signal.throwIfAborted(); }
            if (attempts >= limit || words.length >= cap) break;
            if (!mask.contains({x:point.x,y:point.y,width:1,height:1}) || index.collides({x:point.x,y:point.y,width:1,height:1})) continue;
            const anchorZone = config.group==='B' ? wordmarkRegion(point.x) : config.group==='A' ? (point.x<450 ? 0 : point.x>950 ? 2 : 1) :
                Math.floor((Math.atan2(point.y-700,point.x-700)+Math.PI)/(Math.PI/4));
            const anchorKey=`${sizeIndex}:${anchorZone}`;
            const isAnchor = (config.structure==='anchors' || config.structure==='sectors') && sizeIndex<2;
            if(isAnchor && (anchors.get(anchorKey)||0)>=1) continue;
            const offset = (seed + visited*17) % Math.max(1,ordered.length);
            const candidates = ordered.map((name,i) => ({name, tie:(i-offset+ordered.length)%ordered.length}))
                .sort((a,b) => (uses.get(a.name.rt_id)||0)-(uses.get(b.name.rt_id)||0) || a.tie-b.tie);
            let target = config.vertical;
            let zone = 0;
            if (config.structure === 'blocks') {
                const band = config.group === 'B' ? wordmarkRegion(point.x) : Math.floor(point.x/180)+Math.floor(point.y/180);
                target = band % 2 ? .7 : .3;
                zone = band;
            }
            const direction = directions.get(zone) || { total:0, vertical:0 };
            const preferVertical = direction.vertical < Math.round((direction.total+1)*target);
            let placed = false;
            for (const {name} of candidates) {
                if ((uses.get(name.rt_id)||0) >= (config.repeatLimit ?? Math.max(3,Math.floor((words.length+1)*.045)))) continue;
                for (const rotation of (preferVertical ? [90] : [0]) as (0|90)[]) {
                    attempts++;
                    const metrics = measure(name.rt_name,size);
                    const width = metrics.left+metrics.right, height = metrics.ascent+metrics.descent;
                    const bbox = { x:point.x,y:point.y,width:rotation ? height : width,height:rotation ? width : height };
                    const safety = padded(bbox,config.gap);
                    if (!mask.contains(safety) || index.collides(safety)) continue;
                    words.push({...name, x:rotation ? point.x+metrics.descent : point.x+metrics.left,
                        y:rotation ? point.y+metrics.left : point.y+metrics.ascent,
                        bbox, fontSize:size, weight:600, rotation, order:words.length, colorSlot:(seed+words.length*7)%8});
                    if(isAnchor) anchors.set(anchorKey,(anchors.get(anchorKey)||0)+1);
                    index.add(safety); uses.set(name.rt_id,(uses.get(name.rt_id)||0)+1);
                    direction.total++; if(rotation) direction.vertical++; directions.set(zone,direction);
                    placed=true; break;
                }
                if (placed || attempts >= limit) break;
            }
        }
        if (words.length >= cap) break;
    }
    signal.throwIfAborted();
    return { id:config.id,width:mask.width,height:mask.height,words,milliseconds:performance.now()-started };
}

// Fill readable rows first, then use a smaller, offset pass only in the remaining pockets.
// Every placement still uses the same full padded-box mask and collision checks.
export async function packDenseRows(config: Composition, names: RockName[], measure: Measure, signal: AbortSignal,
    mask = getOccupancy(config.group)): Promise<Layout> {
    const started=performance.now();
    signal.throwIfAborted();
    const words: WordPlacement[]=[], index=new BoxIndex(), uses=new Map<number,number>();
    const seed=config.id.charCodeAt(0)*31+Number(config.id.slice(1))*7919;
    const ordered=[...names].sort((a,b)=>a.rt_name<b.rt_name?-1:a.rt_name>b.rt_name?1:a.rt_id-b.rt_id);
    if(!ordered.length) return {id:config.id,width:mask.width,height:mask.height,words,milliseconds:0};
    const cap=config.group==='B'?1800:900;
    const maxUses=config.repeatLimit??24;
    let visits=0;
    const phases=config.sizes.flatMap((size,i)=>[{size,offset:0,turn:false},
        ...(i===config.sizes.length-1?[{size,offset:.5,turn:true}]:[])]);
    for(const phase of phases){
        const entries=ordered.map(name=>({name,metrics:measure(name.rt_name,phase.size)}))
            .map(entry=>({...entry,width:entry.metrics.left+entry.metrics.right,height:entry.metrics.ascent+entry.metrics.descent}));
        const rowHeight=Math.max(...entries.map(entry=>entry.height))+config.gap*2;
        const minWidth=Math.min(...entries.map(entry=>entry.width)),minHeight=Math.min(...entries.map(entry=>entry.height));
        const minSide=Math.min(minWidth,minHeight);
        const ranked=()=>entries.filter(entry=>(uses.get(entry.name.rt_id)||0)<maxUses).sort((a,b)=>
            (uses.get(a.name.rt_id)||0)-(uses.get(b.name.rt_id)||0) || b.width-a.width ||
            ((a.name.rt_id+seed)%997)-((b.name.rt_id+seed)%997));
        let candidates=ranked();
        for(let y=config.gap+1+rowHeight*phase.offset;y<mask.height-minHeight-config.gap;y+=rowHeight){
            let x=config.gap+1;
            while(x<mask.width-minSide-config.gap && words.length<cap){
                if(++visits%256===0){await yieldToControls();signal.throwIfAborted();}
                const probe={x,y,width:phase.turn?minSide:minWidth,height:phase.turn?minSide:minHeight};
                if(!mask.contains(padded(probe,config.gap)) || index.collides(padded(probe,config.gap))){x+=2;continue;}
                let placed=false;
                for(const rotation of (phase.turn?[0,90]:[0]) as (0|90)[]){
                    for(const entry of candidates){
                        const {name,metrics,width,height}=entry;
                        const bbox={x,y,width:rotation?height:width,height:rotation?width:height};
                        const box=padded(bbox,config.gap);
                        if(!mask.contains(box)||index.collides(box)) continue;
                        words.push({...name,x:rotation?x+metrics.descent:x+metrics.left,
                            y:rotation?y+metrics.left:y+metrics.ascent,bbox,fontSize:phase.size,weight:600,rotation,
                            order:words.length,colorSlot:(seed+words.length*7)%8});
                        index.add(box);uses.set(name.rt_id,(uses.get(name.rt_id)||0)+1);
                        x+=bbox.width+config.gap*2;
                        candidates=ranked();placed=true;break;
                    }
                    if(placed) break;
                }
                if(!placed) x+=2;
            }
            if(words.length>=cap) break;
        }
        if(words.length>=cap) break;
    }
    signal.throwIfAborted();
    return {id:config.id,width:mask.width,height:mask.height,words,milliseconds:performance.now()-started};
}