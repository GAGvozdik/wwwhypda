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
// import type { MeasurementRow } from '../../../common/types';
import type { State, SampleMeasurementRow } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux'
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';
// import { UpdateMeasurementsData } from '../../../redux/actions';
import { UpdateSampleMeasurementData } from '../../../redux/actions';
import Button from '@mui/material/Button';

import {
    ClientSideRowModelModule,
    ModuleRegistry,
    TextEditorModule,
    SelectEditorModule,
} from "ag-grid-community";
import type { ColDef } from "ag-grid-community";


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

type MeasurementSampleTableProps = InputStepProps;


const MeasurementSampleTable: React.FC<MeasurementSampleTableProps> = ({isEditable= true, clearAction}) => {
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
    const [scale, setScale] = useState<Scale[]>([]);
    const [fracturation, setFracturation] = useState<Fracturation[]>([]);
    const [rocksData, setRocksData] = useState<RockTypeData[]>([]);

    const dispatch = useDispatch();
    const tableData = useSelector((state: State) => state.sampleMeasurementTableData);
    // const measurementsTableData = useSelector((state: State) => state.measurementsTableData);


    useEffect(() => {
        const fetchData = async () => {


            const csrfToken = getCsrfTokenFromCookie();

            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }

            try {
                const config = { withCredentials: true };

                const [envResponse, reviewResponse, rocksResponse] = await Promise.all([
                    api.get<Fracturation[]>('/rocks/fracturations', config),
                    api.get<Scale[]>('/rocks/scales', config),
                    api.get<RockTypeData[]>('/rocks/rock_type', config)
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

    const handleCellValueChanged = (params: any) => {
        const updatedData = tableData.map((row) =>
            row.id === params.data.id ? { ...params.data } : row
        );
        dispatch(UpdateSampleMeasurementData(updatedData));
    };

    const addRow = () => {
        const newRow: SampleMeasurementRow = {
            id: tableData.length + 1,
            smpl_name: "",
            rock_type: "- undefined -",
            scale: "- undefined -",
            fracturation_degree: "- undefined -",
            Sample_comment: ""
        };
        dispatch(UpdateSampleMeasurementData([...tableData, newRow]));

        // const newMeasurementRow: MeasurementRow = {
        //     id: measurementsTableData.length + 1,
        //     sampleRef: "",
        //     parameter: "",
        //     value: "",
        //     error: "",
        //     units: "",
        //     quality: "",
        //     experimentType: "",
        //     interpretation: "",
        //     comment: ""
        // };
        // dispatch(UpdateMeasurementsData([...measurementsTableData, newMeasurementRow]));
    };

    const deleteRow = () => {
        dispatch(UpdateSampleMeasurementData(tableData.slice(0, -1)));
        // dispatch(UpdateMeasurementsData(measurementsTableData.slice(0, -1)));
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            headerName: messages.ui_id,
            field: "id",
            editable: false,
            flex: 0.5,
            singleClickEdit: false
        },
        {
            headerName: messages.ui_smpl_name,
            field: "smpl_name",
            editable: isEditable,
            flex: 1,
            singleClickEdit: false
        },
        {
            headerName: messages.ui_rock_type,
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
            headerName: messages.ui_scale,
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
            headerName: messages.ui_fracturation_degree,
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
            headerName: messages.ui_sample_comment,
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

    const scaledColumns = useRemColumns(columnDefs);
    const themeDarkBlue = useStepsTheme();


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
                        disabled={!isEditable || loading || Boolean(error)}
                        onClick={deleteRow}
                        className={`${styles.submitButton} ${styles.rowActionButton}`}
                    >
                        {messages.ui_delete_row}
                    </Button>
                </SingleSkeleton>
            </StepActions>

            <div className={styles.tableArea}>
                <SingleSkeleton loading={loading} error={error}>
                    <AgGridReact
                        theme={themeDarkBlue}
                        rowData={tableData}
                        columnDefs={scaledColumns}
                        defaultColDef={{ wrapHeaderText: true, autoHeaderHeight: true, ...defaultColDef }}
                        tooltipShowDelay={0}


                        onCellValueChanged={handleCellValueChanged}
                    />
                </SingleSkeleton>
            </div>

        </div>
    );
};

export default MeasurementSampleTable;