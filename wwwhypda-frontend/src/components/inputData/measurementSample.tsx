import styles from '../menu.module.scss'; 
import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { 
    ClientSideRowModelModule, 
    ColDef, 
    ModuleRegistry, 
    TextEditorModule,
    SelectEditorModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule,
    SelectEditorModule
]);

const selectableValues = ["- undefined -", "1", "2", "3"];

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
        { headerName: "id", field: "id", editable: false, flex: 0.5, tooltipField: "Sample id", singleClickEdit: true },
        { headerName: "smpl_name", field: "smpl_name", editable: true, flex: 1, tooltipField: "A name to identify the sample in the Measurements table.", singleClickEdit: true },
        { headerName: "rock_type", field: "rock_type", editable: true, flex: 1, cellEditor: "agSelectCellEditor", cellEditorParams: { values: selectableValues }, tooltipField: "The name of the rock type", singleClickEdit: true },
        { headerName: "scale", field: "scale", editable: true, flex: 1, cellEditor: "agSelectCellEditor", cellEditorParams: { values: selectableValues }, tooltipField: "The scale to which the measurements are made", singleClickEdit: true },
        { headerName: "fracturation_degree", field: "fracturation_degree", editable: true, flex: 1, cellEditor: "agSelectCellEditor", cellEditorParams: { values: selectableValues }, tooltipField: "The degree of fracturation of the volume investigated", singleClickEdit: true },
        { headerName: "Sample_comment", field: "Sample_comment", editable: true, flex: 1, tooltipField: "A comment about the sample", singleClickEdit: true }
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
            />
        </div>
    );
};

export default MeasurementSampleTable;