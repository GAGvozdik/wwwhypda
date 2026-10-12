import type { ColDef } from 'ag-grid-community';
import useRemColumns from '../../commonFeatures/useRemColumns';
import { useSelector } from 'react-redux';
import accountStyles from './accountsStyles.module.scss';
import type { State, DynamicRowData } from '../../../common/types';
import menuStyles from '../../menu.module.scss';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useMemo } from 'react';
import styles from './../users.module.scss';
// import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import { Logout } from '../../../redux/actions';
import { getCsrfTokenFromCookie } from '../../../common/types';
// import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
// import { PersonOff, Security, DoDisturb } from '@mui/icons-material';
import { useStepsTheme } from '../../inputData/steps';
// import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoDisturbIcon from '@mui/icons-material/DoDisturb';
// import { Link } from 'react-router-dom';
import { useModal } from '../../modal/modalContext';
import api from '../../api';

const InputSuggestions: React.FC = () => {
    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

    const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        getSuggestionsData();
    }, []);

    const getSuggestionsData = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/input/get_input_suggestions', {
                withCredentials: true,
            });
            setAllSuggestions(response.data.data);

        } catch {
            setError(messages.suggestions_failed);
        } finally {
            setIsLoading(false);
        }
    };

    const columnDefs = useMemo<ColDef<DynamicRowData>[]>(() => [
        {
            headerName: messages.column_id,
            field: 'id',
            sortable: true,
            filter: true,
            flex: 1,
        },
        {
            headerName: messages.account_name,
            field: 'username',
            sortable: true,
            filter: true,
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—';
            },
        },
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
            headerName: messages.ui_editing_by,
            field: 'editing_by',
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—'; // Показывает статус или тире, если null/undefined
            },
        },
        {
            headerName: messages.column_actions,
            field: 'actions',
            cellRenderer: ({ }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.ui_submit_request}>
                        <IconButton onClick={() =>{}}>
                            <CheckCircleOutlineIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.ui_deny_request}>
                        <IconButton onClick={() => {}}>
                            <DoDisturbIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        },
        {
            headerName: messages.ui_link_to_view,
            field: 'status',
            flex: 1,
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.ui_tap_to_view}>
                        <div
                        className={styles.link}
                        onClick={() => handleClick(data.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleClick(data.id);
                        }}
                        >
                        {messages.ui_tap_to_view}
                        </div>

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


    const { openModal, closeModal } = useModal();
    const navigate = useNavigate();

    const handleClick = async (id: number) => {
        try {
            const response = await api.get(`/input/get_input_by_id/${id}`, {
                withCredentials: true
            });
            const data = response.data;


            const handleGoToEditing = async () => {
                try {
                    await api.post(`/input/in_editing/${id}`, {}, {
                        headers: {
                            'X-CSRF-TOKEN': getCsrfTokenFromCookie()
                        },
                        withCredentials: true
                    });
                    localStorage.removeItem("generalInfoData");
                    localStorage.removeItem("measurementsTableData");
                    localStorage.removeItem("sampleMeasurementTableData");
                    localStorage.removeItem("siteInfoTableData");
                    localStorage.removeItem("sourceTableData");
                    localStorage.removeItem('activeStep');

                    localStorage.setItem("generalInfoData", JSON.stringify(data.generalInfoData));
                    localStorage.setItem("measurementsTableData", JSON.stringify(data.measurementsTableData));
                    localStorage.setItem("sampleMeasurementTableData", JSON.stringify(data.sampleMeasurementTableData));
                    localStorage.setItem("siteInfoTableData", JSON.stringify(data.siteInfoTableData));
                    localStorage.setItem("sourceTableData", JSON.stringify(data.sourceTableData));
                    localStorage.setItem("activeStep", "0");
                    localStorage.setItem("submissionId", String(id));

                    navigate(`/edit`);
                    closeModal();
                    getSuggestionsData();
                } catch {
                    console.error("Error in handleGoToEditing:");
                }
            };

            let currentUserData = null;
            try {
                const response = await api.get('/users/', {
                    withCredentials: true,
                });
                currentUserData = response.data.data;
                // setUserData(currentUserData);
            } catch {
                setError(messages.account_fetch_failed);
                console.error("Could not fetch user data, aborting handleClick.");
                return;
            }

            if (!currentUserData) {
                console.error("User data is null after fetch, aborting.");
                return;
            }


            if (data.status == 'Completed') {
                console.log('2 condition is true');
                openModal({
                    title: messages.read_data_confirm,
                    description: messages.read_checked_description,
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

            } else if ((data.editing_by == null) || (data.editing_by == currentUserData.name)){
                console.log('1 condition is true');
                openModal({
                    title: messages.edit_data_confirm,
                    description: messages.edit_data_description,
                    buttons: [
                        {
                            label: messages.edit_data_action,
                            onClick: handleGoToEditing
                        },
                        {
                            label: messages.cancel,
                            onClick: () => {
                                getSuggestionsData();
                                closeModal();
                            }
                        }
                    ]
                });


            } else {
                console.log('3 condition is true');
                openModal({
                    title: messages.edit_data_unavailable,
                    description: messages.edit_data_owner.replace('{name}', data.editing_by || ''),
                    buttons: [
                        {
                            label: messages.cancel,
                            onClick: () => {
                                console.log("Редактирование отменено.");
                            }
                        }
                    ]
                });
            }

        } catch {
            console.error("Ошибка при получении данных:");
        }
    };




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

export default InputSuggestions;