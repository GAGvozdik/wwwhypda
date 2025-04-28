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

const SuperuserAccount: React.FC = () => {

    const navigate = useNavigate();

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

    // Вспомогательная функция для удаления всех кук
    function clearAllCookies() {
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
    }

    // Вспомогательная функция, если надо получить csrf_token из cookie
    function getCsrfTokenFromCookie() {
        const csrf = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
        return csrf || '';
    }

    const handleLogout = async () => {
        try {
            const res = await axios.post('http://localhost:5000/users/logout', {}, {
                withCredentials: true, // обязательно для куков
                headers: {
                    'X-CSRF-TOKEN': getCsrfTokenFromCookie(), // если у вас проверяется CSRF
                }
            });

            if (res.status === 200) {
                localStorage.removeItem('isSuperuser');
                clearAllCookies(); 
                navigate('/login', { replace: true });
            }
        } catch (err) {
            console.error("Ошибка при выходе:", err);
        } finally {
            localStorage.removeItem('isSuperuser');
            clearAllCookies(); 
            navigate('/login', { replace: true });
        }
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

    const themeDarkBlue = useStepsTheme();

    const containerStyle = useMemo(() => ({ 
        width: "100%", 
        height: "50vh", 
        "--ag-background-color": "var(--table-color)", 
        marginTop: '0vh', 
        marginBottom: '0vh',
    }), []);    

    return (
        <div style={{ color: 'var(--tree-text)', fontSize: '2vh', fontFamily: 'Afacad_Flux !important' }}>
            <div className={styles.formTitle} style={{ fontSize: '4.5vh' }}>Super Account</div>
            <div style={{ margin: '5vh' }}>


                <div style={containerStyle}>
                    <SingleSkeleton loading={isLoading} error={error} height={'50vh'}>
                        <AgGridReact
                            theme={themeDarkBlue}
                            rowData={allUsers}
                            columnDefs={columnDefs}
                            pagination={true}
                            suppressRowHoverHighlight
                            suppressColumnVirtualisation
                            domLayout="normal"
                        />
                    </SingleSkeleton>

                </div>


                {isLoading ? (
                    <div style={{height: '8.3vh', display: 'flex', alignItems: 'center', justifyContent:'center'}}>
                        <LoadIcon size={20} />
                    </div>
                ) : error ? (
                    <p style={{ color: 'var(--error-text)' }}>{error}</p>
                ) : userData ? (
                    <div style={{ marginTop: '3vh', marginBottom: '3vh' }}>
                        <div>Name: {userData.name}</div>
                        <div>Email: {userData.email}</div>
                    </div>
                ) : null}

            </div>

            <button
                onClick={handleLogout}
                className={styles.submitButton}
                style={{width: '30%', margin: '0% 35% 0% 35%'}}
            >
                Log Out
            </button>

        </div>
    );
};

export default SuperuserAccount;
