import type { Composition, Layout, RockName } from './types';
import { catalogFingerprint } from './rockNames';
import { GEOMETRY_VERSION } from './geometry';
import { vectorMeasure, pack, PACKING_VERSION } from './packing';
const cache = new Map<string, Layout>();
let queue: Promise<unknown> = Promise.resolve();
export function getLayout(config: Composition, names: RockName[], signal: AbortSignal): Promise<Layout> {
    const key = `${GEOMETRY_VERSION}/${PACKING_VERSION}/${config.id}/${catalogFingerprint(names)}`;
    const ready = cache.get(key);
    if (ready) return Promise.resolve(ready);
    const task = queue.catch(() => {}).then(async () => {
        signal.throwIfAborted();
        const existing = cache.get(key);
        if (existing) return existing;
        signal.throwIfAborted();
        const layout=await pack(config,names,vectorMeasure,signal);
        cache.set(key,layout);
        // Bound memory when catalog contents change between visits.
        if (cache.size > 36) cache.delete(cache.keys().next().value!);
        return layout;
    });
    queue=task;
    return task;
}
