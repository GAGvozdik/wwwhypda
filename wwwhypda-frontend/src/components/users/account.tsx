import React, { useState, useEffect } from 'react';
import styles from './users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Logout } from '../../redux/actions';

const Account: React.FC = () => {
    console.log('Account component rendered');

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/users/', {
                withCredentials: true, // отправляем куки
            });
            console.log('response.data.data', response.data.data.name);
            console.log('response.data', response.data.name);
            console.log('response', response);
            setUserData(response.data.data);
        } catch (error: any) {
            if (error.response?.status === 401) {
                navigate('/login'); // если не авторизован, редирект
            } else {
                setError(error.response?.data?.error || 'Error fetching user data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:5000/users/logout', {}, {
                withCredentials: true, // передаём куки
            });
        } catch (err) {
            console.error("Ошибка при логауте:", err);
        }

        localStorage.clear(); // очищаем на всякий случай
        dispatch(Logout());
        navigate('/login');
    };

    return (
        <div
            className={styles.authForm}
            style={{
                color: 'var(--tree-text)',
                fontSize: '2vh',
                fontFamily: 'Afacad_Flux !important',
            }}
        >
            <div className={styles.formTitle} style={{ fontSize: '4.5vh' }}>
                Your Account
            </div>
            <div style={{ margin: '5vh' }}>
                {isLoading && <p>Loading...</p>}
                {error && <p style={{ color: 'var(--tree-text)' }}>{error}</p>}
                {userData && (
                    <div>
                        <div>Name: {userData.name}</div>
                        <div>Email: {userData.email}</div>
                    </div>
                )}
            </div>
            <button onClick={handleLogout} className={styles.submitButton}>
                Log Out
            </button>
        </div>
    );
};

export default Account;
