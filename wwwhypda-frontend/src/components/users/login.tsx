import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UpdateToken } from '../../redux/actions';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from './users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const [isError, setIsError] = useState<boolean>(false);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const token = localStorage.getItem('token');
            if (token) {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = decodedToken.exp * 1000; // Срок истечения токена в миллисекундах
                const currentTime = new Date().getTime();
                console.log('expirationTime - currentTime')
                // Если токен истекает через 2 минуты или менее, обновляем его
                if (expirationTime - currentTime <= 2 * 60 * 1000) {
                    refreshToken();
                }
            }
        }, 20 * 1000); // Проверяем каждую минуту
        // }, 60 * 1000); // Проверяем каждую минуту

        // Очищаем интервал при размонтировании компонента
        return () => clearInterval(intervalId);
    }, []);

    const refreshToken = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.post(
                'http://localhost:5000/users/refresh', 
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const { token: newToken } = response.data.data;

            // Обновляем токен в Redux и localStorage
            dispatch(UpdateToken(newToken));
            localStorage.setItem('token', newToken);
        } catch (error) {
            console.error('Error refreshing token:', error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/users/login', { email: username, password });

            const { token, ...userData } = response.data.data;

            // Сохраняем токен и данные пользователя
            dispatch(UpdateToken(token));
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('token', token);

            // Сохраняем время истечения токена
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = decodedToken.exp * 1000; // Время истечения токена в миллисекундах
            localStorage.setItem('tokenExpiration', expirationTime.toString());

            setError('Login successful!');
            setIsError(false);
            navigate('/account');
        } catch (error: any) {
            setIsLoading(false);

            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError("Login failed. Please check your credentials.");
            }

            setIsError(true);
        }
    };

    return (
        <div className={styles.authForm}>
            <div className={styles.formTitle}>Authorization</div>

            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Mail"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={styles.inputField}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.inputField}
                    required
                />
                <ErrorMessage error={error} isError={isError} />
                <UserButton text='Login' isLoading={isLoading} />
            </form>

            <div style={{ margin: '1vh 0vh 0vh 0vh', fontSize: '2vh', color: 'var(--tree-text)', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5vh' }}>Do you have an account?</div>
                <div>
                    <Link to="/register" className={styles.link}>
                        Register here
                    </Link>
                </div>
            </div>
            <div style={{ margin: '1vh 0vh 0vh 0vh', fontSize: '2vh', color: 'var(--tree-text)', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5vh' }}>Do you want to reset your password?</div>
                <div>
                    <Link to="/forgot-password" className={styles.link}>
                        Reset password
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
