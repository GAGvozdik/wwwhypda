import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from './users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [savedEmails, setSavedEmails] = useState<string[]>([]); // Состояние для сохранённых почт
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const [isError, setIsError] = useState<boolean>(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        // Загружаем сохранённые email из localStorage при монтировании компонента
        const emails = JSON.parse(localStorage.getItem('savedEmails') || '[]');
        if (Array.isArray(emails)) {
            setSavedEmails(emails);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await axios.post('http://localhost:5000/users/login', {
                email: username,
                password: password
            }, {
                withCredentials: true
            });

            const checkResponse = await axios.get('http://localhost:5000/users/check', {
                withCredentials: true
            });

            const { is_superuser } = checkResponse.data;

            localStorage.setItem('isSuperuser', JSON.stringify(is_superuser));

            // Обновляем список сохранённых email
            const updatedEmails = Array.from(new Set([username, ...savedEmails])).slice(0, 5);
            localStorage.setItem('savedEmails', JSON.stringify(updatedEmails));

            navigate(is_superuser ? '/superaccount' : '/account');

            setError('Login successful!');
            setIsError(false);
        } catch (error: any) {
            setIsLoading(false);
            setError(error.response?.data?.message || 'Login failed. Please check your credentials.');
            setIsError(true);
        }
    };

    // Функция для отображения предложений
    const filterEmails = (value: string) => {
        if (!value) return [];
        return savedEmails.filter(email =>
            email.toLowerCase().includes(value.toLowerCase())
        );
    };

    return (
        <div className={styles.authForm}>
            <div className={styles.formTitle}>Authorization</div>

            <form onSubmit={handleLogin}>
                <div className={styles.autocompleteContainer}>
                    <input
                        type="text"
                        placeholder="Email"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.inputField}
                        required
                        list="emailSuggestions"
                    />
                    {/* Список предложений */}
                    {username && (
                        <datalist id="emailSuggestions">
                            {filterEmails(username).map((email, index) => (
                                <option key={index} value={email} />
                            ))}
                        </datalist>
                    )}
                </div>

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
