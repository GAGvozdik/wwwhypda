import styles from '../menu.module.scss'; 
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { colorSchemeDark, themeQuartz } from "ag-grid-community";
import axios from 'axios';
import { State } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux'

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
    const containerStyle = useMemo(() => ({ width: "100%", height: "58vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '5vh' }), []);    
    
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState<Reviews[]>([]);
    const [envs, setEnvs] = useState<Environment[]>([]);
    const token = useSelector((state: State) => state.token);
    // axios.get<Environment>('http://localhost:5000/api/environments', { headers: { Authorization: `Bearer ${token}`}})

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [envResponse, reviewResponse] = await Promise.all([
                    axios.get<Environment[]>('http://localhost:5000/api/environments', { headers: { Authorization: `Bearer ${token}`}}),
                    axios.get<Reviews[]>('http://localhost:5000/api/reviews', { headers: { Authorization: `Bearer ${token}`}}),
                ]);

                if (!envResponse.data || envResponse.data.length === 0) {
                    setError("No environment data received from the server.");
                } else {
                    setEnvs(envResponse.data);
                }

                if (!reviewResponse.data || reviewResponse.data.length === 0) {
                    setError("No review data received from the server.");
                } else {
                    setReviews(reviewResponse.data);
                }

                console.log('Environments:', envResponse.data);
                console.log('Reviews:', reviewResponse.data);

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

    const reviewLevel = useMemo(() => reviews.map(r => r.review_level), [reviews]);
    const environments = useMemo(() => envs.map(e => e.env_name), [envs]);

    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: "Field", field: "field", editable: false, flex: 1 },
        { 
            field: "value", 
            editable: true, 
            singleClickEdit: true,
            flex: 1,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: (params: any) => {
                if (params.data.field === "env_name") {
                    return { values: environments };
                } else if (params.data.field === "review_level") {
                    return { values: reviewLevel };
                }
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
                    General information about measurements
            </div>

            {loading ? <p>Loading...</p> : error ? <p>{error}</p> : (
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    suppressColumnVirtualisation={true}
                    suppressRowHoverHighlight={true}
                    suppressNoRowsOverlay={true}
                    suppressMenuHide={true}
                    headerHeight={0}
                />
            )}
        </div>
    );
};

export default GeneralInfo;
