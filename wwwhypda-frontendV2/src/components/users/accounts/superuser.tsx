import { signOutAccountSession } from '../accountSession';
import useRemColumns from '../../commonFeatures/useRemColumns';
import { useSelector } from 'react-redux';
import accountStyles from './accountsStyles.module.scss';
import type { State } from '../../../common/types';
import menuStyles from '../../menu.module.scss';
import React, { useState, useEffect, useMemo } from 'react';
import styles from './../users.module.scss';
// import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import { Logout } from '../../../redux/actions';
// import { State } from '../../../common/types';
// import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IconButton, Tooltip } from '@mui/material';
import { PersonOff, Security, DoDisturb } from '@mui/icons-material';
import { useStepsTheme } from '../../inputData/steps';
import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import InputSuggestions from './inputSuggestions';
import api from '../../api';
import axios from 'axios';
import DeleteAccount from './deleteAccount';
import messages from '../../../common/error_messages.json';
import type { AccountProfile } from '../../../common/types';
import { getCsrfTokenFromCookie, clearAllCookies } from '../../../common/types';


const SuperuserAccount: React.FC = () => {
    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);

    const navigate = useNavigate();

    const [userData, setUserData] = useState<AccountProfile | null>(null);
    const [allUsers, setAllUsers] = useState<AccountProfile[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);



    useEffect(() => {
        fetchUserData();
        fetchAllUsers();
    }, []);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/users/', {
                withCredentials: true,
            });
            setUserData(response.data.data);
        } catch (error: unknown) {
            if (axios.isCancel(error)) return;
            setError(messages.account_fetch_failed);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const response = await api.get('/admin/get_all_users', {
                withCredentials: true,
            });
            setAllUsers(response.data.data);
        } catch (error: unknown) {
            if (axios.isCancel(error)) return;
            setError(messages.account_users_fetch_failed);
        }
    };



    const handleLogout = async () => {
        try {
            const res = await api.post('/users/refresh/logout', {}, {
                withCredentials: true, // обязательно для куков
                headers: {
                    'X-CSRF-TOKEN': getCsrfTokenFromCookie(true), // если у вас проверяется CSRF
                }
            });

            if (res.status === 200) {
                signOutAccountSession();
                localStorage.removeItem('isSuperuser');
                clearAllCookies();
                navigate('/login', { replace: true });
            }
        } catch (err) {
            if (!axios.isCancel(err)) setError(messages.account_action_failed);
        }
    };


    const performAction = async (url: string, userId: number) => {
        const csrfToken = getCsrfTokenFromCookie();
        if (!csrfToken) {
            setError(messages.csrf_missing);
            return;
        }

        try {
            await api.post(`${url}/${userId}`, {}, {
                withCredentials: true,
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                },
            });
            fetchAllUsers();
        } catch (err: unknown) {
            if (axios.isCancel(err)) return;
            setError(messages.account_action_failed);
            console.warn('Account action failed');
        }
    };

    const columnDefs = useMemo<ColDef<AccountProfile>[]>(() => [
        { headerName: messages.column_id, field: 'id', sortable: true, filter: true, flex: 1 },
        { headerName: messages.account_name, field: 'name', sortable: true, filter: true, flex: 1 },
        { headerName: messages.account_email, field: 'email', sortable: true, filter: true, flex: 2 },
        {
            headerName: messages.column_active,
            field: 'active',
            cellRenderer: ({ value }: { value: boolean }) => value ? messages.yes : messages.no,
            flex: 1
        },
        {
            headerName: messages.column_superuser,
            field: 'is_superuser',
            cellRenderer: ({ value }: { value: boolean }) => value ? messages.yes : messages.no,
            flex: 1
        },
        {
            headerName: messages.column_actions,
            colId: 'actions',
            cellRenderer: ({ data }: { data: AccountProfile }) => (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.deactivate_user}>
                        <IconButton onClick={() => performAction('/admin/deactivate', data.id)}>
                            <PersonOff sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.activate_user}>
                        <IconButton onClick={() => performAction('/admin/activate', data.id)}>
                            <CheckCircleIcon sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.promote_superuser}>
                        <IconButton onClick={() => performAction('/admin', data.id)}>
                            <Security sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip slotProps={{ popper: { className: `${accountStyles.accountTooltip} ${isDarkTheme ? menuStyles.dark : ''}` } }} title={messages.remove_superuser}>
                        <IconButton onClick={() => performAction('/admin/remove-super', data.id)}>
                            <DoDisturb sx={{ color: 'var(--tree-text)' }} />
                        </IconButton>
                    </Tooltip>
                </div>
            ),
            minWidth: 200,
            maxWidth: 300
        }
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
        <div className={accountStyles.accountPage} style={{ color: 'var(--tree-text)', fontSize: 'var(--main-font-size)', fontFamily: 'Afacad_Flux !important' }}>
            <div className={accountStyles.topActions}>
            <button
                onClick={handleLogout}
                className={accountStyles.neutralLogout}
            >
                {messages.logout}
            </button>
            </div>
            <div className={styles.formTitle} style={{ fontSize: 'calc(var(--main-font-size) * 2.25)' }}>{messages.superaccount_title}</div>
            <div style={{ margin: '1rem 0' }}>


                <div style={containerStyle}>
                    <SingleSkeleton loading={isLoading} error={error} height={'25rem'}>
                        <AgGridReact
                            defaultColDef={{ wrapHeaderText: true, autoHeaderHeight: true }}
                            theme={themeDarkBlue}
                            rowData={allUsers}
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


                {isLoading ? (
                    <div style={{height: '4.15rem', display: 'flex', alignItems: 'center', justifyContent:'center'}}>
                        <LoadIcon size={20} />
                    </div>
                ) : error ? (
                    <p style={{ color: 'var(--error-text)' }}>{error}</p>
                ) : userData ? (
                    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>{messages.account_name}: {userData.name}</div>
                        <div>{messages.account_email}: {userData.email}</div>
                    </div>
                ) : null}

            </div>

            <InputSuggestions />



            <div className={accountStyles.bottomActions}><DeleteAccount /></div>
        </div>
    );
};

export default SuperuserAccount;
