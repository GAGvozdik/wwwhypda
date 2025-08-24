import React, { useState, useEffect, useMemo } from 'react';
import styles from './../users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../../redux/actions';
import { State, getCsrfTokenFromCookie } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
import { PersonOff, Security, DoDisturb } from '@mui/icons-material';
import { useStepsTheme } from '../../inputData/steps';
import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoDisturbIcon from '@mui/icons-material/DoDisturb';
import { Link } from 'react-router-dom';
import { useModal } from '../../modal/modalContext';
import api from '../../api';

const InputSuggestions: React.FC = () => {

    const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);

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

        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching suggestions data');
        } finally {
            setIsLoading(false);
        }
    };

    const columnDefs = useMemo(() => [
        {
            headerName: 'ID',
            field: 'id',
            sortable: true,
            filter: true,
            flex: 1,
        },
        {
            headerName: 'Name',
            field: 'username',
            sortable: true,
            filter: true,
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—'; 
            },
        },
        {
            headerName: 'Created At',
            field: 'created_at',
            sortable: true,
            filter: true,
            flex: 2,
            valueFormatter: (params: any) => {
                return new Date(params.value).toLocaleString(); // Читаемый формат
            },
        },
        {
            headerName: 'Status',
            field: 'status',
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—'; // Показывает статус или тире, если null/undefined
            },
        },
        {
            headerName: 'Editing By',
            field: 'editing_by',
            flex: 1,
            valueFormatter: (params: any) => {
                return params.value || '—'; // Показывает статус или тире, если null/undefined
            },
        },
        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Submit request">
                        <IconButton onClick={() =>{}}>
                            <CheckCircleOutlineIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Deny request">
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
            headerName: 'Link to view',
            field: 'status',
            flex: 1,
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Tap to view">
                        <div 
                        className={styles.link} 
                        onClick={() => handleClick(data.id)} 
                        role="button" 
                        tabIndex={0} 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleClick(data.id);
                        }}
                        >
                        Tap to view
                        </div>

                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        },
    ], []);


    const themeDarkBlue = useStepsTheme();

    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "50vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '0vh',
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
                } catch (error) {
                    console.error("Error in handleGoToEditing:", error);
                }
            };

            let currentUserData = null;
            try {
                const response = await api.get('/users/', {
                    withCredentials: true,
                });
                currentUserData = response.data.data;
                setUserData(currentUserData);
            } catch (error: any) {
                setError(error.response?.data?.error || 'Error fetching user data');
                console.error("Could not fetch user data, aborting handleClick.", error);
                return; 
            }

            if (!currentUserData) {
                console.error("User data is null after fetch, aborting.");
                return;
            }

            if ((data.editing_by == null) || (data.editing_by == currentUserData.name)){
                console.log('1 condition is true');
                openModal({
                    title: 'Are you sure you want to start editing?',
                    description: 'All current sample data will be permanently erased!',
                    buttons: [
                        {
                            label: 'Go to editing',
                            onClick: handleGoToEditing
                        },
                        {
                            label: 'Cancel',
                            onClick: () => {
                                getSuggestionsData();
                                closeModal();
                            }
                        }
                    ]
                });
            } else if (data.editing_by == 'Completed') {
                console.log('2 condition is true');
                openModal({
                    title: 'Are you sure you want to start reading your data?',
                    description: 'This data set have been checked by one superuser. You can only read this data. All current sample data in add data page will be permanently erased if you go to read!',
                    buttons: [
                        {
                            label: 'Go to reading',
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
                                } catch (e) {
                                    console.error("Ошибка при сохранении в localStorage:", e);
                                }

                                navigate('/read');
                            }
                        },
                        {
                            label: 'Cancel',
                            onClick: () => {
                                console.log("Редактирование отменено.");
                            }
                        }
                    ]
                });

            } else {
                console.log('3 condition is true');
                openModal({
                    title: `You can\'t edit this data! Please wait ...`,
                    description: `This data set is editing by ${data.editing_by}`,
                    buttons: []
                });
            }

        } catch (error) {
            console.error("Ошибка при получении данных:", error);
        }
    };




    return (
        <div style={{ color: 'var(--tree-text)', fontSize: '2vh', fontFamily: 'Afacad_Flux !important'}}>

            <div style={{ margin: '5vh' }}>

                <div style={containerStyle}>
                    <SingleSkeleton loading={isLoading} error={error} height={'50vh'}>
                        <AgGridReact
                            theme={themeDarkBlue}
                            rowData={allSuggestions}
                            columnDefs={columnDefs}
                            pagination={true}
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