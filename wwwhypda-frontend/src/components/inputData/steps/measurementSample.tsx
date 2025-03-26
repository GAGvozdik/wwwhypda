import styles from '../../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import axios from 'axios';

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
    SelectEditorModule,

    // ClipboardModule,
    // ExcelExportModule,
    // ColumnMenuModule,
    // ContextMenuModule,
    CellSelectionModule,

    //   ValidationModule /* Development Only */,
]);

export interface Fracturation {
    id_fracturation: number;
    fracturation_degree: string;
}

export interface Scale {
    id_Scale: number;
    scale_value: string;
    scale_descr?: string | null;
}


interface RockTypeData {
    rt_id: number;
    rt_name: string;
    rt_description: string | null;
    rt_wiki_link: string | null;
    rt_left: number;
    rt_right: number;
    rt_id_parent: number;
    rt_USCS: string | null;
    UID: string | null;
    PARENTUID: string | null;
    rt_status: number;
    status_name: string | null; 
}


// const rockTypeValues = ["- undefined -", "sand", "marl", "basalt"];
// const scaleValues = ["- undefined -", "middle", "large", "low"];
// const fracturationDegreeValues = ["- undefined -", "val 1", "val 2", "val 3"];

const MeasurementSampleTable = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "50vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '13vh' }), []);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState<Scale[]>([]);
    const [fracturation, setFracturation] = useState<Fracturation[]>([]);
    const [rocksData, setRocksData] = useState<RockTypeData[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [envResponse, reviewResponse, rocksResponse] = await Promise.all([
                    axios.get<Fracturation[]>('http://localhost:5000/api/fracturations'),
                    axios.get<Scale[]>('http://localhost:5000/api/scales'),
                    axios.get<RockTypeData[]>('http://localhost:5000/api/rock_type')
                ]);

                if (!envResponse.data || envResponse.data.length === 0) {
                    setError("No environment data received from the server.");
                } else {
                    setFracturation(envResponse.data);
                }

                if (!reviewResponse.data || reviewResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setScale(reviewResponse.data);
                }

                if (!rocksResponse.data || rocksResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setRocksData(rocksResponse.data);
                }

                console.log('Environments:', envResponse.data);
                console.log('Scale:', reviewResponse.data);
                console.log('Rocks:', rocksResponse.data);

            } catch (error: any) {
                setError(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getErrorMessage = (error: any): string => {
        if (error.response) {
            return `HTTP error! status: ${error.response.status}, data: ${error.response.data}`;
        } else if (error.request) {
            return 'Error: No response received from the server.';
        } else {
            return `Error: ${error.message}`;
        }
    };

    const scales = useMemo(() => scale.map(s => s.scale_value), [scale]);
    const fracturations = useMemo(() => fracturation.map(f => f.fracturation_degree), [fracturation]);
    const rocksNames = useMemo(() => rocksData.map(r => r.rt_name), [rocksData]);



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
            cellEditorParams: { values: rocksNames }, 
            valueParser: (params) => {
                if (rocksNames.includes(params.newValue)) {
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
            cellEditorParams: { values: scales }, 
            valueParser: (params) => {
                if (scales.includes(params.newValue)) {
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
            cellEditorParams: { values: fracturations }, 
            valueParser: (params) => {
                if (fracturations.includes(params.newValue)) {
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
    ], [scales, fracturations, rocksNames]);

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



            {loading ? <p>Loading...</p> : error ? <p>{error}</p> : (
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={tableData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    tooltipShowDelay={0}
                    headerHeight={40}
                    cellSelection={cellSelection}
                />
            )}

        </div>
    );
};

export default MeasurementSampleTable;