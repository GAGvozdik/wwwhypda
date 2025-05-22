import styles from '../menu.module.scss';
import React, { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { useStepsTheme } from '../steps';
import axios from 'axios';
import { State } from '../../../common/types';
import { useSelector } from 'react-redux';
import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';

import {
    ClientSideRowModelModule,
    ColDef,
    ModuleRegistry,
    TextEditorModule,
    SelectEditorModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
    TextEditorModule,
    ClientSideRowModelModule,
    SelectEditorModule
]);

interface Country {
    ISO_code: string;
    country_name: string;
}

interface SiteRow {
    field: string;
    value: string;
    description: string;
}

const defaultRowData: SiteRow[] = [
    { field: "site_name", value: "", description: "the site name" },
    { field: "region", value: "", description: "the region where the measurements are made" },
    { field: "country_name", value: "", description: "the country where the measurements are made" },
    { field: "longitude", value: "", description: "" },
    { field: "latitude", value: "", description: "" }
];


type SiteInfoProps = {
    isEditable: boolean;
};

function  SiteInfo({isEditable= true}: SiteInfoProps) {

    const containerStyle = useMemo(() => ({
        width: "100%",
        height: "50vh",
        "--ag-background-color": "var(--table-color)",
        marginTop: '0vh',
        // fontSize: '26px',  
    }), []);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [countries, setCountries] = useState<Country[]>([]);
    const [tableData, setTableData] = useState<SiteRow[]>(() => {
        const saved = localStorage.getItem("siteInfoTableData");
        try {
            return saved ? JSON.parse(saved) : defaultRowData;
        } catch (e) {
            console.error("Failed to parse localStorage data:", e);
            return defaultRowData;
        }
    });



    useEffect(() => {
        const fetchCountries = async () => {
            const csrfToken = getCsrfTokenFromCookie();

            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }
            try {
                const response = await api.get<Country[]>('/rocks/countries', {
                    withCredentials: true,
                });

                if (!response.data || response.data.length === 0) {
                    setError("No data received from the server.");
                    return;
                }

                setCountries(response.data);
            } catch (error: any) {
                setError(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        fetchCountries();
    }, []);

    useEffect(() => {
        localStorage.setItem("siteInfoTableData", JSON.stringify(tableData));
    }, [tableData]);

    useEffect(() => {
        // Перезагружаем данные из localStorage, если они были удалены
        const saved = localStorage.getItem("siteInfoTableData");
        if (saved) {
            try {
                setTableData(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse localStorage data:", e);
                setTableData(defaultRowData);
            }
        } else {
            setTableData(defaultRowData); // Если нет данных, то используем дефолтные
        }
    }, []);  // Этот useEffect сработает при монтировании компонента

    const getErrorMessage = (error: any): string => {
        if (error.response) {
            return `HTTP error! status: ${error.response.status}, data: ${error.response.data}`;
        } else if (error.request) {
            return 'Error: No response received from the server.';
        } else {
            return `Error: ${error.message}`;
        }
    };

    const countryNames = useMemo(() => countries.map(c => c.country_name), [countries]);

    const columnDefs = useMemo<ColDef[]>(() => [
        { field: "field", editable: false, flex: 1 },
        {
            field: "value",
            editable: isEditable,
            singleClickEdit: true,
            flex: 1,
            
            cellEditorSelector: (params) => {
                return params.data.field === "country_name"
                    ? { component: "agSelectCellEditor", params: { values: countryNames } }
                    : { component: "agTextCellEditor" };
            }
        },
        { field: "description", editable: false, flex: 2, cellStyle: { fontSize: '4vh' }, }
    ], [countryNames]);

    const defaultColDef = useMemo<ColDef>(() => ({
        editable: isEditable,
        flex: 1,
        suppressMenu: true,
        suppressSorting: true,
        headerComponentParams: { suppressHeader: true },
        headerClass: 'custom-header',  // Класс для заголовков
    }), []);

    const themeDarkBlue = useStepsTheme();

    const handleCellValueChanged = (params: any) => {
        const updatedData = tableData.map((row) =>
            row.field === params.data.field ? { ...params.data } : row
        );
        setTableData(updatedData);
    };

const gridOptions = useMemo(() => ({
    defaultColDef: {
        cellStyle: { fontSize: '56px' },  // Устанавливаем размер шрифта для всех ячеек
        headerClass: 'custom-header',     // Класс для заголовков
    }
}), []);
    return (
        <div style={containerStyle}>
            <div style={{
                color: "var(--tree-text)",
                fontSize: '3vh',
                height: '10vh',
                margin: '1vh 0vh 1vh 0vh',
                display: 'flex',
                justifyContent: 'center',
                alignContent: 'center',
                justifyItems: 'center',
                alignItems: 'center',
            }}>
                Site Information
            </div>

            <SingleSkeleton loading={loading} error={error}>
                <AgGridReact
    gridOptions={gridOptions} 
                    theme={themeDarkBlue}
                    rowData={tableData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    headerHeight={0}
                    onCellValueChanged={handleCellValueChanged}
                />
            </SingleSkeleton>
        </div>
    );
};

export default SiteInfo;
