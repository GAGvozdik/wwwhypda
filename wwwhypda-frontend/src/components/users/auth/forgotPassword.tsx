import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import api from '../../api';
import withRecaptcha, { WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';

const ForgotPassword: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<boolean>(false);
    const navigate = useNavigate();
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendCode = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) return;
        setIsLoading(true);

        try {
            const token = await executeRecaptcha('request_password_reset');
            const response = await api.post('/users/request-password-reset', { email, recaptcha_token: token });

            if (response.status === 200) {
                setError(response.data.message || 'Code sent to your email.');
                setIsError(false);
                setStep(2);
                setResendTimer(30);
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to send reset code. Please try again.');
            }
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [email, executeRecaptcha]);

    const handleResendCode = useCallback(async () => {
        if (resendTimer > 0 || !executeRecaptcha) return;

        setIsLoading(true);
        try {
            const token = await executeRecaptcha('resend_password_reset');
            const response = await api.post("/users/request-password-reset", { email, recaptcha_token: token });

            if (response.status === 200) {
                setError(response.data.message || "A new confirmation code has been sent to your email.");
                setIsError(false);
                setResendTimer(30);
            } else {
                setError(response.data.message || "Failed to resend the confirmation code.");
                setIsError(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Error while resending the confirmation code.");
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [email, executeRecaptcha, resendTimer]);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
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

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match!');
            setIsError(true);
            return;
        }

        if (!executeRecaptcha) return;

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
                    state: { message: 'Password reset successful! Please log in.' },
                });
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to reset password. Please try again.');
            }
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    }, [email, code, newPassword, confirmPassword, navigate, executeRecaptcha]);

    return (
        <div 
            style={{    
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
            }}
        >

            <div className={styles.authForm}>
                <div className={styles.formTitle}>Forgot Password</div>
                {step === 1 && (
                    <form onSubmit={handleSendCode}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <ErrorMessage error={error} isError={isError} />
                        <UserButton
                            text='Send Code'
                            isLoading={isLoading}
                        />

                        <div style={{ marginTop: '1vh', fontSize: '2vh', color: 'var(--tree-text)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5vh' }}>Already have an account?</div>
                            <div>
                                <Link to="/login" className={styles.link}>
                                    Login here
                                </Link>
                            </div>
                        </div>

                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleResetPassword}>
                        <input
                            type="text"
                            placeholder="Reset Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <ErrorMessage 
                            error={isError ? error : (resendTimer > 0 ? `Resend code in ${resendTimer}s` : error)}
                            isError={isError} 
                        />
                        <UserButton
                            text="Resend Code"
                            isLoading={isLoading || resendTimer > 0}
                            onclick={handleResendCode}
                            disabled={resendTimer > 0}
                        />
                        <div style={{height: '1vh'}}></div>
                        <UserButton
                            text='Reset Password'
                            isLoading={isLoading}
                        />
                    </form>
                )}
            </div>
        </div>
    );
};

export default withRecaptcha(ForgotPassword);