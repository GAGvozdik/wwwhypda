import styles from '../../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useStepsTheme } from '../steps';
import axios from 'axios';
import { State } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux'
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import api from '../../api';

import { 
    ClientSideRowModelModule, 
    ColDef, 
    ModuleRegistry, 
    TextEditorModule,
    SelectEditorModule,
    CellSelectionOptions,
} from "ag-grid-community";

// import {
//     CellSelectionModule,
//     ClipboardModule,
//     ColumnMenuModule,
//     ContextMenuModule,
//     ExcelExportModule,
// } from "ag-grid-enterprise";

ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule,
    SelectEditorModule,

    // ClipboardModule,
    // ExcelExportModule,
    // ColumnMenuModule,
    // ContextMenuModule,
    // CellSelectionModule,

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

interface SampleRow {
    id: number;
    smpl_name: string;
    rock_type: string;
    scale: string;
    fracturation_degree: string;
    Sample_comment: string;
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

type MeasurementSampleTableProps = {
    isEditable: boolean;
};


function MeasurementSampleTable({isEditable= true}: MeasurementSampleTableProps) {
    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "44.5vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '17.5vh',
    }), []);    


    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState<Scale[]>([]);
    const [fracturation, setFracturation] = useState<Fracturation[]>([]);
    const [rocksData, setRocksData] = useState<RockTypeData[]>([]);

    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
        return null;
    };


    useEffect(() => {
        const fetchData = async () => {

            
            const csrfToken = getCookie('csrf_access_token');

            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }

            try {
                const [envResponse, reviewResponse, rocksResponse] = await Promise.all([
                    api.get<Fracturation[]>('/api/fracturations', {withCredentials: true}),
                    api.get<Scale[]>('/api/scales', {withCredentials: true}),
                    api.get<RockTypeData[]>('/api/rock_type', {withCredentials: true})
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

                // console.log('Environments:', envResponse.data);
                // console.log('Scale:', reviewResponse.data);
                // console.log('Rocks:', rocksResponse.data);

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

    const [tableData, setTableData] = useState<SampleRow[]>(() => {
        const saved = localStorage.getItem("sampleMeasurementTableData");
        try {
            return saved ? JSON.parse(saved) : [
                { id: 1, smpl_name: "", rock_type: "", scale: "", fracturation_degree: "", Sample_comment: "" },
            ];
        } catch (e) {
            console.error("Error parsing localStorage:", e);
            return [];
        }
    });


    useEffect(() => {
        localStorage.setItem("sampleMeasurementTableData", JSON.stringify(tableData));
    }, [tableData]);

    const handleCellValueChanged = (params: any) => {
        const updatedData = tableData.map((row) =>
            row.id === params.data.id ? { ...params.data } : row
        );
        setTableData(updatedData);
    };

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
            editable: isEditable, 
            flex: 1, 
            singleClickEdit: false 
        },
        { 
            headerName: "rock_type", 
            field: "rock_type", 
            editable: isEditable, 
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
            editable: isEditable, 
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
            editable: isEditable, 
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
            editable: isEditable, 
            flex: 1, 
            singleClickEdit: false 
        }
    ], [scales, fracturations, rocksNames]);

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: isEditable,
            flex: 1,
            suppressMenu: true,
            suppressSorting: true,
        };
    }, []);

    const themeDarkBlue = useStepsTheme();
    
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
                            fontSize: '3vh',
                            height: '10vh',
                            margin: '1vh 0vh 1vh 0vh',
                            display: 'flex',
                            justifyContent: 'center',
                            alignContent: 'center',
                            justifyItems: 'center',
                            alignItems: 'center',
                        }}
                    >
                        Measurement “Sample” (the borehole, the sample, or the borehole section where the measurement was performed)
                    </div>

                    <div style={{display: 'flex'}}>

                        <SingleSkeleton 
                            loading={loading}
                            error={error}
                            margin={'1vh 1vh 1vh 0vh'}
                            width={'10vh'}
                            height={'3.5vh'}
                        >
                            <button
                                disabled={!isEditable}
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
                        </SingleSkeleton>

                        <SingleSkeleton 
                            loading={loading}
                            error={error}
                            margin={'1vh 1vh 1vh 0vh'}
                            width={'10vh'}
                            height={'3.5vh'}
                        >
                            <button
                                disabled={!isEditable}
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
                        </SingleSkeleton>
                    </div>

                    <SingleSkeleton loading={loading} error={error}>
                        <AgGridReact
                            theme={themeDarkBlue}
                            rowData={tableData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            tooltipShowDelay={0}
                            headerHeight={40}
                            cellSelection={cellSelection}
                            onCellValueChanged={handleCellValueChanged}
                        />
                    </SingleSkeleton>

        </div>
    );
};

export default MeasurementSampleTable;