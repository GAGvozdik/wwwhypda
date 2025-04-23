import React, { useState, useEffect } from 'react';
import styles from './users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../redux/actions';
import { State } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const SuperiserAccount: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((state: State) => state.token);

    const [userData, setUserData] = useState<any>(null); // текущий пользователь
    const [allUsers, setAllUsers] = useState<any[]>([]); // список всех пользователей
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
                headers: {
                    Authorization: `Bearer ${token}`,
                },
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
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setAllUsers(response.data.data);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching all users');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiration');
        localStorage.removeItem('is_superuser');
        dispatch(Logout());
        navigate('/login');
    };

    const columnDefs = [
        { headerName: 'ID', field: 'id', sortable: true, filter: true },
        { headerName: 'Name', field: 'name', sortable: true, filter: true },
        { headerName: 'Email', field: 'email', sortable: true, filter: true },
        { headerName: 'Active', field: 'active', cellRenderer: ({ value }: any) => value ? 'Yes' : 'No' },
        { headerName: 'Superuser', field: 'is_superuser', cellRenderer: ({ value }: any) => value ? 'Yes' : 'No' }
    ];

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
                <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
                    <AgGridReact rowData={allUsers} columnDefs={columnDefs} pagination={true} />
                </div>
            </div>
            <button onClick={handleLogout} className={styles.submitButton}>Log Out</button>
        </div>
    );
};

export default SuperiserAccount;
