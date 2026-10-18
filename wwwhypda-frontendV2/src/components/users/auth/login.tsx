import AuthSkeleton from '../../commonFeatures/authSkeleton';
import axios from 'axios';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import RegistrationConfirmation from './registrationConfirmation';
import CustomCheckbox from '../../commonFeatures/customCheckbox';
import ModalWindow from '../../modal/modalWindow';
import { useModal } from '../../modal/modalContext';
import modalStyles from '../../modal/modalStyles.module.scss';
import Button from '@mui/material/Button';
import api from '../../api';
import DeleteAccount from '../accounts/deleteAccount';
import { legalDocuments, legalPdfPath } from '../../../common/legalDocuments';
import { termsAcceptanceRequired, termsEvent, clearTermsRequirement } from '../accountSession';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';


interface LoginProps extends WithRecaptchaProps { checkingAccess?: boolean; }
const Login: React.FC<LoginProps> = ({ executeRecaptcha, checkingAccess = false }) => {
    const [username, setUsername] = useState('');
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const pendingRequest = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [termsVersion, setTermsVersion] = useState<string | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [restrictedSession, setRestrictedSession] = useState(termsAcceptanceRequired);
    const [restrictedNoticeOpen, setRestrictedNoticeOpen] = useState(termsAcceptanceRequired);
    const { modalRootRef } = useModal();
    useEffect(() => {
        const update = () => {
            const required = termsAcceptanceRequired();
            setRestrictedSession(required);
            setRestrictedNoticeOpen(required);
        };
        window.addEventListener(termsEvent, update);
        return () => window.removeEventListener(termsEvent, update);
    }, []);


    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!checkingAccess && location.state?.message) {
            if (typeof location.state.email === 'string') setUsername(location.state.email);
            setError(location.state.message);
            setIsError(false);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate, checkingAccess]);

    const closeRestrictedNotice = () => {
        if (pendingRequest.current) return;
        setRestrictedNoticeOpen(false);
    };

    const handleRestrictedLogout = async () => {
        if (pendingRequest.current) return;
        pendingRequest.current = true;
        setIsLoading(true);
        try {
            await api.post('/users/logout', {}, { withCredentials: true });
            clearTermsRequirement();
            navigate('/');
        } catch {
            setError(messages.login_failed); setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsLoading(false);
        }
    };

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
            if (axios.isAxiosError<{code?: string}>(error) && error.response?.status === 409 &&
                error.response.data?.code === 'email_confirmation_required') {
                setPendingEmail(username); setTermsVersion(null); setTermsAccepted(false);
                setError(''); setIsError(false); return;
            }
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


    if (pendingEmail) return <div className={styles.authPage}>
        <AuthSkeleton loading={isLoading}><div className={styles.authForm}>
            <div className={styles.formTitle}>{messages.confirm_email_title}</div>
            <RegistrationConfirmation key={pendingEmail} email={pendingEmail} executeRecaptcha={executeRecaptcha}
                onBusyChange={setIsLoading} onBack={() => setPendingEmail(null)} onConfirmed={message => {
                    setPendingEmail(null); setError(message); setIsError(false);
                }} />
        </div></AuthSkeleton>
    </div>;

    return (
        <div className={styles.authPage} data-auth-check={checkingAccess || undefined}>
            <AuthSkeleton loading={checkingAccess || isLoading}><div className={styles.authForm}>
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
                            disabled={isLoading}
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
                        disabled={isLoading}
                        required
                    />

                    {!termsVersion && !restrictedNoticeOpen && <ErrorMessage error={error} isError={isError} />}

                    <UserButton text={messages.login_button} isLoading={isLoading} />
                </form>

                <ModalWindow open={!checkingAccess && Boolean(termsVersion)} modalRootRef={modalRootRef}
                    labelledBy="updated-terms-title" describedBy="updated-terms-version"
                    onClose={() => {
                        if (pendingRequest.current) return;
                        setTermsVersion(null); setTermsAccepted(false); setError(''); setIsError(false);
                    }}>
                    {termsVersion && <form className={styles.termsDialog} onSubmit={handleLogin}>
                        <h2 id="updated-terms-title" className={modalStyles.modalTitle}>{messages.terms_update_title}</h2>
                        <p id="updated-terms-version" className={modalStyles.modalDescription}>
                            {messages.agreement_version_label} {termsVersion}
                        </p>
                        <ul className={styles.termsDocuments}>
                            {legalDocuments.map((document) => <li key={document.slug}>
                                <a href={import.meta.env.BASE_URL + document.route.slice(1)} target="_blank" rel="noopener noreferrer">{document.label}</a>
                                {' · '}
                                <a href={import.meta.env.BASE_URL + legalPdfPath(document.slug, termsVersion)} target="_blank" rel="noopener noreferrer">{messages.legal_download_pdf}</a>
                            </li>)}
                        </ul>
                        <label className={styles.checkboxRow}>
                            <CustomCheckbox key={termsVersion} isChecked={termsAccepted} onChange={setTermsAccepted}
                                required autoFocus disabled={isLoading} labelledBy="updated-terms-label" />
                            <span id="updated-terms-label">{messages.terms_review_label}</span>
                        </label>
                        <ErrorMessage error={error} isError={isError} />
                        <div className={styles.termsActions}>
                            <Button type="submit" className={modalStyles.submitButton}
                                disabled={!termsAccepted || isLoading} aria-busy={isLoading}>
                                {messages.terms_accept_sign_in}
                            </Button>
                            <Button type="button" className={modalStyles.submitButton} disabled={isLoading}
                                onClick={() => navigate('/')}>
                                {messages.terms_decline}
                            </Button>
                        </div>
                    </form>}
                </ModalWindow>

                {restrictedSession && !restrictedNoticeOpen && !termsVersion &&
                    <Button type="button" className={`${modalStyles.submitButton} ${styles.termsReopen}`}
                        aria-haspopup="dialog" onClick={() => setRestrictedNoticeOpen(true)}>
                        {messages.terms_update_title}
                    </Button>}
                <ModalWindow open={!checkingAccess && restrictedSession && restrictedNoticeOpen && !termsVersion}
                    modalRootRef={modalRootRef} onClose={closeRestrictedNotice}
                    labelledBy="restricted-session-title" describedBy="restricted-session-description">
                    <div className={styles.termsDialog}>
                        <h2 id="restricted-session-title" className={modalStyles.modalTitle}>{messages.terms_update_title}</h2>
                        <p id="restricted-session-description" className={modalStyles.modalDescription}>
                            {messages.terms_restricted_session}
                        </p>
                        <ErrorMessage error={error} isError={isError} />
                        <div className={styles.termsActions}>
                            <Button type="button" className={modalStyles.submitButton} disabled={isLoading}
                                onClick={closeRestrictedNotice}>{messages.terms_review_sign_in}</Button>
                            <Button type="button" className={modalStyles.submitButton} disabled={isLoading}
                                onClick={handleRestrictedLogout}>{messages.logout}</Button>
                            <DeleteAccount />
                        </div>
                    </div>
                </ModalWindow>
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
            </div></AuthSkeleton>
        </div>
    );
};

export default withRecaptcha(Login);