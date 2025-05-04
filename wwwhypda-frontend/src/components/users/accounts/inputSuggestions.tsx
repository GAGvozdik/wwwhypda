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
            const response = await axios.get('http://localhost:5000/input/get_input_suggestions', {
                withCredentials: true,
            });
            setAllSuggestions(response.data.data);
            console.log(allSuggestions);

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
            headerName: 'User ID',
            field: 'user_id',
            sortable: true,
            filter: true,
            flex: 1,
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
            valueGetter: () => 'New', // или вычисление по другим условиям
        },
        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Deny request">
                        <IconButton onClick={() =>{}}>
                            <CheckCircleOutlineIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Submit request">
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
            cellRenderer: () => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Tap to view">
                        <Link to="/input" className={styles.link}>
                            Tap to view
                        </Link>
                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        },
    ], []);


    const handleViewRequest = (rowData: any) => {
        console.log('Просмотр записи:', rowData);
        // Или переход: navigate(`/admin/view/${rowData.id}`)
    };


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

export default InputSuggestions;
