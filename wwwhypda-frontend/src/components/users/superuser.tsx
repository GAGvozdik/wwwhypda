import React, { useState, useEffect, useMemo } from 'react';
import styles from '../menu.module.scss'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../redux/actions';
import { State } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
import { PersonOff, Security, SecurityOutlined } from '@mui/icons-material';
import DoDisturbIcon from '@mui/icons-material/DoDisturb';
import { themeQuartz, colorSchemeDark } from 'ag-grid-community';

const SuperiserAccount: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((state: State) => state.token);

    const [userData, setUserData] = useState<any>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (token) {
            fetchUserData();
            fetchAllUsers();
        } else {
            navigate('/login');
        }
    }, [token, navigate]);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/users/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserData(response.data.data);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching user data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/users/get_all_users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllUsers(response.data.data);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching all users');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        dispatch(Logout());
        navigate('/login');
    };

    const performAction = async (url: string, userId: number) => {
        try {
            await axios.post(`http://localhost:5000${url}/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchAllUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const columnDefs = useMemo(() => [
        { headerName: 'ID', field: 'id', sortable: true, filter: true, flex: 1 },
        { headerName: 'Name', field: 'name', sortable: true, filter: true, flex: 1 },
        { headerName: 'Email', field: 'email', sortable: true, filter: true, flex: 2 },
        {
            headerName: 'Active',
            field: 'active',
            cellRenderer: ({ value }: any) => value ? 'Yes' : 'No',
            flex: 1
        },
        {
            headerName: 'Superuser',
            field: 'is_superuser',
            cellRenderer: ({ value }: any) => value ? 'Yes' : 'No',
            flex: 1
        },
        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: ({ data }: any) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip title="Deactivate User">
                        <IconButton onClick={() => performAction('/users/deactivate', data.id)}>
                            <PersonOff sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Activate User">
                        <IconButton onClick={() => performAction('/users/activate', data.id)}>
                            <CheckCircleIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Promote to Superuser">
                        <IconButton onClick={() => performAction('/users', data.id)}>
                            <Security sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Superuser Status">
                        <IconButton onClick={() => performAction('/users/remove-super', data.id)}>
                            <DoDisturbIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        }
    ], [token]);

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({
        fontFamily: 'Afacad_Flux !important',
        foregroundColor: 'var(--tree-text)',
        headerTextColor: 'var(--tree-text)',
        rangeSelectionBorderColor: 'var(--tree-text)',
        rangeSelectionBackgroundColor: 'var(--scrollbar-track-color)',
        columnBorder: { color: '#33383d', width: '1px' },
    });

    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "55vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '0vh',
    }), []);    

    return (
        <div style={{ color: 'var(--tree-text)', fontSize: '2vh', fontFamily: 'Afacad_Flux !important' }}>
            <div className={styles.formTitle} style={{ fontSize: '4.5vh' }}>Super Account</div>
            <div style={{ margin: '5vh' }}>
                {isLoading && <p>Loading...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {userData && (
                    <div style={{ marginBottom: '3vh' }}>
                        <div>Name: {userData.name}</div>
                        <div>Email: {userData.email}</div>
                    </div>
                )}
                <div style={containerStyle}>
                    <AgGridReact
                        theme={themeDarkBlue}
                        rowData={allUsers}
                        columnDefs={columnDefs}
                        pagination={true}
                        suppressRowHoverHighlight
                        suppressColumnVirtualisation
                        domLayout="autoHeight"  // позволяет автоматически подгонять высоту таблицы
                    />
                </div>
            </div>
            <button onClick={handleLogout} className={styles.submitButton} style={{width: '30vh', marginLeft: '40%', marginRight: '40%'}}>Log Out</button>
        </div>
    );
};

export default SuperiserAccount;
