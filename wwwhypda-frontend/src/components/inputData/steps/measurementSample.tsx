import styles from '../../menu.module.scss'; 
import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { 
    ClientSideRowModelModule, 
    ColDef, 
    ModuleRegistry, 
    TextEditorModule,
    SelectEditorModule,
    CellSelectionOptions,
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

const rockTypeValues = ["- undefined -", "sand", "marl", "basalt"];
const scaleValues = ["- undefined -", "middle", "large", "low"];
const fracturationDegreeValues = ["- undefined -", "val 1", "val 2", "val 3"];

const MeasurementSampleTable = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "50vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '13vh' }), []);
    const [tableData, setTableData] = useState([
        { id: 1, smpl_name: "", rock_type: "- undefined -", scale: "- undefined -", fracturation_degree: "- undefined -", Sample_comment: "" },
        { id: 2, smpl_name: "", rock_type: "- undefined -", scale: "- undefined -", fracturation_degree: "- undefined -", Sample_comment: "" },
        { id: 3, smpl_name: "", rock_type: "- undefined -", scale: "- undefined -", fracturation_degree: "- undefined -", Sample_comment: "" }
    ]);
    
    const addRow = () => {
        setTableData(prev => [...prev, {
            id: prev.length + 1,
            smpl_name: "",
            rock_type: "- undefined -",
            scale: "- undefined -",
            fracturation_degree: "- undefined -",
            Sample_comment: ""
        }]);
    };

    const deleteRow = () => {
        setTableData(prev => prev.slice(0, -1));
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        { 
            headerName: "id", 
            field: "id", 
            editable: false, 
            flex: 0.5, 
            singleClickEdit: false 
        },
        { 
            headerName: "smpl_name", 
            field: "smpl_name", 
            editable: true, 
            flex: 1, 
            singleClickEdit: false 
        },
        { 
            headerName: "rock_type", 
            field: "rock_type", 
            editable: true, 
            flex: 1, 
            cellEditor: "agSelectCellEditor", 
            cellEditorParams: { values: rockTypeValues }, 
            valueParser: (params) => {
                if (rockTypeValues.includes(params.newValue)) {
                    return params.newValue; 
                } else {
                    return params.oldValue; 
                }
            },
            singleClickEdit: false 
        },
        { 
            headerName: "scale", 
            field: "scale", 
            editable: true, 
            flex: 1, 
            cellEditor: "agSelectCellEditor", 
            cellEditorParams: { values: scaleValues }, 
            valueParser: (params) => {
                if (scaleValues.includes(params.newValue)) {
                    return params.newValue; 
                } else {
                    return params.oldValue; 
                }
            },
            singleClickEdit: false 
        },
        { 
            headerName: "fracturation_degree", 
            field: "fracturation_degree", 
            editable: true, 
            flex: 1, 
            cellEditor: "agSelectCellEditor", 
            cellEditorParams: { values: fracturationDegreeValues }, 
            valueParser: (params) => {
                if (fracturationDegreeValues.includes(params.newValue)) {
                    return params.newValue; 
                } else {
                    return params.oldValue; 
                }
            },
            singleClickEdit: false 
        },
        { 
            headerName: "Sample_comment", 
            field: "Sample_comment", 
            editable: true, 
            flex: 1, 
            singleClickEdit: false 
        }
    ], []);

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: true,
            flex: 1,
            suppressMenu: true,
            suppressSorting: true,
        };
    }, []);

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({
        fontFamily: "Afacad_Flux !important",
        foregroundColor: "var(--tree-text)",
        headerTextColor: "var(--tree-text)",
        rangeSelectionBorderColor: "var(--tree-text)",
        rangeSelectionBackgroundColor: "var(--scrollbar-track-color)",
        columnBorder: { color: '#33383d', width: '1px' },
    });
    
    const cellSelection = useMemo<boolean | CellSelectionOptions>(() => {
        return {
            handle: {
                mode: "fill",
            },
        };
    }, []);

    return (
        <div style={containerStyle}>
            
            <div 
                style={{ 
                    color: "var(--tree-text)", 
                    textAlign: "center", 
                    fontSize: '2.5vh', 
                    margin: '1vh 0vh 1vh 0vh' 
                }}
            >
                Measurement “Sample” (the borehole, the sample, or the borehole section where the measurement was performed)
            </div>

            <div style={{display: 'flex'}}>
                <button
                    onClick={addRow}
                    className={styles.submitButton}
                    style={{
                        margin: '1vh 1vh 1vh 0vh', 
                        width: '10vh', 
                        height: '3.5vh', 
                        fontSize: '1.5vh', 
                        padding: '0vh'
                    }}
                >
                    Add Row
                </button>

                <button
                    onClick={deleteRow}
                    className={styles.submitButton}
                    style={{
                        margin: '1vh 1vh 1vh 0vh', 
                        width: '10vh', 
                        height: '3.5vh', 
                        fontSize: '1.5vh', 
                        padding: '0vh'
                    }}
                >
                    Delete Row
                </button>
            </div>

            <AgGridReact
                theme={themeDarkBlue}
                rowData={tableData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                tooltipShowDelay={0}
                headerHeight={40}
                cellSelection={cellSelection}
            />
        </div>
    );
};

export default MeasurementSampleTable;