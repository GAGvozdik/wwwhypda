import styles from '../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import axios from 'axios';
import { State } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import LoadIcon from './loadIcon';

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

const rowData = [
    { field: "env_name", value: "", description: "the hydrogeological environment" },
    { field: "review_level", value: "", description: "the levels of reviews endured by the measurements" }
];

const GeneralInfo = () => {
    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "58vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '5vh',
    }), []);    

    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<Reviews[]>([]);
    const [envs, setEnvs] = useState<Environment[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);  // rowData из localStorage
    const token = useSelector((state: State) => state.token);

    // При загрузке компонента
    useEffect(() => {
        const savedData = localStorage.getItem('generalInfoData');
        if (savedData) {
            setTableData(JSON.parse(savedData));
        } else {
            // Если нет сохранённых данных — берём дефолтные
            setTableData([
                { field: "env_name", value: "", description: "the hydrogeological environment" },
                { field: "review_level", value: "", description: "the levels of reviews endured by the measurements" }
            ]);
        }


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
                const [envResponse, reviewResponse] = await Promise.all([
                    axios.get<Environment[]>('http://localhost:5000/api/environments', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
                    axios.get<Reviews[]>('http://localhost:5000/api/reviews', { withCredentials: true, headers: { "X-CSRF-TOKEN": csrfToken }}),
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
            editable: true, 
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
        editable: true,
        flex: 1,
    }), []);

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({
        fontFamily: "Afacad_Flux !important",
        foregroundColor: isDarkTheme ? "var(--tree-text)" : "var(--border)",
        headerTextColor: "var(--tree-text)",
        rangeSelectionBorderColor: "var(--tree-text)",
        rangeSelectionBackgroundColor: "var(--scrollbar-track-color)",
        columnBorder: { color: isDarkTheme ? '#33383d' : "lightgrey", width: '1px' },
    });

    return (
        <div style={containerStyle}>
            {loading ? 
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '63vh', marginTop: '1vh', marginBottom: '5vh' }}>
                    <LoadIcon size={60}/>
                </div> 
                : error ? <div style={{fontFamily: 'Afacad_Flux', fontSize: "2vh", margin:'1vh'}}>{error}</div> 
                : (
                    <>
                        <div style={{ color: "var(--tree-text)", textAlign: "center", fontSize: '3vh', margin: '1vh 0' }}>
                            General information about measurements
                        </div>
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
                    </>
                )
            }
        </div>
    );
};

export default GeneralInfo;

