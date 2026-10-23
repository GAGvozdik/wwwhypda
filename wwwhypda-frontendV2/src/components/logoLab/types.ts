import type { RockTypeData } from '../../common/types';
export type Group = 'A' | 'B' | 'C';
export type CompositionId = `${Group}${1 | 2 | 3 | 4 | 5 | 6 | 9}`;
export type RevealMode = 'left' | 'sequence' | 'centre';
export type RockName = Pick<RockTypeData, 'rt_id' | 'rt_name'>;
export interface Box { x: number; y: number; width: number; height: number }
export interface WordPlacement extends RockName {
    x: number; y: number; fontSize: number; weight: number; rotation: 0 | 90;
    bbox: Box; order: number; colorSlot: number;
}
export interface Layout { id: CompositionId; width: number; height: number; words: WordPlacement[]; milliseconds: number }
export interface Composition {
    id: CompositionId; group: Group; vertical: number; gap: number;
    gridStep?: number; repeatLimit?: number;
    sizes: readonly number[]; structure: 'rows' | 'columns' | 'blocks' | 'anchors' | 'cells' | 'sectors';
}
export interface CardSettings { reveal: RevealMode; replayVersion: number }
