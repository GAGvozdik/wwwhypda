import { useMemo, useSyncExternalStore } from 'react';
import type { ColDef } from 'ag-grid-community';

const readRootFontSize = () => Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
const subscribe = (notify: () => void) => {
    window.addEventListener('resize', notify);
    const observer = new MutationObserver(notify);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
        window.removeEventListener('resize', notify);
        observer.disconnect();
    };
};

export default function useRemColumns<T>(columns: ColDef<T>[]) {
    const rem = useSyncExternalStore(subscribe, readRootFontSize, () => 16);
    return useMemo(() => columns.map(column => {
        const ratio = column.flex && column.flex > 0 ? column.flex : 1;
        // Existing numeric constraints use their original 16px rem baseline, without a zoom multiplier.
        const minimum = column.minWidth === undefined ? 6 * ratio : column.minWidth / 16;
        const fixedWidth = column.width !== undefined && !column.flex;
        return {
            ...column,
            flex: fixedWidth ? 0 : (column.flex ?? 1),
            minWidth: minimum * rem,
            width: column.width === undefined ? undefined : column.width / 16 * rem,
            maxWidth: column.maxWidth === undefined ? undefined : column.maxWidth / 16 * rem,
        };
    }), [columns, rem]);
}
