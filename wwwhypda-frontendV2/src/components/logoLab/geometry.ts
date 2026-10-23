import wSvg from '../../logos/logo/W.svg?raw';
import wordmarkSvg from '../../logos/logo/WWHYPDA.svg?raw';
import type { Box, Group } from './types';

export const GEOMETRY_VERSION = 'svg-original-v1';
// These checked assets use absolute M/L/H/V/C/Z paths and no transforms.
// For the wordmark take the filled silhouette IN the mask, never its outer stroke.
export function assetPath(svg: string) {
    if (/\btransform=/.test(svg)) throw new Error('Unexpected asset transform');
    const path = svg.match(/<path\b[^>]*\bd="([^"]+)"/);
    if (!path) throw new Error('Missing filled asset path');
    return path[1];
}
export const W_PATH = assetPath(wSvg);
export const WORDMARK_PATH = assetPath(wordmarkSvg);
export function geometrySpec(group: Group) {
    if (group === 'B') return { width: 5800, height: 1050, path: WORDMARK_PATH, scale: 10, tx: 0, ty: 0 };
    if (group === 'C') return { width: 1400, height: 1400, path: W_PATH, scale: 6, tx: 376, ty: 443 };
    return { width: 1400, height: 1120, path: W_PATH, scale: 12.5, tx: 25, ty: 25 };
}
export interface Occupancy { width: number; height: number; contains: (box: Box) => boolean }
const masks = new Map<Group, Occupancy>();
export function createIntegral(width: number, height: number, allowed: Uint8Array): Occupancy {
    const stride = width + 1;
    const sum = new Uint32Array(stride * (height + 1));
    for (let y = 0; y < height; y++) {
        let row = 0;
        for (let x = 0; x < width; x++) {
            row += allowed[y * width + x] ? 0 : 1;
            sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row;
        }
    }
    return { width, height, contains: box => {
        const x = Math.floor(box.x), y = Math.floor(box.y);
        const r = Math.ceil(box.x + box.width), b = Math.ceil(box.y + box.height);
        return x >= 0 && y >= 0 && r <= width && b <= height && r > x && b > y &&
            sum[b * stride + r] - sum[y * stride + r] - sum[b * stride + x] + sum[y * stride + x] === 0;
    } };
}
export function getOccupancy(group: Group): Occupancy {
    const cached = masks.get(group);
    if (cached) return cached;
    const spec = geometrySpec(group);
    const canvas = document.createElement('canvas');
    canvas.width = spec.width; canvas.height = spec.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    if (group === 'C') {
        ctx.beginPath(); ctx.arc(700, 700, 680, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.translate(spec.tx, spec.ty); ctx.scale(spec.scale, spec.scale);
    ctx.fill(new Path2D(spec.path), 'nonzero');
    const pixels = ctx.getImageData(0, 0, spec.width, spec.height).data;
    const raw = new Uint8Array(spec.width * spec.height);
    for (let i = 0; i < raw.length; i++) raw[i] = pixels[i * 4 + 3] === 255 ? 1 : 0;
    // Erode a full pixel in all directions: antialiasing and hole boundaries remain outside.
    const allowed = new Uint8Array(raw.length);
    for (let y = 1; y < spec.height - 1; y++) for (let x = 1; x < spec.width - 1; x++) {
        const i = y * spec.width + x;
        allowed[i] = raw[i] && raw[i-1] && raw[i+1] && raw[i-spec.width] && raw[i+spec.width] &&
            raw[i-spec.width-1] && raw[i-spec.width+1] && raw[i+spec.width-1] && raw[i+spec.width+1] ? 1 : 0;
    }
    const mask = createIntegral(spec.width, spec.height, allowed);
        // Known solid/empty points validate the original nonzero winding, counters and subtraction.
    const fixtures: [number,number,boolean][] = group === 'A' ? [[10,10,true],[54,80,false],[-2,10,false]] :
        group === 'B' ? [[370,40,true],[390,40,false],[435,50,true],[460,50,false],[537,74,true],[537,60,false]] :
        [[10,10,false],[700,100,true],[450,500,false]];
    for (const [x,y,expected] of fixtures) {
        const point = group === 'A' ? {x:25+x*12.5,y:25+y*12.5} : group === 'B' ? {x:x*10,y:y*10} : {x,y};
        if (mask.contains({...point,width:1,height:1}) !== expected) throw new Error(`Invalid ${group} geometry at ${x},${y}`);
    }
    masks.set(group, mask);
    return mask;
}

