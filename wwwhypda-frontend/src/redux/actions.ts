import { 
    UpdateOpenCloseAction, 
    UpdateThemeAction,
    UpdateRTIDAction,
    UpdateRTNameAction,
    DynamicRowData,
    UpdateTableDataAction,
    SampleMeasurementRow,
    MeasurementRow,
    UpdateSampleMeasurementDataAction,
    UpdateMeasurementsDataAction,
    ClearSampleMeasurementDataAction,
    ClearMeasurementsDataAction,
} from '../common/types';

import { UpdateTokenAction, LogoutAction } from '../common/types';

export const UpdateToken = (token: string): UpdateTokenAction => ({
    type: 'UPDATE_TOKEN',
    payload: token,
});

export const UpdateTableData = (data: DynamicRowData[]): UpdateTableDataAction => ({
    type: 'UPDATE_TABLE_DATA',
    payload: data,
});

export const UpdateSampleMeasurementData = (data: SampleMeasurementRow[]): UpdateSampleMeasurementDataAction => ({
    type: 'UPDATE_SAMPLE_MEASUREMENT_DATA',
    payload: data,
});

export const UpdateMeasurementsData = (data: MeasurementRow[]): UpdateMeasurementsDataAction => ({
    type: 'UPDATE_MEASUREMENTS_DATA',
    payload: data,
});

export const Logout = (): LogoutAction => ({
    type: 'LOGOUT',
});

export const UpdateOpenClose = (open: boolean): UpdateOpenCloseAction => ({
    type: 'UPDATE_OPEN',
    payload: open,
});
  
export const UpdateTheme = (isDarkTheme: boolean): UpdateThemeAction => ({
    type: 'UPDATE_THEME',
    payload: isDarkTheme,
});

export const UpdateRTID = (currentRTID: string): UpdateRTIDAction => ({
    type: 'UPDATE_RTID',
    payload: currentRTID,
});

export const UpdateRTName = (currentRTName: string): UpdateRTNameAction => ({
    type: 'UPDATE_RTNAME',
    payload: currentRTName,
});

export const ClearSampleMeasurementData = (): ClearSampleMeasurementDataAction => ({
    type: 'CLEAR_SAMPLE_MEASUREMENT_DATA'
});

export const ClearMeasurementsData = (): ClearMeasurementsDataAction => ({
    type: 'CLEAR_MEASUREMENTS_DATA'
});
