import React, { useState, useEffect } from 'react';
import styles from './users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../redux/actions';
import { State } from '../../common/types';
import { useSelector, useDispatch } from 'react-redux';

const SuperiserAccount: React.FC = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const token = useSelector((state: State) => state.token);

    const [userData, setUserData] = useState<any>(null); // для хранения данных пользователя
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Запрос к серверу для получения данных пользователя при монтировании компонента
        if (token) {
            fetchUserData();
        } else {
            navigate('/login'); // Если токен отсутствует, перенаправить на страницу входа
        }
    }, [token, navigate]);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('http://localhost:5000/users/', {
                headers: {
                    Authorization: `Bearer ${token}`, // Передаем токен в заголовках
                },
            });
            setUserData(response.data.data); // Сохраняем данные пользователя
        } catch (error: any) {
            setError(error.response?.data?.error || 'Error fetching user data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        // Удаляем токен и данные пользователя из localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiration'); // Если ты сохраняешь и время истечения
        localStorage.removeItem('is_superuser'); // Если ты сохраняешь и время истечения

        // Сброс состояния через Redux
        dispatch(Logout());

        // Перенаправляем на страницу логина
        navigate('/login');
    };


    return (
        <div className={styles.authForm} style={{ color: 'var(--tree-text)', fontSize: '2vh', fontFamily: 'Afacad_Flux !important' }}>
            <div className={styles.formTitle} style={{ fontSize: '4.5vh'}}>Super Account</div>
            <div style={{ margin: '5vh'}}>
                {isLoading && <p>Loading...</p>}
                {error && <p style={{ color: 'var(--tree-text)' }}>{error}</p>}
                {userData && (
                    <div>
                        <div>Name: {userData.name}</div>
                        <div>Email: {userData.email}</div>
                    </div>
                )}
            </div>
            <button onClick={handleLogout} className={styles.submitButton}>Log Out</button>
        </div>
    );
};

export default SuperiserAccount;
