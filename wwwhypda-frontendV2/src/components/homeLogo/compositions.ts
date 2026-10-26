import type { Composition } from './types';
export const HOME_LOGO_MOBILE_QUERY = '(max-width: 48rem)';
export const compositions: Composition[] = [
    { id:'B12', group:'B', vertical:0, gap:1, sizes:[48,43.2], structure:'denseRows', repeatLimit:24 },
    { id:'C12', group:'C', vertical:0, gap:1, sizes:[40,36], structure:'denseRows', repeatLimit:24 },
];
export function homeLogoComposition(mobile: boolean): Composition {
    return compositions[mobile ? 1 : 0];
}