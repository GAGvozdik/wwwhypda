import React, { useState, useEffect, useMemo } from 'react';
import styles from './../users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../../redux/actions';
import { State } from '../../../common/types';
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

    useEffect(() => {
        getSuggestionsData();
    }, []);

    const getSuggestionsData = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('http://localhost:5000/input/get_input_suggestions', {
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
            const response = await api.get(`http://localhost:5000/input/get_input_by_id/${id}`, {
                withCredentials: true
            });
            const data = response.data;

            openModal(
                'Are you sure you want to start editing?',
                'All current sample data will be permanently erased!',
                'Go to editing',
                () => {
                    localStorage.removeItem("generalInfoData");
                    localStorage.removeItem("measurementsTableData");
                    localStorage.removeItem("sampleMeasurementTableData");
                    localStorage.removeItem("siteInfoTableData");
                    localStorage.removeItem("sourceTableData");
                    localStorage.removeItem('activeStep');

                    try {
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

                    navigate('/input');
                }
            );

        } catch (err) {
            console.error("Ошибка при получении полной структуры input по id:", err);
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
