import type { ReactNode } from 'react';
// import type { GridColDef } from '@mui/x-data-grid';


import type { ColDef } from "ag-grid-community";


export type DynamicRowData = Record<string, unknown>;

export interface SampleMeasurementRow {
    id: number;
    smpl_name: string;
    rock_type: string;
    scale: string;
    fracturation_degree: string;
    Sample_comment: string;
}

export interface MeasurementRow {
    id: number;
    sampleRef: string;
    parameter: string;
    value: string;
    error: string;
    units: string;
    quality: string;
    experimentType: string;
    interpretation: string;
    comment: string;
}

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

// function inferType(value: unknown): GridColDef['type'] {
//   if (typeof value === 'number') return 'number';
//   if (typeof value === 'string') return 'string';
//   if (value === null) return 'string';
//   if (typeof value === 'boolean') return 'boolean';
//   return 'string';
// }

export interface State {
    open: boolean;
    isDarkTheme: boolean;
    currentRTID: string;
    currentRTName: string;
    currentTableData: DynamicRowData[]; // <-- Переименовал для логичности
    token: string | null;
    sampleMeasurementTableData: SampleMeasurementRow[];
    measurementsTableData: MeasurementRow[];
}


export interface UpdateTableDataAction extends Action {
    type: 'UPDATE_TABLE_DATA';
    payload: DynamicRowData[];
    [key: string]: any; // <-- Добавляем индексную сигнатуру
}

export interface UpdateSampleMeasurementDataAction extends Action {
    type: 'UPDATE_SAMPLE_MEASUREMENT_DATA';
    payload: SampleMeasurementRow[];
    [key: string]: any;
}

export interface UpdateMeasurementsDataAction extends Action {
    type: 'UPDATE_MEASUREMENTS_DATA';
    payload: MeasurementRow[];
    [key: string]: any;
}

export interface ClearSampleMeasurementDataAction extends Action {
    type: 'CLEAR_SAMPLE_MEASUREMENT_DATA';
    [key: string]: any;
}

export interface ClearMeasurementsDataAction extends Action {
    type: 'CLEAR_MEASUREMENTS_DATA';
    [key: string]: any;
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


// Вспомогательная функция для удаления всех кук
export function clearAllCookies() {
    document.cookie.split(";").forEach((c) => {
        document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
};
// Вспомогательная функция, если надо получить csrf_token из cookie
export function getCsrfTokenFromCookie(refresh = false) {
    const csrf = document.cookie
    .split('; ')
    .find(row => row.startsWith(refresh ? 'csrf_refresh_token=' : 'csrf_token='))
    ?.split('=')[1];
    return csrf || '';
};




export interface AccountProfile {
    id: number;
    name: string;
    email: string;
    active: boolean;
    is_superuser: boolean;
}

export interface InputStepProps {
    isEditable: boolean;
    clearAction?: ReactNode;
}


export type SearchParameterSelection = number | 'all' | null;
export interface CatalogParameter {
    id_Parameter: number; code: string; param_name: string; units: string;
    html_code: string; html_units: string; MaxValue: number; MinValue: number;
}
export interface CatalogSearchRow extends DynamicRowData {
    row_id: string; id_Sample: number; sample_name: string; rt_id: number; rt_name: string;
    param_name: string | null; parameter_code: string | null; units: string | null;
    id_Measure: number | null; msr_value: number | null; error: number | null;
    msr_comment: string | null; coher_date: string | null; coher_n_val: number | null;
    id_smpl: number | null; id_coh: number | null; id_ex_ty: number | null;
    id_par_msr: number | null; id_int_mtd: number | null; id_qlt: number | null;
}
export type SearchPanel = 'tree' | 'form' | 'results';
export type SearchPanels = Record<SearchPanel, boolean>;

export interface RockTypeData {
    rt_id: number;
    rt_name: string;
    rt_description: string | null;
    rt_wiki_link: string | null;
    rt_left: number;
    rt_right: number;
    rt_id_parent: number;
    rt_USCS: string | null;
    UID: string | null;
    PARENTUID: string | null;
    rt_status: number;
    status_name: string | null;
}
