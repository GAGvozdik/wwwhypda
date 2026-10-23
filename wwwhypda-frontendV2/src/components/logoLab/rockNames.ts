import { isAllRockTypes } from '../../common/catalog';
import type { RockTypeData } from '../../common/types';
import type { RockName } from './types';

// Only structural categories are excluded. Status is a moderation field, not a category classifier.
export function extractRockNames(data: RockTypeData[]): RockName[] {
    const parents = new Set(data.map(node => node.rt_id_parent));
    const sorted = data.filter(node => node.rt_id_parent !== -1 && !parents.has(node.rt_id) &&
        !isAllRockTypes(node.rt_name, node.rt_id_parent))
        .map(node => ({ rt_id: node.rt_id, rt_name: node.rt_name.trim() }))
        .filter(node => node.rt_name.length > 0)
        .sort((a, b) => a.rt_name < b.rt_name ? -1 : a.rt_name > b.rt_name ? 1 : a.rt_id - b.rt_id);
    return sorted.filter((node, index) => index === 0 || node.rt_name !== sorted[index - 1].rt_name);
}
export function catalogFingerprint(names: RockName[]) {
    return JSON.stringify(names.map(node => [node.rt_id, node.rt_name]));
}
