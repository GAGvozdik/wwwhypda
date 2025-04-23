import React, { useState } from 'react';
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
    const [isError, setIsError] = useState<boolean>(false); // Добавляем флаг для ошибки

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/users/login', { email: username, password });

            console.log('Server Response:', response.data);

            const { token, ...userData } = response.data.data;

            dispatch(UpdateToken(token)); // Сохраняем токен в Redux
            localStorage.setItem('user', JSON.stringify(userData)); // Можно сохранить данные о пользователе в localStorage
            localStorage.setItem('token', token);

            setError('Login successful!'); // Успешный логин
            setIsError(false); // Устанавливаем, что это не ошибка
            navigate('/account'); // Переход на страницу аккаунта
        } catch (error: any) {
            setIsLoading(false);

            // Обработка ошибок от сервера
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message); // Сообщение об ошибке от сервера
            } else {
                setError("Login failed. Please check your credentials."); // Общая ошибка
            }

            setIsError(true); // Устанавливаем, что это ошибка
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

                {/* Передаем параметр isError для изменения цвета */}
                <ErrorMessage error={error} isError={isError} />

                <UserButton
                    text='Login'
                    isLoading={isLoading}
                />
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
