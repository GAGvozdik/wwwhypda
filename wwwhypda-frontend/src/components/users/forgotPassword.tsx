import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './users.module.scss';
import CircularProgress from '@mui/material/CircularProgress';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/forgot-password', { email });

            if (response.status === 200) {
                setError('Code sent to your email.');
                setStep(2); // Переход на шаг ввода кода
            }
        } catch (error) {
            setError('Failed to send reset code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match!');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/reset-password', {
                email,
                code,
                new_password: newPassword,
            });

            if (response.status === 200) {
                navigate('/login', {
                    state: { message: 'Password reset successful! Please log in.' },
                });
            }
        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error); // Установить сообщение об ошибке от сервера
            } else {
                setError('Failed to reset password. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
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

                    <ErrorMessage error={error} />

                    <UserButton
                        text='Send Code'
                        isLoading={isLoading}
                    />

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

                    <ErrorMessage error={error} />

                    <UserButton
                        text='Reset Password'
                        isLoading={isLoading}
                    />


                </form>
            )}
        </div>
    );
};

export default ForgotPassword;
