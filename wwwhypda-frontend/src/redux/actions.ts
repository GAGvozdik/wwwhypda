import { 
    UpdateOpenCloseAction, 
    UpdateThemeAction,
    UpdateRTIDAction,
    UpdateRTNameAction,
    UpdateSearchResultsAction,
    DynamicRowData
} from '../common/types';

import { UpdateTokenAction, LogoutAction } from '../common/types';

export const UpdateToken = (token: string): UpdateTokenAction => ({
    type: 'UPDATE_TOKEN',
    payload: token,
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

export const UpdateSearchResult = (currentSearchResult: DynamicRowData[]): UpdateSearchResultsAction => ({
    type: 'UPDATE_SEARCHRESULT',
    payload: currentSearchResult,
});

