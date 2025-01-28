import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button'; // Импорт кнопки MUI
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { State } from '../../common/types';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx'; // Импорт библиотеки для работы с XLSX
import { useState } from 'react';
import styles from '../menu.module.scss';

interface DataTableProps {
    columns: readonly GridColDef<any>[];
    rows: readonly any[] | undefined;
}

const paginationModel = { page: 0, pageSize: 10 };

const DataTable: React.FC<DataTableProps> = ({ columns, rows }) => {
    let isOpenNow = useSelector((state: State) => state.open);
    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);

    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
            primary: {
                main: '#949494',
            },
            background: {
                default: '#171c22',
                paper: '#171c22',
            },
            text: {
                primary: '#949494',
            },
        },
    });

    const lightTheme = createTheme({
        palette: {
            mode: 'light',
            primary: {
                main: '#436ca1',
            },
            background: {
                default: '#fff2d9',
                paper: '#fff9ef',
            },
            text: {
                primary: '#164077',
            },
        },
    });

    // Функция для экспорта данных в XLSX
    const exportToExcel = () => {
        if (!rows || rows.length === 0) {
            alert('No data for export');
            return;
        }

        // Преобразование readonly массива в изменяемый
        const mutableRows = [...rows];

        const worksheet = XLSX.utils.json_to_sheet(mutableRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
        XLSX.writeFile(workbook, 'table_data.xlsx');
    };


    return (
        <ThemeProvider theme={isDarkTheme ? darkTheme : lightTheme}>
            <Paper
                sx={{
                    margin: '2vh',
                    height: '78vh',
                    width: isOpenNow ? '86vh' : '69vh',
                    transition: '0.5s',
                }}
            >

                <DataGrid
                    rows={rows}
                    columns={columns}
                    initialState={{ pagination: { paginationModel } }}
                    pageSizeOptions={[5, 10]}
                    checkboxSelection
                    sx={{ height: '90%', width: '100%', color: 'var(--tree-text)' }}
                />


            <div
                style={{
                    // width: '30%', 
                    margin: '1vh',   
                    marginTop: '1.5vh',   
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <button 
                    className={styles.submitButton}
                    style={{
                        width: '30%', 
                        // marginBottom: '2vh',   
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}

                    onClick={exportToExcel}
                >
                    Download data
                </button>
            </div>


            </Paper>

        </ThemeProvider>
    );
};

export default DataTable;
