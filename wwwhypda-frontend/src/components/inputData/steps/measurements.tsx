import styles from '../../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useStepsTheme } from '../steps';
import axios from 'axios';
import { State } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux'
import SingleSkeleton from '../../commonFeatures/singleSkeleton';

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
    // ClipboardModule,
    // ColumnMenuModule,
    // ContextMenuModule,
    // ExcelExportModule,
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

interface Parameter {
  id_Parameter: number;
  code: string;
  param_name: string;
  units: string;
  html_code: string;
  html_units: string;
  MaxValue: number;
  MinValue: number;
}


interface Quality {
    id_Quality: number;
    quality_level: string;
}

interface ExperimentType {
    id_Exp_type: number;
    exp_name: string;
    exp_description: string;
    exp_status: number;
}

interface InterpretationMethod {
    id_Int_meth: number;
    int_meth_name: string;
    int_meth_desc: string;
    id_Exp_ty: number;
    int_meth_status: number;
}

interface MeasurementRow {
    id: number;
    sampleRef: string;
    parameter: string;
    value: string;
    error: string;
    units: string;
    quality: string;
    experimentType: string;
    interpretation: string;
    comment: string;
}

export default function Measurements() {
    const containerStyle = useMemo(() => ({ width: "100%", height: "50vh", "--ag-background-color": "var(--table-color)", marginTop: '0vh', marginBottom: '13vh' }), []);
    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [quality, setQuality] = useState<Quality[]>([]);
    const [experimentType, setExperimentType] = useState<ExperimentType[]>([]);
    const [interpretationMethod, setInterpretationMethod] = useState<InterpretationMethod[]>([]);
    
    // При загрузке компонента
    useEffect(() => {

    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
        return null;
    };


        const fetchData = async () => {

            const csrfToken = getCookie('csrf_access_token');

            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }

            try {
                const [parameterResponse, qualityResponse, experimentTypeResponse, metodResponse] = await Promise.all([
                    axios.get<Parameter[]>('http://localhost:5000/api/parameters', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
                    axios.get<Quality[]>('http://localhost:5000/api/qualities', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
                    axios.get<ExperimentType[]>('http://localhost:5000/api/experiment_types', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
                    axios.get<InterpretationMethod[]>('http://localhost:5000/api/interpretation_methods', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
                ]);

                if (!parameterResponse.data || parameterResponse.data.length === 0) {
                    setError("No environment data received from the server.");
                } else {
                    setParameters(parameterResponse.data);
                }

                if (!qualityResponse.data || qualityResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setQuality(qualityResponse.data);
                }

                if (!experimentTypeResponse.data || experimentTypeResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setExperimentType(experimentTypeResponse.data);
                }

                if (!metodResponse.data || metodResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setInterpretationMethod(metodResponse.data);
                }

                console.log('parameterResponse:', parameterResponse.data);
                console.log('qualityResponse:', qualityResponse.data);
                console.log('experimentTypeResponse:', experimentTypeResponse.data);
                console.log('metodResponse:', metodResponse.data);

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
    
    const parameterNames = useMemo(() => parameters.map(s => s.param_name), [parameters]);
    const qualityNames = useMemo(() => quality.map(s => s.quality_level), [quality]);
    const experimentTypeNames = useMemo(() => experimentType.map(s => s.exp_name), [experimentType]);
    const interpretationMethodNames = useMemo(() => interpretationMethod.map(s => s.int_meth_name), [interpretationMethod]);

    const [tableData, setTableData] = useState<MeasurementRow[]>(() => {
        const saved = localStorage.getItem("measurementsTableData");
        try {
            return saved ? JSON.parse(saved) : [
                { id: 1, sampleRef: "", parameter: "", value: "", error: "", units: "", quality: "", experimentType: "", interpretation: "", comment: "" },
                { id: 2, sampleRef: "", parameter: "", value: "", error: "", units: "", quality: "", experimentType: "", interpretation: "", comment: "" },
                { id: 3, sampleRef: "", parameter: "", value: "", error: "", units: "", quality: "", experimentType: "", interpretation: "", comment: "" }
            ];
        } catch (e) {
            console.error("Ошибка при парсинге localStorage:", e);
            return [];
        }
    });


    const addRow = () => {
        setTableData((prev) => [...prev, {
            id: prev.length + 1,
            sampleRef: "", parameter: "", value: "", error: "", units: "", quality: "", experimentType: "", interpretation: "", comment: ""
        }]);
    };

    const deleteRow = () => {
        setTableData((prev) => prev.slice(0, -1));
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: "The reference to the Sample", field: "sampleRef", editable: true, flex: 1 },
        { 
            headerName: "The measured parameter", field: "parameter", editable: true, flex: 1, 
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: parameterNames },
            valueSetter: (params) => parameterNames.includes(params.newValue) ? (params.data.parameter = params.newValue) : false
        },
        { headerName: "The measurement value", field: "value", editable: true, flex: 1 },
        { headerName: "The error", field: "error", editable: true, flex: 1 },
        { headerName: "The parameter units", field: "units", editable: true, flex: 1 },
        { 
            headerName: "Quality", field: "quality", editable: true, flex: 1, 
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: qualityNames },
            valueSetter: (params) => qualityNames.includes(params.newValue) ? (params.data.quality = params.newValue) : false
        },
        { 
            headerName: "The Experimentation type conducted", field: "experimentType", editable: true, flex: 1, 
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: experimentTypeNames },
            valueSetter: (params) => experimentTypeNames.includes(params.newValue) ? (params.data.experimentType = params.newValue) : false
        },
        { 
            headerName: "The interpretation of the Experiment_type adopted", field: "interpretation", editable: true, flex: 1, 
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: interpretationMethodNames },
            valueSetter: (params) => interpretationMethodNames.includes(params.newValue) ? (params.data.interpretation = params.newValue) : false
        },
        { headerName: "Comment", field: "comment", editable: true, flex: 1 }
    ], [parameterNames, qualityNames, experimentTypeNames, interpretationMethodNames]);


    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: true,
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

    useEffect(() => {
        const savedTableData = localStorage.getItem("measurementsTableData");
        if (savedTableData) {
            try {
                setTableData(JSON.parse(savedTableData));
            } catch (e) {
                console.error("Ошибка при разборе сохранённых данных:", e);
            }
        }
    }, []);

    useEffect(() => {
            localStorage.setItem("measurementsTableData", JSON.stringify(tableData));
        }, [tableData]);

        const handleCellValueChanged = (event: any) => {
        const updatedData = [...tableData];
        const rowIndex = updatedData.findIndex(row => row.id === event.data.id);
        if (rowIndex !== -1) {
            updatedData[rowIndex] = { ...event.data };
            setTableData(updatedData);
        }
    };


    return (
        <div style={containerStyle}>
            <div 
                style={{ 
                    color: "var(--tree-text)", 
                    display: 'grid',
                    alignContent: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5vh', 
                    margin: '1vh 0vh 1vh 0vh',
                    height: '6.71vh'
                }}
            >
                Measurements
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

            <SingleSkeleton loading={loading} error={error} height={'50vh'}>
                <div style={{height: '50vh'}}>
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
                </div>
            </SingleSkeleton>

        </div>
    );
};








