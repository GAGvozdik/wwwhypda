import { GridColDef } from '@mui/x-data-grid';


import { ColDef } from "ag-grid-community";


export type DynamicRowData = Record<string, unknown>;

export function generateColumns(data: DynamicRowData[]): ColDef[] {
    if (!data || data.length === 0) return [];

    const firstRowKeys = Object.keys(data[0]);

    return firstRowKeys.map((key) => ({
        field: key,
        headerName: key.toUpperCase(), // Делаем заголовки столбцов заглавными
        sortable: true,
        filter: true,
        resizable: true,
        editable: false, // Запрещаем редактирование
    }));
}

function inferType(value: unknown): GridColDef['type'] {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (value === null) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  return 'string'; 
}

export interface State {
    open: boolean;
    isDarkTheme: boolean;
    currentRTID: string;
    currentRTName: string;
    currentTableData: DynamicRowData[]; // <-- Переименовал для логичности
    token: string | null;
}


export interface UpdateTableDataAction extends Action {
    type: 'UPDATE_TABLE_DATA';
    payload: DynamicRowData[];
    [key: string]: any; // <-- Добавляем индексную сигнатуру
}


export interface Action {
    type: string;
    payload?: any;
}

export interface UpdateThemeAction extends Action {
    type: 'UPDATE_THEME';
    payload: boolean;
    [key: string]: any; 
}

export interface UpdateOpenCloseAction extends Action {
    type: 'UPDATE_OPEN';
    payload: boolean;
    [key: string]: any; 
}

export interface UpdateRTIDAction extends Action {
    type: 'UPDATE_RTID';
    payload: string;
    [key: string]: any; 
}

export interface UpdateRTNameAction extends Action {
    type: 'UPDATE_RTNAME';
    payload: string;
    [key: string]: any; 
}


export interface UpdateTokenAction extends Action {
    type: 'UPDATE_TOKEN';
    payload: string;
    [key: string]: any;
}

export interface LogoutAction extends Action {
    type: 'LOGOUT';
    [key: string]: any;
}

export const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
    return null;
};

// Вспомогательная функция для удаления всех кук
export function clearAllCookies() {
    document.cookie.split(";").forEach((c) => {
        document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
};
// Вспомогательная функция, если надо получить csrf_token из cookie
export function getCsrfTokenFromCookie() {
    const csrf = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
    return csrf || '';
};



