import axios from 'axios';
import messages from '../../../common/error_messages.json';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import api from '../../api';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';


const ForgotPassword: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const pendingRequest = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isError, setIsError] = useState<boolean>(false);
    const navigate = useNavigate();
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendCode = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingRequest.current) return;
        if (!executeRecaptcha) { setError(messages.captcha_unavailable); setIsError(true); return; }
        pendingRequest.current = true;
        setIsLoading(true);

        try {
            const token = await executeRecaptcha('request_password_reset');
            const response = await api.post('/users/request-password-reset', { email, recaptcha_token: token });

            if (response.status === 200) {
                setError(messages.password_reset_requested);
                setIsError(false);
                setStep(2);
                setResendTimer(30);
            } else {
                setError(messages.reset_code_failed);
                setIsError(true);
            }
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError(messages.reset_code_failed);
            }
            setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsLoading(false);
        }
    }, [email, executeRecaptcha]);

    const handleResendCode = useCallback(async () => {
        if (resendTimer > 0 || !executeRecaptcha) return;

        if (pendingRequest.current) return;
        pendingRequest.current = true;
        setIsResending(true);
        try {
            const token = await executeRecaptcha('resend_password_reset');
            const response = await api.post("/users/request-password-reset", { email, recaptcha_token: token });

            if (response.status === 200) {
                setError(messages.password_reset_requested);
                setIsError(false);
                setResendTimer(30);
            } else {
                setError(response.data.message || messages.resend_failed);
                setIsError(true);
            }
        } catch (err: unknown) {
            setError((axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) || messages.resend_error);
            setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsResending(false);
        }
    }, [email, executeRecaptcha, resendTimer]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [resendTimer]);

    const handleResetPassword = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingRequest.current) return;

        if (newPassword !== confirmPassword) {
            setError(messages.passwords_do_not_match);
            setIsError(true);
            return;
        }

        if (!executeRecaptcha) { setError(messages.captcha_unavailable); setIsError(true); return; }

        pendingRequest.current = true;
        setIsLoading(true);

        try {
            const token = await executeRecaptcha('confirm_password_reset');
            const response = await api.post('/users/confirm-password-reset', {
                email,
                code,
                new_password: newPassword,
                recaptcha_token: token,
            });

            if (response.status === 200) {
                navigate('/login', {
                    state: { message: messages.reset_password_success },
                });
            }
        } catch (error: unknown) {
            if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
                setError(error.response.data.message);
            } else {
                setError(messages.reset_password_failed);
            }
            setIsError(true);
        } finally {
            pendingRequest.current = false;
            setIsLoading(false);
        }
    }, [email, code, newPassword, confirmPassword, navigate, executeRecaptcha]);

    return (
        <div className={styles.authPage}>

            <div className={styles.authForm}>
                <div className={styles.formTitle}>{messages.forgot_password_title}</div>
                {step === 1 && (
                    <form onSubmit={handleSendCode}>
                        <input
                            type="email"
                            placeholder={messages.email_label}
                            aria-label={messages.email_label}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.inputField}
                            required
                            name="email"
                            list="emailSuggestions"
                            autoComplete="username"

                        />
                        <ErrorMessage error={error} isError={isError} />
                        <UserButton
                            text={messages.send_code_button}
                            isLoading={isLoading}
                        />

                        <div style={{ marginTop: '0.5rem', fontSize: 'var(--main-font-size)', color: 'var(--tree-text)', textAlign: 'center' }}>
                            <div style={{ fontSize: 'var(--menu-font-size)' }}>{messages.already_have_account}</div>
                            <div>
                                <Link to="/login" className={styles.link}>
                                    {messages.login_here}
                                </Link>
                            </div>
                        </div>

                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <input
                            type="text"
                            placeholder={messages.reset_code_label}
                            aria-label={messages.reset_code_label}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder={messages.new_password_label}
                            aria-label={messages.new_password_label}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder={messages.confirm_new_password_label}
                            aria-label={messages.confirm_new_password_label}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <ErrorMessage
                            error={isError ? error : (resendTimer > 0 ? `${error} ${messages.resend_countdown.replace('{seconds}', String(resendTimer))}` : error)}
                            isError={isError}
                        />
                        <UserButton
                            text={messages.resend_code_button}
                            isLoading={isResending}
                            onclick={handleResendCode}
                            disabled={resendTimer > 0 || isLoading}
                        />
                        <div style={{height: '0.5rem'}}></div>
                        <UserButton
                            text={messages.reset_password_button}
                            isLoading={isLoading}
                        />
                    </form>
                )}
            </div>
        </div>
    );
};

export default withRecaptcha(ForgotPassword);