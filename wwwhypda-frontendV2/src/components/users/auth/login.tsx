import axios from 'axios';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import api from '../../api';
import DeleteAccount from '../accounts/deleteAccount';
import { legalDocuments, legalPdfPath } from '../../../common/legalDocuments';
import { termsAcceptanceRequired, termsEvent } from '../accountSession';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';


const Login: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const pendingRequest = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [termsVersion, setTermsVersion] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [restrictedSession, setRestrictedSession] = useState(termsAcceptanceRequired);
    const acceptanceCheckbox = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const update = () => setRestrictedSession(termsAcceptanceRequired());
        window.addEventListener(termsEvent, update);
        return () => window.removeEventListener(termsEvent, update);
    }, []);
    useEffect(() => { if (termsVersion) acceptanceCheckbox.current?.focus(); }, [termsVersion]);


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
        if (pendingRequest.current || (termsVersion && !termsAccepted)) return;
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
                ...(termsVersion ? { terms_accepted: true, terms_version: termsVersion } : {}),
            }, {
                withCredentials: true
            });

            const checkResponse = await api.get('/users/check', { withCredentials: true });

            const { is_superuser } = checkResponse.data;
            localStorage.setItem('isSuperuser', JSON.stringify(is_superuser));

            navigate(is_superuser ? '/superaccount' : '/account');

            setError(messages.login_success);
            setIsError(false);
        } catch (error: unknown) {
            setIsLoading(false);
            if (axios.isAxiosError<{ code?: string; terms_version?: string }>(error) &&
                error.response?.status === 409 &&
                ['terms_acceptance_required', 'terms_version_mismatch'].includes(error.response.data?.code || '') &&
                typeof error.response.data.terms_version === 'string') {
                setTermsVersion(error.response.data.terms_version);
                setTermsAccepted(false);
                setError(error.response.data.code === 'terms_version_mismatch' ? messages.terms_version_mismatch : '');
                setIsError(error.response.data.code === 'terms_version_mismatch');
                return;
            }
            setError((axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined) || messages.login_failed);
            setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsLoading(false);
        }
    }, [executeRecaptcha, username, password, navigate, termsVersion, termsAccepted]);


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
                            onChange={(e) => { setUsername(e.target.value); setTermsVersion(null); setTermsAccepted(false); }}
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
                        onChange={(e) => { setPassword(e.target.value); setTermsVersion(null); setTermsAccepted(false); }}
                        className={styles.inputField}
                        autoComplete="current-password"
                        required
                    />

                    {termsVersion && <section className={styles.termsReview} aria-labelledby="updated-terms-title">
                        <h2 id="updated-terms-title">{messages.terms_update_title}</h2>
                        <p>{messages.agreement_version_label} {termsVersion}</p>
                        <ul>
                            {legalDocuments.map((document) => <li key={document.slug}>
                                <a href={import.meta.env.BASE_URL + document.route.slice(1)} target="_blank" rel="noopener noreferrer">{document.label}</a>
                                {' · '}
                                <a href={import.meta.env.BASE_URL + legalPdfPath(document.slug, termsVersion)} target="_blank" rel="noopener noreferrer">{messages.legal_download_pdf}</a>
                            </li>)}
                        </ul>
                        <label className={styles.termsConfirmation}>
                            <input ref={acceptanceCheckbox} type="checkbox" checked={termsAccepted}
                                onChange={(event) => setTermsAccepted(event.target.checked)} required />
                            <span>{messages.terms_review_label}</span>
                        </label>
                        <button type="button" className={styles.termsDecline} onClick={() => navigate('/')}>
                            {messages.terms_decline}
                        </button>
                    </section>}
                    <ErrorMessage error={error} isError={isError} />

                    <UserButton text={termsVersion ? messages.terms_accept_sign_in : messages.login_button}
                        isLoading={isLoading} disabled={Boolean(termsVersion && !termsAccepted)} />
                </form>

                {restrictedSession && <section className={styles.termsReview}>
                    <p>{messages.terms_restricted_session}</p>
                    <button type="button" className={styles.termsDecline} onClick={async () => {
                        try { await api.post('/users/logout', {}, { withCredentials: true }); navigate('/'); }
                        catch { setError(messages.login_failed); setIsError(true); }
                    }}>{messages.logout}</button>
                    <DeleteAccount />
                </section>}
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