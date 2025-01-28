import { createStore } from 'redux';
import { State, Action } from '../common/types';

const initialState: State = {
    open: false,
    isDarkTheme: true,
    currentRTID: '',
    currentRTName: '',
    currentSearchResult: [],
    // token: '', // Токен по умолчанию
    token: null,
};


const reducer = (state: State = initialState, action: Action): State => {
    switch (action.type) {

        case 'UPDATE_OPEN':
            return { ...state, open: action.payload };

        case 'UPDATE_THEME':
            return { ...state, isDarkTheme: action.payload };

        case 'UPDATE_RTID':
            return { ...state, currentRTID: action.payload };

        case 'UPDATE_RTNAME':
            return { ...state, currentRTName: action.payload };

        case 'UPDATE_SEARCHRESULT':
            return { ...state, currentSearchResult: action.payload };

        case 'UPDATE_TOKEN':
            return { ...state, token: action.payload };

        case 'LOGOUT':
            return { ...state, token: '' };

        default:
        return state;
    }
};

const store = createStore<State, Action, {}>(reducer); 

export default store;

