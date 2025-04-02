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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Отправляем email и password на бэкенд
            const response = await axios.post('http://localhost:5000/users/login', { email: username, password });

            console.log('Server Response:', response.data);

            // Извлекаем token и другие данные пользователя
            const { token, ...userData } = response.data.data;

            // Сохраняем токен в Redux или в локальном хранилище
            dispatch(UpdateToken(token)); // Сохраняем токен в Redux
            localStorage.setItem('user', JSON.stringify(userData)); // Можно сохранить данные о пользователе в localStorage (если нужно)

            navigate('/account'); // Переход на страницу аккаунта
        } catch (error: any) {
            setIsLoading(false);

            // Обработка ошибок от сервера
            if (error.response && error.response.data && error.response.data.error) {
                setError(error.response.data.error); // Отображаем ошибку от сервера
            } else {
                setError("Login failed. Please check your credentials."); // Общее сообщение об ошибке
            }
        }
    };


    return (
        <div className={styles.authForm}>
            <div className={styles.formTitle}>Authorization</div>

            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Username"
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

                <ErrorMessage error={error} />

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
