import type { SearchParameterSelection, RockTypeData } from './types';

export function isAllRockTypes(name: string, parent?: number) {
    return (parent === undefined || parent === -1) &&
        name.trim().replace(/^-+|-+$/g, '').trim().toLowerCase().replace(/\s+/g, ' ') === 'generic earth material';
}
export function parseSearchParameter(value: string): SearchParameterSelection {
    if (value === 'all') return 'all';
    if (!/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function findAllRockTypesId(data: Pick<RockTypeData, 'rt_id' | 'rt_name' | 'rt_id_parent'>[]) {
    const roots = data.filter(node => isAllRockTypes(node.rt_name, node.rt_id_parent));
    return roots.length === 1 ? String(roots[0].rt_id) : null;
}
