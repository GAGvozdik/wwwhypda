import styles from '../menu.module.scss'; 
import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import { 
    ClientSideRowModelModule, 
    ColDef, 
    ModuleRegistry, 
    TextEditorModule
} from "ag-grid-community";

ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule
]);

const rowData = [
    { field: "env_name", value: "", description: "the hydrogeological environment" },
    { field: "review_level", value: "", description: "the levels of reviews endured by the measurements" }
];

const envName = ["env 1", "env 2", "env 3", "-- unavailable --"];
const reviewLevel = ["lvl 1", "lvl 2", "lvl 3", "lvl 4", "-- unavailable --"];

const GeneralInfo = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "58vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '5vh' }), []);    
    const [tableData, setTableData] = useState(rowData);
    
    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: "Field", field: "field", editable: false, flex: 1 },
        // { headerName: "Value", field: "value", editable: true, flex: 1, singleClickEdit: true, },

        { 
            field: "value", 
            editable: true, 
            singleClickEdit: true,
            flex: 1,
            cellEditorSelector: (params) => {
                return params.data.field === "env_name"
                    ? { component: "agSelectCellEditor", params: { values: envName } }
                    : { component: "agSelectCellEditor", params: { values: reviewLevel } };
            }
        },

        { headerName: "Description", field: "description", editable: false, flex: 2 }
    ], []);

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: true,
            flex: 1,
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
                    fontSize: '3vh', 
                    margin: '1vh 0vh 1vh 0vh' 
                }}
            >
                    General information about measurements
            </div>

            <AgGridReact
                theme={themeDarkBlue}
                rowData={tableData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                // suppressHeaderOnAutoSize={true}
                suppressColumnVirtualisation={true}
                suppressRowHoverHighlight={true}
                suppressNoRowsOverlay={true}
                suppressMenuHide={true}
                headerHeight={0}
            />
        </div>
    );
};

export default GeneralInfo;
