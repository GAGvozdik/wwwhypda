import React, { useMemo } from 'react';
import messages from '../../common/error_messages.json';
import { useSelector } from 'react-redux';
import type { State, DynamicRowData } from '../../common/types';
import { generateColumns } from '../../common/types'; 
import DataTable from './dataTable'; 
// import styles from "./searchStyles.module.scss";

const SearchResultsTable: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
    // Получаем данные из Redux
    const rows = useSelector((state: State) => state.currentTableData);

    // Генерируем колонки динамически на основе данных
    const columns = useMemo(() => generateColumns(rows).map(column => ({ ...column,
        headerName: messages[`search_col_${column.field}` as keyof typeof messages] ?? column.headerName,
    })), [rows]);
    return (
        <>
            <DataTable rows={rows as DynamicRowData[]} columns={columns} loading={loading} />
        </>
    );
};

export default SearchResultsTable;
