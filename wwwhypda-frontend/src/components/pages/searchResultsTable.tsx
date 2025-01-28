import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import DataTable from './dataTable';
import { generateColumns, DynamicRowData } from '../../common/types'; // Импортируем


const SearchResultsTable: React.FC = () => {
    const rows = useSelector((state: State) => state.currentSearchResult);
    const columns = generateColumns(rows); // Используем функцию для генерации колонок

    return (
        <>
            <DataTable rows={rows as DynamicRowData[]} columns={columns} />
        </>
    );
};

export default SearchResultsTable;