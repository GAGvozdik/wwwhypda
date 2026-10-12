import axios from 'axios';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import api from '../../api';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';


const Login: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const pendingRequest = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setError(location.state.message);
            setIsError(false);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingRequest.current) return;
        pendingRequest.current = true;
        setIsLoading(true);

        if (!executeRecaptcha) {
            setError(messages.captcha_unavailable);
            pendingRequest.current = false;
            setIsLoading(false);
            setIsError(true);
            return;
        }

        try {
            const token = await executeRecaptcha('login');
            await api.post('/users/login', {
                email: username,
                password: password,
                recaptcha_token: token,
            }, {
                withCredentials: true
            });

            const checkToken = await executeRecaptcha('check_auth_after_login');
            const checkResponse = await api.get('/users/check', {
                withCredentials: true,
                headers: {
                    'X-Recaptcha-Token': checkToken,
                },
            });

            const { is_superuser } = checkResponse.data;
            localStorage.setItem('isSuperuser', JSON.stringify(is_superuser));

            navigate(is_superuser ? '/superaccount' : '/account');

            setError(messages.login_success);
            setIsError(false);
        } catch (error: unknown) {
            setIsLoading(false);
            setError((axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined) || messages.login_failed);
            setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsLoading(false);
        }
    }, [executeRecaptcha, username, password, navigate]);


    return (
        <div className={styles.authPage}>
            <div className={styles.authForm}>
                <div className={styles.formTitle}>{messages.auth_title}</div>

                <form onSubmit={handleLogin}>
                    <div className={styles.autocompleteContainer}>
                        <input
                            type="email"
                            placeholder={messages.email_label}
                            aria-label={messages.email_label}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.inputField}
                            name="email"
                            autoComplete="username"
                            required
                            list="emailSuggestions"
                        />
                    </div>

                    <input
                        type="password"
                        placeholder={messages.password_label}
                            aria-label={messages.password_label}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.inputField}
                        autoComplete="current-password"
                        required
                    />

                    <ErrorMessage error={error} isError={isError} />

                    <UserButton text={messages.login_button} isLoading={isLoading} />
                </form>

                <div style={{ margin: '0.5rem 0rem 0rem 0rem', fontSize: 'var(--main-font-size)', color: 'var(--tree-text)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--menu-font-size)' }}>{messages.have_account_prompt}</div>
                    <div>
                        <Link to="/register" className={styles.link}>
                            {messages.register_here}
                        </Link>
                    </div>
                </div>
                <div style={{ margin: '0.5rem 0rem 0rem 0rem', fontSize: 'var(--main-font-size)', color: 'var(--tree-text)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--menu-font-size)' }}>{messages.reset_password_prompt}</div>
                    <div>
                        <Link to="/forgot-password" className={styles.link}>
                            {messages.reset_password_link}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withRecaptcha(Login);