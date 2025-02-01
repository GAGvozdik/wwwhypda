import React from 'react';
import { useSelector } from 'react-redux';
import { State, DynamicRowData } from '../../common/types';
import { generateColumns } from '../../common/types'; 
import DataTable from './dataTable'; 

const SearchResultsTable: React.FC = () => {
    // Получаем данные из Redux
    const rows = useSelector((state: State) => state.currentTableData);

    // Генерируем колонки динамически на основе данных
    const columns = generateColumns(rows);

    return (
        <>
            <DataTable rows={rows as DynamicRowData[]} columns={columns} />
        </>
    );
};

export default SearchResultsTable;
