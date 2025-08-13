import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from '../users.module.scss';
import CircularProgress from '@mui/material/CircularProgress';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import { Link } from 'react-router-dom';
import api from '../../api';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState<boolean>(false); // Флаг для ошибки
    const navigate = useNavigate();
    const [resendTimer, setResendTimer] = useState(0);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post('/users/request-password-reset', { email });

            if (response.status === 200) {
                setError(response.data.message || 'Code sent to your email.');
                setIsError(false); // Сообщение об успешной отправке
                setStep(2); // Переход на шаг ввода кода
                setResendTimer(30);
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message); // Сообщение об ошибке от сервера
            } else {
                setError('Failed to send reset code. Please try again.');
            }
            setIsError(true); // Сообщение об ошибке
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return; // Prevent spamming

        setIsLoading(true);
        try {
            const response = await api.post("/users/request-password-reset", { email });

            if (response.status === 200) {
                setError(response.data.message || "A new confirmation code has been sent to your email.");
                setIsError(false);
                setResendTimer(30); // 30 seconds cooldown
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
    };

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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match!');
            setIsError(true); // Сообщение об ошибке
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.post('/users/confirm-password-reset', {
                email,
                code,
                new_password: newPassword,
            });

            if (response.status === 200) {
                navigate('/login', {
                    state: { message: 'Password reset successful! Please log in.' },
                });
            }
        } catch (error: any) {
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message); // Сообщение об ошибке от сервера
            } else {
                setError('Failed to reset password. Please try again.');
            }
            setIsError(true); // Сообщение об ошибке
        } finally {
            setIsLoading(false);
        }
    };

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
                        {/* Передаем флаг isError */}
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

export default ForgotPassword;
