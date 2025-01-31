import styles from '../menu.module.scss';

// "use client";
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css"; // Для Quartz
// import "ag-grid-community/styles/ag-theme-alpine.css";

import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
    StrictMode,
} from "react";

import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";

import {
    NumberEditorModule,
    NumberFilterModule,
    TextFilterModule,
    colorSchemeDark,
    colorSchemeDarkBlue,
    colorSchemeDarkWarm,
    colorSchemeLight,
    colorSchemeLightCold,
    colorSchemeLightWarm,
    colorSchemeVariable,
    iconSetAlpine,
    iconSetMaterial,
    iconSetQuartzBold,
    iconSetQuartzLight,
    iconSetQuartzRegular,
    themeAlpine,
    themeBalham,
    themeQuartz,
} from "ag-grid-community";

import {
    CellSelectionOptions,
    ClientSideRowModelModule,
    ColDef,
    ColGroupDef,
    GridApi,
    GridOptions,
    ModuleRegistry,
    TextEditorModule,
    ValidationModule,
    ValueFormatterParams,
    ValueParserParams,
    createGrid,
    ISelectCellEditorParams,
    SelectEditorModule,
} from "ag-grid-community";

import {
    CellSelectionModule,
    ClipboardModule,
    ColumnMenuModule,
    ContextMenuModule,
    ExcelExportModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule,
    ClipboardModule,
    ExcelExportModule,
    ColumnMenuModule,
    ContextMenuModule,
    CellSelectionModule,
    SelectEditorModule,
    //   ValidationModule /* Development Only */,
]);


const languages = ["English", "Spanish", "French", "Portuguese", "(other)"];

// Генерация случайных данных
function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function createRowData() {
    const rowData = [];
    for (let i = 0; i < 10; i++) {
        rowData.push({
            a: Math.floor(((i + 2) * 173456) % 10000),
            b: Math.floor(((i + 7) * 373456) % 10000),
            language: languages[getRandomNumber(0, 4)],
        });
    }
    return rowData;
}

const InputDataTable = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "75vh", "--ag-background-color": "#22282e", }), []);
    // const gridStyle = useMemo(() => ({ height: "400px", width: "100%", "--ag-background-color": "#2c333a", }), []);
    const [rowData, setRowData] = useState<any[]>(createRowData());
    // const [baseTheme, setBaseTheme] = useState(colorSchemeDark);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([
        {
            headerName: "Language",
            field: "language",
            editable: true, // Разрешаем редактирование
            cellEditor: "agSelectCellEditor", // Выбираем редактор с выпадающим списком
            cellEditorParams: {
                values: languages, // Массив значений для выпадающего списка
            } as ISelectCellEditorParams,
            // Включаем редактирование по одному клику
            singleClickEdit: true,
            // Валидация: только значения из списка
            valueParser: (params) => {
                if (languages.includes(params.newValue)) {
                    return params.newValue; // Возвращаем значение, если оно в списке
                } else {
                    return params.oldValue; // Если значение не в списке, не меняем ячейку
                }
            },
        },
        {
            headerName: "A",
            field: "a",
            valueFormatter: (params) => params.value, // Просто возвращаем число
            valueParser: (params) => Number(params.newValue) || 0, // Парсим как число
        },
        {
            headerName: "B",
            field: "b",
            valueFormatter: (params) => params.value,
            valueParser: (params) => Number(params.newValue) || 0,
        },
    ]);

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            cellDataType: false,
            editable: true,
            flex: 1,
            // cellClass: "number-cell",
        };
    }, []);

    const cellSelection = useMemo<boolean | CellSelectionOptions>(() => {
        return {
            handle: {
                mode: "fill",
            },
        };
    }, []);

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({fontFamily: 'Afacad_Flux !important'});
    // --under-body-color: #2c333a;
    // --drawer-icon: #949494;


    // themeAlpine,
    // themeBalham,
    return (
        <div style={containerStyle} className="">

            <AgGridReact
                theme={themeDarkBlue}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                cellSelection={cellSelection}
                // singleClickEdit={true} // Режим редактирования по одному клику
            />

        </div>
    );
};



// const root = createRoot(document.getElementById("root")!);
// root.render(
//   <StrictMode>
//     <InputDataTable />
//   </StrictMode>,
// );



// const InputDataTable: React.FC = () => {
//     return (
//         <div className={styles.treeText}>

//         </div>
//     );
// };


export default InputDataTable;






