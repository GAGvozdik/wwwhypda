import React, { useState, useEffect, useMemo } from 'react';
import styles from './accountsStyles.module.scss';
// import styles from '../../inputData/stepper.module.scss';
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import { useModal } from '../../modal/modalContext';

const UserSuggestions: React.FC = () => {

    const [allSuggestions, setAllSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchMySubmissions();
    }, []);



    const fetchMySubmissions = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get("http://localhost:5000/input/my_submissions", {
            withCredentials: true, 
            });

            console.log("My notes:", response.data);
            setAllSuggestions(response.data);

        } catch (error: any) {
            console.error("Error in my_submissions recieving:", error.response?.data || error.message);
            setError(error.message)
            return [];
        }
        finally {
            setIsLoading(false);
        }
    };

    function getCsrfTokenFromCookie() {
        const csrf = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
        return csrf || '';
    }

    const delMySubmission = async (submissionId: number) => {
        try {
            setIsLoading(true);

            const csrfToken = getCsrfTokenFromCookie();
            if (!csrfToken) {
                setError("CSRF token not found in cookie");
                return;
            }
            const response = await axios.delete(`http://localhost:5000/input/delete_submission/${submissionId}`, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                    // "X-CSRF-TOKEN": '$ehuufeoihifeohie%^&%^&V*8b$',
                },
            });

            console.log("Delete response:", response.data);
            // Удаляем из таблицы
            setAllSuggestions(prev => prev.filter(item => item.id !== submissionId));

        } catch (error: any) {
            console.error("Error deleting submission:", error.response?.data || error.message);
            setError('Error deleting submission');
        } finally {
            setIsLoading(false);
        }
    };


    const handleClick = () => {
        openModal(
            'Are you sure you want to start editing?', // Title
            'All current sample data will be permanently erased!', // Description
            'Go to editing', // Action button text
            () => {
                

                localStorage.removeItem("generalInfoData");
                localStorage.removeItem("measurementsTableData");
                localStorage.removeItem("sampleMeasurementTableData");
                localStorage.removeItem("siteInfoTableData");
                localStorage.removeItem("sourceTableData");
                localStorage.removeItem('activeStep');
            
            }
        );
    };

    const { openModal, closeModal } = useModal();


    const columnDefs = useMemo(() => [
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
            valueGetter: () => 'New', // или вычисление по другим условиям
        },

        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Del request">
                        <IconButton onClick={() => delMySubmission(data.id)}>
                            <DeleteIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit request">
                        <IconButton onClick={handleClick}>
                            <EditIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
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

export default UserSuggestions;
