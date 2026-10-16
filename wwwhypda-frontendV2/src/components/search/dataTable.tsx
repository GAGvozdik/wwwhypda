import useRemColumns from '../commonFeatures/useRemColumns';
import messages from '../../common/error_messages.json';
import { AgGridReact } from "ag-grid-react";
import type { DynamicRowData } from '../../common/types';
import type { ColDef, GetRowIdParams } from "ag-grid-community";
import * as XLSX from "xlsx";
import React, { useMemo } from "react";
import styles from "./searchStyles.module.scss";
import { useStepsTheme } from '../inputData/steps';

interface DataTableProps {
    rows: DynamicRowData[];
    columns: ColDef[];
}

const getRowId = ({ data }: GetRowIdParams<DynamicRowData>) => String(data.row_id ?? data.id ?? data.id_Measure);

const DataTable: React.FC<DataTableProps> = ({ rows, columns }) => {
    const containerStyle = useMemo(
        () => ({
            width: "100%",
            minHeight: 0,
            fontFamily: "Afacad_Flux",
            "--ag-background-color": "var(--table-color)",
            color: 'var(--tree-text)',
            // color: 'var(--tree-text)',
        "--ag-font-family": "Afacad_Flux",
        "--ag-font-size": 'var(--tree-font-size)'
        }),
        []
    );

    const themeDarkBlue = useStepsTheme();

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
            alert(messages.export_empty);
            return;
        }

        const mutableRows = [...rows];
        const worksheet = XLSX.utils.json_to_sheet(mutableRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, "table_data.xlsx");
    };
    const reversedColumns = useRemColumns(useMemo(() => [...columns].reverse(), [columns]));
    return (
        <div className={styles.resultsContent}>
            {/* Таблица */}
            <div style={containerStyle} className={styles.resultsGrid}>
                <AgGridReact
                    theme={themeDarkBlue}
                    rowData={rows}
                    getRowId={getRowId}
                    overlayNoRowsTemplate={messages.search_empty}
                    columnDefs={reversedColumns}
                    // columnDefs={columns}
                    defaultColDef={{ wrapHeaderText: true, autoHeaderHeight: true, ...defaultColDef }}
                    pagination={true}
                    paginationAutoPageSize={true}
                    paginationPageSizeSelector={false}
                />
            </div>

            {/* Кнопка (размещаем внизу и по центру) */}
            <div className={styles.exportActions}>
                {/* Равномерные отступы блока вместо растягивания на оставшееся место. */}
                {/* // backgroundColor: "#1a1a1a", */}
                <button
                    className={styles.submitButton}
                    onClick={exportToExcel}
                    style={{
                        padding: "0.625rem 1.25rem", // Увеличиваем размер кнопки
                        // fontSize: "20px", // Увеличиваем размер шрифта
                        // borderRadius: "8px", // Закругляем края
                        // backgroundColor: "green",
                        // color: "white",
                        // border: "none",
                        // cursor: "pointer",
                        transition: "0.3s",
                    }}
                >
                    {messages.ui_download_data}
                </button>
            </div>
        </div>
    );
};

export default DataTable;
