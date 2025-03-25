import styles from '../menu.module.scss'; 
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

const rowData = [
    { field: "site_name", value: "", description: "the site name" },
    { field: "region", value: "", description: "the region where the measurements are made" },
    { field: "country_name", value: "", description: "the country where the measurements are made" },
    { field: "longitude", value: "", description: "" },
    { field: "latitude", value: "", description: "" }
];

const SiteInfo = () => {
    const containerStyle = useMemo(() => ({ width: "100%", height: "58vh", "--ag-background-color": "#22282e", marginTop: '0vh', marginBottom: '5vh' }), []);

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [countries, setCountries] = useState<Country[]>([]);

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await axios.get<Country[]>('http://localhost:5000/api/countries'); 

                if (!response.data || response.data.length === 0) {
                    setError("No data received from the server.");
                    return;
                }

                setCountries(response.data);
                console.log(response.data);

            } catch (error: any) {
                setError(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };
        fetchCountries();
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

    const countryNames = useMemo(() => countries.map(c => c.country_name), [countries]);

    const columnDefs = useMemo<ColDef[]>(() => [
        { field: "field", editable: false, flex: 1 },
        { 
            field: "value", 
            editable: true, 
            singleClickEdit: true,
            flex: 1,
            cellEditorSelector: (params) => {
                return params.data.field === "country_name"
                    ? { component: "agSelectCellEditor", params: { values: countryNames } }
                    : { component: "agTextCellEditor" };
            }
        },
        { field: "description", editable: false, flex: 2 }
    ], [countryNames]); // Добавляем зависимость от countryNames

    const defaultColDef = useMemo<ColDef>(() => {
        return {
            editable: true,
            flex: 1,
            suppressMenu: true,
            suppressSorting: true,
            headerComponentParams: { suppressHeader: true }
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
    
    return (
        <div style={containerStyle}>
            <div 
                style={{ 
                    color: "var(--tree-text)", 
                    textAlign: "center", 
                    fontSize: '3vh', 
                    margin: '1vh 0vh 1vh 0vh' 
                }}>
                    Site Information
                </div>
            {loading ? <p>Loading...</p> : error ? <p>{error}</p> : (
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    headerHeight={0}
                />
            )}
        </div>
    );
};

export default SiteInfo;
