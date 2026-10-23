import type { Composition, Group } from './types';
const make = (group: Group, rows: Omit<Composition, 'id' | 'group'>[]): Composition[] =>
    rows.map((config, index) => ({ ...config, group, id: `${group}${index + 1}` as Composition['id'] }));
export const compositions: Composition[] = [
    ...make('A', [
        { vertical: .15, gap: 2, sizes: [32,24,20,16,12], structure: 'rows' },
        { vertical: .7, gap: 2, sizes: [32,24,20,16,12], structure: 'columns' },
        { vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
        { vertical: .35, gap: 2, sizes: [40,32,16,12], structure: 'anchors' },
        { vertical: .3, gap: 6, sizes: [24,20,16], structure: 'rows' },
        { vertical: .5, gap: 1.5, sizes: [20,16,12], structure: 'cells' },
    ]),
    ...make('B', [
        { vertical: .1, gap: 2, sizes: [32,24,20,16,12], structure: 'rows' },
        { vertical: .7, gap: 2, sizes: [40,32,24,16,12], structure: 'columns' },
        { vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
        { vertical: .4, gap: 2, sizes: [40,32,16,12], structure: 'anchors' },
        { vertical: .15, gap: 5, sizes: [24,20,16], structure: 'rows' },
        { vertical: .5, gap: 1.5, sizes: [20,16,12], structure: 'cells' },
    ]),
    ...make('C', [
        { vertical: .05, gap: 2, sizes: [32,24,20,16,12], structure: 'rows' },
        { vertical: .05, gap: 7, sizes: [24,20,16], structure: 'rows' },
        { vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
        { vertical: .7, gap: 2, sizes: [32,24,20,16,12], structure: 'columns' },
        { vertical: .4, gap: 2, sizes: [40,32,16,12], structure: 'sectors' },
        { vertical: .5, gap: 1.5, sizes: [24,20,16,12], structure: 'cells' },
    ]),
];
