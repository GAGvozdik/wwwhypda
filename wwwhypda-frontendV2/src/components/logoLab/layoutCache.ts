import type { Composition, Layout, RockName } from './types';
import { catalogFingerprint } from './rockNames';
import { GEOMETRY_VERSION } from './geometry';
import { browserMeasure, pack, PACKING_VERSION } from './packing';
const cache = new Map<string, Layout>();
let queue: Promise<unknown> = Promise.resolve();
let fontReady: Promise<void> | undefined;
function prepareFont() {
    fontReady ??= (async () => {
        const faces=await document.fonts.load('600 16px Afacad_Flux'); await document.fonts.ready;
        if (!faces.length || !document.fonts.check('600 16px Afacad_Flux')) throw new Error('Logo font unavailable');
    })().catch(error => { fontReady=undefined; throw error; });
    return fontReady;
}
export function getLayout(config: Composition, names: RockName[], signal: AbortSignal): Promise<Layout> {
    const key = `${GEOMETRY_VERSION}/${PACKING_VERSION}/${config.id}/${catalogFingerprint(names)}`;
    const ready = cache.get(key);
    if (ready) return Promise.resolve(ready);
    const task = queue.catch(() => {}).then(async () => {
        signal.throwIfAborted();
        const existing = cache.get(key);
        if (existing) return existing;
        await prepareFont(); signal.throwIfAborted();
                const measure=browserMeasure();
        let layout: Layout;
        try { layout=await pack(config,names,measure,signal); } finally { measure.dispose(); }
        cache.set(key,layout);
        // Bound memory when catalog contents change between visits.
        if (cache.size > 36) cache.delete(cache.keys().next().value!);
        return layout;
    });
    queue=task;
    return task;
}
