import * as XLSX from 'xlsx';
import type { DynamicRowData } from './types';

// Export the entire supplied result set, independently of the visible grid page.
export function createDataWorkbook(rows: readonly DynamicRowData[]) {
    const worksheet = XLSX.utils.json_to_sheet([...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    return workbook;
}
