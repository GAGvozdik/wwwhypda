import type { ColDef } from 'ag-grid-community';
import useRemColumns from '../../commonFeatures/useRemColumns';
import { useSelector } from 'react-redux';
import accountStyles from './accountsStyles.module.scss';
import type { State, DynamicRowData } from '../../../common/types';
import menuStyles from '../../menu.module.scss';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useMemo } from 'react';
// import styles from './accountsStyles.module.scss';
// import styles from '../../inputData/stepper.module.scss';
// import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import { Logout } from '../../../redux/actions';
// import { State } from '../../../common/types';
// import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
// import { PersonOff, Security, DoDisturb } from '@mui/icons-material';
import { useStepsTheme } from '../../inputData/steps';
// import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
// import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// import DoDisturbIcon from '@mui/icons-material/DoDisturb';
// import { Link } from 'react-router-dom';
// import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// import Button from '@mui/material/Button';
import { useModal } from '../../modal/modalContext';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

const UserSuggestions: React.FC = () => {
    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

    const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchMySubmissions();
    }, []);

    const navigate = useNavigate();


    const delMySubmission = async (submissionId: number) => {
        try {
            setIsLoading(true);

            const csrfToken = getCsrfTokenFromCookie();
            if (!csrfToken) {
                setError(messages.csrf_missing);
                return;
            }
            await api.delete(`/input/delete_submission/${submissionId}`, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                    // "X-CSRF-TOKEN": '$ehuufeoihifeohie%^&%^&V*8b$',
                },
            });

            console.log("Submission deleted");
            // Удаляем из таблицы
            setAllSuggestions(prev => prev.filter(item => item.id !== submissionId));

        } catch {
            console.error("Error deleting submission:");
            setError(messages.submission_delete_failed);
        } finally {
            setIsLoading(false);
        }
    };





    const fetchMySubmissions = async () => {
        try {
            setIsLoading(true);
            const response = await api.get("/input/my_submissions", {
            withCredentials: true,
            });

            setAllSuggestions(response.data);

        } catch {
            console.error("Error in my_submissions recieving:");
            setError(messages.suggestions_failed)
            return [];
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleClick = (data: any) => {
        openModal({
            title: messages.read_data_confirm,
            description: messages.read_data_description,
            buttons: [
                {
                    label: messages.read_data_action,
                    onClick: () => {
                        // Очистка старых данных
                        localStorage.removeItem("generalInfoData");
                        localStorage.removeItem("measurementsTableData");
                        localStorage.removeItem("sampleMeasurementTableData");
                        localStorage.removeItem("siteInfoTableData");
                        localStorage.removeItem("sourceTableData");
                        localStorage.removeItem("activeStep");

                        try {
                            // Сохранение новых данных
                            localStorage.setItem("generalInfoData", JSON.stringify(data.generalInfoData));
                            localStorage.setItem("measurementsTableData", JSON.stringify(data.measurementsTableData));
                            localStorage.setItem("sampleMeasurementTableData", JSON.stringify(data.sampleMeasurementTableData));
                            localStorage.setItem("siteInfoTableData", JSON.stringify(data.siteInfoTableData));
                            localStorage.setItem("sourceTableData", JSON.stringify(data.sourceTableData));
                            localStorage.setItem("activeStep", "0");

                            console.log("Данные успешно записаны в localStorage.");
                        } catch {
                            console.error("Ошибка при сохранении в localStorage:");
                        }

                        navigate('/read');
                    }
                },
                {
                    label: messages.cancel,
                    onClick: () => {
                        console.log("Редактирование отменено.");
                    }
                }
            ]
        });
    };


    const { openModal} = useModal();


    const columnDefs = useMemo<ColDef<DynamicRowData>[]>(() => [
        {
            headerName: messages.ui_created_at,
            field: 'created_at',
            sortable: true,
            filter: true,
            flex: 2,
            valueFormatter: (params: any) => {
                return new Date(params.value).toLocaleString(); // Читаемый формат
            },
        },
        {
            headerName: messages.ui_status,
            field: 'status',
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—'; // Показывает статус или тире, если null/undefined
            },
        },

        {
            headerName: messages.column_actions,
            field: 'actions',
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>

                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.ui_delete_your_data}>
                        <IconButton onClick={() => delMySubmission(data.id)}>
                            <DeleteIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.ui_read_your_data}>
                        <IconButton onClick={() => handleClick(data)}>
                            <AutoStoriesIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>

                </div>
            ),

            minWidth: 200,
            maxWidth: 300
        },
    ], [isDarkTheme]);

    const scaledColumns = useRemColumns(columnDefs);
    const themeDarkBlue = useStepsTheme();

    const containerStyle = useMemo(() => ({
        width: "100%",
        maxWidth: "72rem",
        height: "25rem",
        "--ag-background-color": "var(--table-color)",
        marginTop: '0rem',
        marginBottom: '0rem',
        "--ag-font-family": "Afacad_Flux",
        "--ag-font-size": 'var(--tree-font-size)'
    }), []);

    return (
        <div className={accountStyles.accountPage} style={{ color: 'var(--tree-text)', fontSize: 'var(--main-font-size)', fontFamily: 'Afacad_Flux !important'}}>

            <div style={{ margin: '1rem 0' }}>

                <div style={containerStyle}>
                    <SingleSkeleton loading={isLoading} error={error} height={'25rem'}>
                        <AgGridReact
                            defaultColDef={{ wrapHeaderText: true, autoHeaderHeight: true }}
                            theme={themeDarkBlue}
                            rowData={allSuggestions}
                            columnDefs={scaledColumns}
                            pagination={true}
                            paginationPageSize={10}
                            paginationPageSizeSelector={[10, 20, 50, 100]}
                            suppressRowHoverHighlight
                            suppressColumnVirtualisation
                            domLayout="normal"
                        />
                    </SingleSkeleton>

                </div>

            </div>
        </div>
    );
};

export default UserSuggestions;
