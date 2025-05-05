import React, { useState, useEffect } from 'react';
import styles from './../users.module.scss';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Logout } from '../../../redux/actions';
import LoadIcon from '../../commonFeatures/loadIcon';
import UserSuggestions from './userSuggestions';
const Account: React.FC = () => {

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
                withCredentials: true, 
            });

            setUserData(response.data.data);
        } catch (error: any) {
            if (error.response?.status === 401) {
                navigate('/login');
            } else {
                setError(error.response?.data?.error || 'Error fetching user data');
            }
        } finally {
            setIsLoading(false);
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

    return (
        <div 
            style={{    
                // display: 'flex',
                // justifyContent: 'center',
                // alignItems: 'center',
                height: '100%',
                width: '100%'
            }}
        >
            <div
                // className={styles.authForm}
                style={{
                    color: 'var(--tree-text)',
                    fontSize: '2vh',
                    fontFamily: 'Afacad_Flux !important',
                }}
            >
                <div className={styles.formTitle} style={{ fontSize: '4.5vh' }}>
                    Your Account
                </div>

                <UserSuggestions />


                <div style={{ margin: '5vh' }}>
                    {isLoading && <LoadIcon size={60}/>}
                    {error && <p style={{ color: 'var(--tree-text)' }}>{error}</p>}
                    {userData && (
                        <div>
                            <div>Name: {userData.name}</div>
                            <div>Email: {userData.email}</div>
                        </div>
                    )}
                </div>
                <button onClick={handleLogout} className={styles.submitButton} style={{width: '20vh', justifySelf: 'center'}}>
                    Log Out
                </button>
            </div>
        </div>
    );
};

export default Account;



