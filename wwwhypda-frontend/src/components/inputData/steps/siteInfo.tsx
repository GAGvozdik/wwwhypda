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

const rowData = [
    { field: "site_name", value: "", description: "the site name" },
    { field: "region", value: "", description: "the region where the measurements are made" },
    { field: "country_name", value: "", description: "the country where the measurements are made" },
    { field: "longitude", value: "", description: "" },
    { field: "latitude", value: "", description: "" }
];

const countries = ["France", "Italy", "Angola", "Serbia", "-- unavailable --"];

const SiteInfo = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "58vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '5vh' }), []);
    const [tableData, setTableData] = useState(rowData);
    
    const columnDefs = useMemo<ColDef[]>(() => [
        { field: "field", editable: false, flex: 1 },
        { 
            field: "value", 
            editable: true, 
            singleClickEdit: true,
            flex: 1,
            cellEditorSelector: (params) => {
                return params.data.field === "country_name"
                    ? { component: "agSelectCellEditor", params: { values: countries } }
                    : { component: "agTextCellEditor" };
            }
        },
        { field: "description", editable: false, flex: 2 }
    ], []);

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: true,
            flex: 1,
            suppressMenu: true,
            suppressSorting: true,
            headerComponentParams: { suppressHeader: true }
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
                }}>
                    Site Information
                </div>
            <AgGridReact
                theme={themeDarkBlue}
                rowData={tableData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                headerHeight={0}
            />
        </div>
    );
};

export default SiteInfo;
