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
    { field: "authors", value: "", description: "the source authors (i.e.: Ankeny M.D.,M. Ahmed, T.C. Kaspar, and R. Horton)" },
    { field: "title", value: "", description: "the source title (i.e. Simple field for determining unsaturated hydraulic conductivity)" },
    { field: "source", value: "", description: "the source (i.e. Journal of Contaminant Hydrology, Vol. 91, Issues 3-4, 14 May 2007)" },
    { field: "year_Source", value: "", description: "the year of publication (i.e.: 1991 )" },
    { field: "pages", value: "", description: "the reference pages to the source( i.e.:  467-470)" },
    { field: "doi", value: "", description: "the digital object identifier (i.e.: 10.1007/s10040-004-0432-3 )" },
    { field: "source_link", value: "", description: "a web link to the source document (i.e. http://www.springerlink.com/content/plpva3c6ckgfy932/ ... or to the PDF)" }
];

const SourceInfo = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "54vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '9vh' }), []);    
    const [tableData, setTableData] = useState(rowData);
    
    const columnDefs = useMemo<ColDef[]>(() => [
        { field: "field", editable: false, flex: 1 },
        { field: "value", editable: true, flex: 1, singleClickEdit: true },
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
                }}
            >
                Source of information (Info about the paper or the technical report that contains the measurements)
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

export default SourceInfo;
