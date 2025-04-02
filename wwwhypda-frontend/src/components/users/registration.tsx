import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from './users.module.scss';
import ErrorMessage from './errorMessage'; // Компонент ошибки
import UserButton from './userButton';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [isError, setIsError] = useState<boolean>(false); // Флаг для ошибки
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            setIsError(true); // Устанавливаем ошибку
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('http://localhost:5000/users/', {
                name: username,
                password: password,
                email: email,
            });

            if (response.status === 201) {
                setError(response.data.message);
                setIsError(false); // Устанавливаем успешный ответ
                console.log(response.data.message);
                setStep(2);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed. Please try again.");
            setIsError(true); // Устанавливаем ошибку
            console.log(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post("http://localhost:5000/users/confirm-registration", {
                email: email,
                code: confirmationCode,
            });

            if (response.status === 200) {
                navigate("/login");  // ✅ Перенаправление после успешного подтверждения
            } else {
                setError(response.data.message || "Invalid confirmation code.");
                setIsError(true); // Устанавливаем ошибку
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Confirmation failed. Please try again.");
            setIsError(true); // Устанавливаем ошибку
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

                    {/* Передаем параметр isError, чтобы изменить цвет */}
                    <ErrorMessage error={error} isError={isError} />

                    <UserButton text="Register" isLoading={isLoading} />

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
                <form onSubmit={confirmRegistration}>
                    <input
                        type="text"
                        placeholder="Confirmation Code"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        className={styles.inputField}
                        required
                    />

                    {/* Передаем параметр isError, чтобы изменить цвет */}
                    <ErrorMessage error={error} isError={isError} />

                    <UserButton text="Confirm" isLoading={isLoading} />
                </form>
            )}
        </div>
    );
};

export default Register;
