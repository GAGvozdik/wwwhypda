import React, { useState, useEffect, useMemo } from 'react';
import styles from '../../menu.module.scss'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../../redux/actions';
import { State } from '../../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
import { PersonOff, Security, DoDisturb } from '@mui/icons-material';
import { themeQuartz, colorSchemeDark } from 'ag-grid-community';

const SuperuserAccount: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

    const [userData, setUserData] = useState<any>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Чтение cookie по имени
    const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
        return null;
    };

    useEffect(() => {
        fetchUserData();
        fetchAllUsers();
    }, []);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/users/', {
                withCredentials: true,
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
            const response = await axios.get('http://localhost:5000/admin/get_all_users', {
                withCredentials: true,
            });
            setAllUsers(response.data.data);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching all users');
        }
    };

    const handleLogout = () => {
        dispatch(Logout());
        navigate('/login');
    };

    const performAction = async (url: string, userId: number) => {
        const csrfToken = getCookie('csrf_access_token');
        if (!csrfToken) {
            setError("CSRF token not found in cookie");
            return;
        }

        try {
            await axios.post(`http://localhost:5000${url}/${userId}`, {}, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                },
            });
            fetchAllUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Ошибка при отправке запроса');
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
                        <IconButton onClick={() => performAction('/admin/deactivate', data.id)}>
                            <PersonOff sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Activate User">
                        <IconButton onClick={() => performAction('/admin/activate', data.id)}>
                            <CheckCircleIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Promote to Superuser">
                        <IconButton onClick={() => performAction('/admin', data.id)}>
                            <Security sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Superuser Status">
                        <IconButton onClick={() => performAction('/admin/remove-super', data.id)}>
                            <DoDisturb sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        }
    ], []);

    const themeDarkBlue = themeQuartz.withPart(colorSchemeDark).withParams({
        fontFamily: "Afacad_Flux !important",
        foregroundColor: isDarkTheme ? "var(--tree-text)" : "var(--border)",
        headerTextColor: "var(--tree-text)",
        rangeSelectionBorderColor: "var(--tree-text)",
        rangeSelectionBackgroundColor: "var(--scrollbar-track-color)",
        columnBorder: { color: isDarkTheme ? '#33383d' : "lightgrey", width: '1px' },
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
                        domLayout="autoHeight"
                    />
                </div>
            </div>
            <button onClick={handleLogout} className={styles.submitButton} style={{width: '30vh', marginLeft: '40%', marginRight: '40%'}}>Log Out</button>
        </div>
    );
};

export default SuperuserAccount;
