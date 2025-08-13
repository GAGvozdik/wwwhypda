import styles from '../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import axios from 'axios';
import { useStepsTheme } from '../steps';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';

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

interface Reviews {
    id_Review: number;
    review_level: string;
}

interface Environment {
    PARENTUID: string | null;
    UID: string | null;
    env_Status: number;
    env_description: string;
    env_id: number;
    env_id_parent: number;
    env_name: string;
    env_wiki_link: string | null;
}

type GeneralInfoProps = {
    isEditable: boolean;
};

function GeneralInfo({isEditable=true}: GeneralInfoProps) {
    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "50vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '5vh',
    }), []);    

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<Reviews[]>([]);
    const [envs, setEnvs] = useState<Environment[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);  // rowData из localStorage

    // При загрузке компонента
    useEffect(() => {
        
        const savedData = localStorage.getItem('generalInfoData');
        if (savedData && JSON.parse(savedData).length > 0) {
            setTableData(JSON.parse(savedData));
        } else {
            // Если нет сохранённых данных — берём дефолтные
            setTableData([
                { field: "env_name", value: "", description: "the hydrogeological environment" },
                { field: "review_level", value: "", description: "the levels of reviews endured by the measurements" }
            ]);
        }

        console.log(tableData);



        const fetchData = async () => {
            const csrfToken = getCsrfTokenFromCookie();
            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }

            try {
                const [envResponse, reviewResponse] = await Promise.all([
                    api.get<Environment[]>('rocks/environments', { withCredentials: true }),
                    api.get<Reviews[]>('/rocks/reviews', { withCredentials: true }),
                ]);

                if (!envResponse.data.length) setError("No environment data received from the server.");
                else setEnvs(envResponse.data);

                if (!reviewResponse.data.length) setError("No review data received from the server.");
                else setReviews(reviewResponse.data);

            } catch (error: any) {
                setError(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getErrorMessage = (error: any): string => {
        if (error.response) return `HTTP error! status: ${error.response.status}, data: ${error.response.data}`;
        if (error.request) return 'Error: No response received from the server.';
        return `Error: ${error.message}`;
    };

    const reviewLevel = useMemo(() => reviews.map(r => r.review_level), [reviews]);
    const environments = useMemo(() => envs.map(e => e.env_name), [envs]);

    // Обработка изменения ячеек
    const handleCellValueChanged = (event: any) => {
        const updatedRowData = [...tableData];
        const rowIndex = updatedRowData.findIndex(row => row.field === event.data.field);
        if (rowIndex !== -1) {
            updatedRowData[rowIndex].value = event.newValue;
            setTableData(updatedRowData);
            localStorage.setItem('generalInfoData', JSON.stringify(updatedRowData));  // Сохраняем в localStorage
        }
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: "Field", field: "field", editable: false, flex: 1 },
        { 
            field: "value", 
            editable: isEditable, 
            singleClickEdit: true,
            flex: 1,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: (params: any) => {
                if (params.data.field === "env_name") return { values: environments };
                if (params.data.field === "review_level") return { values: reviewLevel };
                return { values: [] };
            }
        },
        { headerName: "Description", field: "description", editable: false, flex: 2 }
    ], [environments, reviewLevel]);

    const defaultColDef = useMemo<ColDef>(() => ({
        editable: isEditable,
        flex: 1,
    }), []);

    const themeDarkBlue = useStepsTheme();

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
                General information about measurements
            </div>

            <SingleSkeleton loading={loading} error={error} height={'50vh'}>
                <div style={{height: '50vh'}}>
                    <AgGridReact
                        theme={themeDarkBlue}
                        rowData={tableData}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onCellValueChanged={handleCellValueChanged}
                        suppressColumnVirtualisation={true}
                        suppressRowHoverHighlight={true}
                        suppressNoRowsOverlay={true}
                        suppressMenuHide={true}
                        headerHeight={0}
                    />
                </div>                
            </SingleSkeleton>
        </div>
    );
};

export default GeneralInfo;

