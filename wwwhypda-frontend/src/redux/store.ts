import { createStore } from 'redux';
import { State, Action } from '../common/types';


const initialState: State = {
    open: true,
    isDarkTheme: localStorage.getItem("isDarkTheme") ? localStorage.getItem("isDarkTheme") === "true" : true,
    currentRTID: '',
    currentRTName: '',
    currentTableData: [], // <-- Обновляем состояние
    token: null,
    sampleMeasurementTableData: JSON.parse(localStorage.getItem('sampleMeasurementTableData') || '[]'),
    measurementsTableData: JSON.parse(localStorage.getItem('measurementsTableData') || '[]'),
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

        case 'UPDATE_SAMPLE_MEASUREMENT_DATA':
            return { ...state, sampleMeasurementTableData: action.payload };

        case 'UPDATE_MEASUREMENTS_DATA':
            return { ...state, measurementsTableData: action.payload };

        default:
        return state;
    }
};

const store = createStore<State, Action, {}, {}>(reducer); 

store.subscribe(() => {
    const state = store.getState();
    localStorage.setItem('sampleMeasurementTableData', JSON.stringify(state.sampleMeasurementTableData));
    localStorage.setItem('measurementsTableData', JSON.stringify(state.measurementsTableData));
});

export default store;

