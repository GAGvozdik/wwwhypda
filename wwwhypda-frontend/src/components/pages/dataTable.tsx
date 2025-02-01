import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import * as XLSX from "xlsx";
import React, { useMemo } from "react";
import styles from "./dataTable.module.scss";
import {
    colorSchemeDark,
    themeQuartz,
} from "ag-grid-community";

interface DataTableProps {
    rows: any[];
    columns: ColDef[];
}

const DataTable: React.FC<DataTableProps> = ({ rows, columns }) => {
    const containerStyle = useMemo(
        () => ({
            width: "100%",
            height: "90%",
            fontFamily: "Afacad_Flux !important",
            "--ag-background-color": "#22282e",
        }),
        []
    );

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({
        fontFamily: "Afacad_Flux !important",
    });

    const defaultColDef = useMemo<ColDef>(
        () => ({
            sortable: true,
            filter: true,
            resizable: true,
            editable: false,
        }),
        []
    );

    // Функция экспорта данных в XLSX
    const exportToExcel = () => {
        if (!rows || rows.length === 0) {
            alert("No data for export");
            return;
        }

        const mutableRows = [...rows];
        const worksheet = XLSX.utils.json_to_sheet(mutableRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, "table_data.xlsx");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Таблица */}
            <div style={containerStyle}>
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={rows}
                    columnDefs={columns}
                    defaultColDef={defaultColDef}
                    pagination={true}
                    paginationPageSize={10}
                />
            </div>

            {/* Кнопка (размещаем внизу и по центру) */}
            <div
                style={{
                    flexGrow: 1, // Растягиваем блок, чтобы он занял оставшееся место
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    // backgroundColor: "#1a1a1a",
                }}
            >
                <button
                    className={styles.submitButton}
                    onClick={exportToExcel}
                    style={{
                        padding: "10px 20px", // Увеличиваем размер кнопки
                        // fontSize: "20px", // Увеличиваем размер шрифта
                        // borderRadius: "8px", // Закругляем края
                        // backgroundColor: "green",
                        // color: "white",
                        // border: "none",
                        // cursor: "pointer",
                        transition: "0.3s",
                    }}
                >
                    Download data
                </button>
            </div>
        </div>
    );
};

export default DataTable;
