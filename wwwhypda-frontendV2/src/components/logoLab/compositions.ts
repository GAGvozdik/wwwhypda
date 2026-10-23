import type { Composition } from './types';
export const compositions: Composition[] = [
    { id: 'A3', group: 'A', vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
    { id: 'A4', group: 'A', vertical: .35, gap: 2, sizes: [40,32,16,12], structure: 'anchors' },
    { id: 'A6', group: 'A', vertical: .5, gap: 1.5, sizes: [20,16,12], structure: 'cells' },
    { id: 'A9', gridStep: 14, group: 'A', vertical: .5, gap: 3, sizes: [42,36,30], structure: 'blocks' },
    { id: 'B1', group: 'B', vertical: .1, gap: 2, sizes: [32,24,20,16,12], structure: 'rows' },
    { id: 'B2', group: 'B', vertical: .7, gap: 2, sizes: [40,32,24,16,12], structure: 'columns' },
    { id: 'B3', group: 'B', vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
    { id: 'B4', group: 'B', vertical: .4, gap: 2, sizes: [40,32,16,12], structure: 'anchors' },
    { id: 'B5', group: 'B', vertical: .15, gap: 5, sizes: [24,20,16], structure: 'rows' },
    { id: 'B6', group: 'B', vertical: .5, gap: 1.5, sizes: [20,16,12], structure: 'cells' },
    { id: 'B9', gridStep: 14, group: 'B', vertical: .5, gap: 3, sizes: [50,40,34], structure: 'blocks' },
    { id: 'C1', group: 'C', vertical: .05, gap: 2, sizes: [32,24,20,16,12], structure: 'rows' },
    { id: 'C2', group: 'C', vertical: .05, gap: 7, sizes: [24,20,16], structure: 'rows' },
    { id: 'C3', group: 'C', vertical: .5, gap: 3, sizes: [24,20,16,12], structure: 'blocks' },
    { id: 'C9', gridStep: 16, group: 'C', vertical: .35, gap: 3, sizes: [44,38,32], structure: 'blocks' },
];
