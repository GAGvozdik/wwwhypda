import { createStore } from 'redux';
import { State, Action } from '../common/types';


const initialState: State = {
    open: true,
    isDarkTheme: localStorage.getItem("isDarkTheme") === "true",
    currentRTID: '',
    currentRTName: '',
    currentTableData: [], // <-- Обновляем состояние
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

        case 'UPDATE_TABLE_DATA': // <-- Добавляем обработку данных таблицы
            return { ...state, currentTableData: action.payload };

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

