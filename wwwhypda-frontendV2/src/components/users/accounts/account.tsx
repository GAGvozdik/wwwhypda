import accountStyles from './accountsStyles.module.scss';
import React, { useState, useEffect } from 'react';
import styles from './../users.module.scss';
// import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// import { useDispatch } from 'react-redux';
// import { Logout } from '../../../redux/actions';
import LoadIcon from '../../commonFeatures/loadIcon';
import UserSuggestions from './userSuggestions';
import api from '../../api';
import axios from 'axios';
import DeleteAccount from './deleteAccount';
import messages from '../../../common/error_messages.json';
import type { AccountProfile } from '../../../common/types';
import { getCsrfTokenFromCookie } from '../../../common/types';

const Account: React.FC = () => {

    // const dispatch = useDispatch();
    const navigate = useNavigate();

    const [userData, setUserData] = useState<AccountProfile | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
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
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                navigate('/login');
            } else {
                setError(messages.account_fetch_failed);
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


    const handleLogout = async () => {
        try {
            const res = await api.post('/users/logout', {}, {
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
            if (!axios.isCancel(err)) console.warn('Logout failed');

        } finally {
            localStorage.removeItem('isSuperuser');
            clearAllCookies();
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className={accountStyles.accountPage}
            style={{
                // display: 'flex',
                // justifyContent: 'center',
                // alignItems: 'center',
                height: '100%',
                width: '100%'
            }}
        >
            <div className={accountStyles.topActions}>
                <button onClick={handleLogout} className={accountStyles.neutralLogout}>
                    {messages.logout}
                </button>
            </div>
            <div
                // className={styles.authForm}
                style={{
                    color: 'var(--tree-text)',
                    fontSize: 'var(--main-font-size)',
                    fontFamily: 'Afacad_Flux !important',
                }}
            >
                <div className={styles.formTitle} style={{ fontSize: 'calc(var(--main-font-size) * 2.25)' }}>
                    {messages.account_title}
                </div>

                <UserSuggestions />


                <div className={styles.accountDetails}>
                    {isLoading && <LoadIcon size={34}/>}
                    {error && <p style={{ color: 'var(--tree-text)' }}>{error}</p>}
                    {userData && (
                        <div>
                            <div>{messages.account_name}: {userData.name}</div>
                            <div>{messages.account_email}: {userData.email}</div>
                        </div>
                    )}
                    <section className={styles.accountPrivacy} aria-label={messages.personal_data_requests}>
                        <p>{messages.personal_data_request_description}</p>
                        <a className={styles.policyLink} href="mailto:support@wwhypdatestdeployversion.it?subject=Personal%20data%20request">support@wwhypdatestdeployversion.it</a>
                        <p>{messages.logout_does_not_delete}</p>
                    </section>
                </div>

            </div>
            <div className={accountStyles.bottomActions}><DeleteAccount /></div>
        </div>
    );
};

export default Account;



