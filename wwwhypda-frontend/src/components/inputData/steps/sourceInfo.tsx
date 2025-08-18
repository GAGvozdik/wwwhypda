import styles from '../menu.module.scss';
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { useStepsTheme } from '../steps';
import { useSelector } from 'react-redux';
import { State } from '../../../common/types';
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

const getDefaultRowData = () => [
    { field: "authors", value: "", description: "the source authors (i.e.: Ankeny M.D.,M. Ahmed, T.C. Kaspar, and R. Horton)" },
    { field: "title", value: "", description: "the source title (i.e. Simple field for determining unsaturated hydraulic conductivity)" },
    { field: "source", value: "", description: "the source (i.e. Journal of Contaminant Hydrology, Vol. 91, Issues 3-4, 14 May 2007)" },
    { field: "year_Source", value: "", description: "the year of publication (i.e.: 1991 )" },
    { field: "pages", value: "", description: "the reference pages to the source( i.e.:  467-470)" },
    { field: "doi", value: "", description: "the digital object identifier (i.e.: 10.1007/s10040-004-0432-3 )" },
    { field: "source_link", value: "", description: "a web link to the source document (i.e. http://www.springerlink.com/content/plpva3c6ckgfy932/ ... or to the PDF)" }
];

const LOCAL_STORAGE_KEY = "sourceTableData";

type SourceInfoProps = {
    isEditable: boolean;
};

const SourceInfo = ({isEditable=true}: SourceInfoProps) => {

    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "46vh", 
        ["--ag-background-color"]: "var(--table-color)",
        marginTop: '0vh', 
        marginBottom: '5vh',
    }), []);    

    const [tableData, setTableData] = useState(getDefaultRowData());

    const loadTableData = () => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved && JSON.parse(saved).length > 0) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setTableData(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved table data", e);
            }
        } else {
            setTableData(getDefaultRowData());
        }
    };

    useEffect(() => {
        loadTableData();
    }, []);

    const handleCellValueChanged = useCallback((params: any) => {
        const updated = [...tableData];
        updated[params.node.rowIndex] = {
            ...updated[params.node.rowIndex],
            [params.column.getColId()]: params.newValue
        };
        setTableData(updated);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }, [tableData]);

    const columnDefs = useMemo<ColDef[]>(() => [
        { field: "field", editable: false, flex: 1 },
        { field: "value", editable: isEditable, flex: 1, singleClickEdit: true },
        { field: "description", editable: false, flex: 2 }
    ], []);

    const defaultColDef = useMemo<ColDef>(() => ({
        editable: isEditable,
        flex: 1,
        suppressMenu: true,
        suppressSorting: true,
        headerComponentParams: { suppressHeader: true }
    }), []);

    const themeDarkBlue = useStepsTheme();

    return (
        <div style={containerStyle}>
            <div style={{height: '50vh'}}>
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={tableData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    headerHeight={0}
                    onCellValueChanged={handleCellValueChanged}
                    // suppressColumnVirtualisation={true}
                    // suppressRowHoverHighlight={true}
                    // suppressNoRowsOverlay={true}
                    // suppressMenuHide={true}
                />
            </div>
        </div>
    );
};

export default SourceInfo;
