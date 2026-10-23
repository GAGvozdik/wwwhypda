import type { Composition, Layout } from './types';
import { getOccupancy } from './geometry';
import { wordmarkRegion } from './regions';
import { BoxIndex, padded } from './packing';
export function diagnoseLayout(layout: Layout, config: Composition) {
    const mask = getOccupancy(config.group), index = new BoxIndex();
    const counts = new Map<string,number>();
    const regions = Array.from({length:config.group === 'B' ? 7 : 4}, () => 0);
    let outside=0,overlaps=0,vertical=0,area=0;
    for (const word of layout.words) {
        const box=padded(word.bbox,config.gap);
        if (!mask.contains(box)) outside++;
        if (index.collides(box)) overlaps++;
        index.add(box);
        counts.set(word.rt_name,(counts.get(word.rt_name)||0)+1);
        if (word.rotation) vertical++;
        area += word.bbox.width*word.bbox.height;
        const region=config.group === 'B' ? wordmarkRegion(word.bbox.x) :
            (word.bbox.x>=layout.width/2 ? 1 : 0)+(word.bbox.y>=layout.height/2 ? 2 : 0);
        regions[region]++;
    }
    return { id:layout.id,words:layout.words.length,nodes:layout.words.length+2,unique:counts.size,
        vertical:vertical/Math.max(1,layout.words.length),outside,overlaps,
        maxRepeat:Math.max(0,...counts.values())/Math.max(1,layout.words.length),
        sizes:[...new Set(layout.words.map(word => word.fontSize))],regions,
        bboxCoverage:area/(layout.width*layout.height),milliseconds:Math.round(layout.milliseconds) };
}

