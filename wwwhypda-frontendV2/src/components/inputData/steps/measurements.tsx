import useRemColumns from '../../commonFeatures/useRemColumns';
import StepActions from '../stepActions';
import type { InputStepProps } from '../../../common/types';
import messages from '../../../common/error_messages.json';
// import styles from '../../menu.module.scss';
import styles from '../stepper.module.scss';
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useStepsTheme } from '../steps';
// import axios from 'axios';
// import type { SampleMeasurementRow } from '../../../common/types';
import type { State, MeasurementRow } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux'
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';
import { UpdateMeasurementsData } from '../../../redux/actions';
// import { UpdateSampleMeasurementData } from '../../../redux/actions';
import Button from '@mui/material/Button';
import {
    ClientSideRowModelModule,
    ModuleRegistry,
    TextEditorModule,
    SelectEditorModule,
} from "ag-grid-community";
// import { Tune } from '@mui/icons-material';
import type { ColDef } from "ag-grid-community";




ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule,
    SelectEditorModule,
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

type MeasurementsProps = InputStepProps;

const Measurements: React.FC<MeasurementsProps> = ({isEditable= true, clearAction}) => {
    const containerStyle = useMemo(() => ({
        width: "100%",
        maxWidth: "72rem",
        "--ag-background-color": "var(--table-color)",
        marginTop: '0rem',
        marginBottom: '0rem',
        "--ag-font-family": "Afacad_Flux",
        "--ag-font-size": 'var(--tree-font-size)'
    }), []);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [parameters, setParameters] = useState<Parameter[]>([]);
    const [quality, setQuality] = useState<Quality[]>([]);
    const [experimentType, setExperimentType] = useState<ExperimentType[]>([]);
    const [interpretationMethod, setInterpretationMethod] = useState<InterpretationMethod[]>([]);

    const dispatch = useDispatch();
    const tableData = useSelector((state: State) => state.measurementsTableData);
    const sampleMeasurementTableData = useSelector((state: State) => state.sampleMeasurementTableData);

    // При загрузке компонента
    useEffect(() => {


        const fetchData = async () => {

            const csrfToken = getCsrfTokenFromCookie();

            if (!csrfToken) {
                setError("Something went wrong. Please refresh the page and try again.");
                return;
            }

            try {
                const config = { withCredentials: true };

                const [parameterResponse, qualityResponse, experimentTypeResponse, metodResponse] = await Promise.all([
                    api.get<Parameter[]>('/rocks/parameters', config),
                    api.get<Quality[]>('/rocks/qualities', config),
                    api.get<ExperimentType[]>('/rocks/experiment_types', config),
                    api.get<InterpretationMethod[]>('/rocks/interpretation_methods', config),
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

    const addRow = () => {
        const newRow: MeasurementRow = {
            id: tableData.length + 1,
            sampleRef: "", parameter: "", value: "", error: "", units: "", quality: "", experimentType: "", interpretation: "", comment: ""
        };
        dispatch(UpdateMeasurementsData([...tableData, newRow]));

        // const newSampleRow: SampleMeasurementRow = {
        //     id: sampleMeasurementTableData.length + 1,
        //     smpl_name: "",
        //     rock_type: "- undefined -",
        //     scale: "- undefined -",
        //     fracturation_degree: "- undefined -",
        //     Sample_comment: ""
        // };
        // dispatch(UpdateSampleMeasurementData([...sampleMeasurementTableData, newSampleRow]));
    };

    const deleteRow = () => {
        dispatch(UpdateMeasurementsData(tableData.slice(0, -1)));
        // dispatch(UpdateSampleMeasurementData(sampleMeasurementTableData.slice(0, -1)));
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: messages.ui_the_reference_to_the_sample, field: "sampleRef", editable: isEditable, flex: 1 },
        {
            headerName: messages.ui_the_measured_parameter, field: "parameter", editable: isEditable, flex: 1,
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: parameterNames },
            valueSetter: (params) => parameterNames.includes(params.newValue) ? (params.data.parameter = params.newValue) : false
        },
        { headerName: messages.ui_the_measurement_value, field: "value", editable: isEditable, flex: 1 },
        { headerName: messages.ui_the_error, field: "error", editable: isEditable, flex: 1 },
        {
            headerName: messages.ui_quality, field: "quality", editable: isEditable, flex: 1,
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: qualityNames },
            valueSetter: (params) => qualityNames.includes(params.newValue) ? (params.data.quality = params.newValue) : false
        },
        {
            headerName: messages.ui_the_experimentation_type_conducted, field: "experimentType", editable: isEditable, flex: 1,
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: experimentTypeNames },
            valueSetter: (params) => experimentTypeNames.includes(params.newValue) ? (params.data.experimentType = params.newValue) : false
        },
        {
            headerName: messages.ui_the_interpretation_of_the_experiment_type_adopted, field: "interpretation", editable: isEditable, flex: 1,
            cellEditor: "agSelectCellEditor", cellEditorParams: { values: interpretationMethodNames },
            valueSetter: (params) => interpretationMethodNames.includes(params.newValue) ? (params.data.interpretation = params.newValue) : false
        },
        { headerName: messages.ui_comment, field: "comment", editable: isEditable, flex: 1 }
    ], [parameterNames, qualityNames, experimentTypeNames, interpretationMethodNames]);


    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: isEditable,
            flex: 1,
            suppressMenu: true,
            suppressSorting: true,
        };
    }, []);

    const scaledColumns = useRemColumns(columnDefs);
    const themeDarkBlue = useStepsTheme();


        const handleCellValueChanged = (event: any) => {
        const updatedData = [...tableData];
        const rowIndex = updatedData.findIndex(row => row.id === event.data.id);
        if (rowIndex !== -1) {
            updatedData[rowIndex] = { ...event.data };
            dispatch(UpdateMeasurementsData(updatedData));
        }
    };


    return (
        <div style={containerStyle} className={styles.measurementGrid}>


            <StepActions clearAction={clearAction}>

                <SingleSkeleton
                    loading={loading}
                    margin={'0'}
                    width={'7.5rem'}
                    height={'2.5rem'}
                >
                    <Button
                        onClick={addRow}
                        className={`${styles.submitButton} ${styles.rowActionButton}`}
                        disabled={!isEditable || loading || Boolean(error)}
                    >
                        {messages.ui_add_row}
                    </Button>
                </SingleSkeleton>

                <SingleSkeleton
                    loading={loading}
                    margin={'0'}
                    width={'7.5rem'}
                    height={'2.5rem'}
                >
                    <Button
                        disabled={loading || Boolean(error) || !isEditable || tableData.length <= sampleMeasurementTableData.length}
                        // disabled={!isEditable == true ? false : (tableData.length > sampleMeasurementTableData.length) ? tableData.length == 0 ? false : true : false }
                        onClick={deleteRow}
                        className={`${styles.submitButton} ${styles.rowActionButton}`}
                    >
                        {messages.ui_delete_row}
                    </Button>
                </SingleSkeleton>
            </StepActions>

            <div className={styles.tableArea}>
                <SingleSkeleton loading={loading} error={error}>
                    {/* <div style={{height: '50vh'}}> */}
                        <AgGridReact
                            theme={themeDarkBlue}
                            rowData={tableData}
                            columnDefs={scaledColumns}
                            defaultColDef={{ wrapHeaderText: true, autoHeaderHeight: true, ...defaultColDef }}
                            tooltipShowDelay={0}


                            onCellValueChanged={handleCellValueChanged}
                        />
                    {/* </div> */}
                </SingleSkeleton>
            </div>

        </div>
    );
};

export default Measurements;