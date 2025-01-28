import { GridColDef } from '@mui/x-data-grid';
export type DynamicRowData = Record<string, unknown>;

export function generateColumns(data: DynamicRowData[]): GridColDef[] {
    if (!data || data.length === 0) return [];

    const firstRowKeys = Object.keys(data[0]); 

    return firstRowKeys.map(key => ({
        field: key,
        headerName: key,
        // minWidth: 80, // Минимальная ширина в пикселях
        // flex: 1,       // Дополнительная гибкость
        type: inferType(data[0][key]),
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
    currentSearchResult: DynamicRowData[];
    token: string | null; // JWT токен
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

export interface UpdateSearchResultsAction extends Action {
    type: 'UPDATE_SEARCHRESULT';
    payload: DynamicRowData[];
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

