import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
        setError("Passwords do not match!");
        return;
    }

    setIsLoading(true);
    try {
        const response = await axios.post('http://localhost:5000/api/register', {
            username,
            password,
            email,
        });

        if (response.status === 201) {
            setError("Registration successful! Please check your email for the confirmation code.");
            setStep(2);
        }
    } catch (err: any) {
        if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error); // Установить сообщение об ошибке от сервера
        } else {
            setError('Registration failed. Please try again.');
        }
    } finally {
        setIsLoading(false);
    }
};


    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsLoading(true); 
        try {
            const response = await axios.post('http://localhost:5000/api/confirm', {
                email,
                code: confirmationCode,
            });

            if (response.status === 200) {
                setError("Confirmation successful! You can now log in.");
                navigate('/login');
            }
        } catch (error) {
            setError('Confirmation failed. Please try again.');
        } finally {
            setIsLoading(false); 
        }
    };

    return (
        <div className={styles.authForm}>
            <div className={styles.formTitle}>Registration</div>
            {step === 1 && (
                <form onSubmit={handleRegister}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={styles.inputField}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={styles.inputField}
                        required
                    />

                    <ErrorMessage error={error} />

                    <UserButton
                        text='Register'
                        isLoading={isLoading}
                    />


                    <div style={{ margin: '1vh 0vh 0vh 0vh', fontSize: '2vh', color: 'var(--tree-text)', textAlign: 'center' }}>
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
                <form onSubmit={handleConfirm}>
                    <input
                        type="text"
                        placeholder="Confirmation Code"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        className={styles.inputField}
                        required
                    />

                    <ErrorMessage error={error} />

                    <UserButton
                        text='Confirm'
                        isLoading={isLoading}
                    />

                </form>
            )}
        </div>
    );
};

export default Register;
