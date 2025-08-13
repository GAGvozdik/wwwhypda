import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import ErrorMessage from './errorMessage';
import UserButton from './userButton';
import api from '../../api';
import messages from '../../../common/error_messages.json';
import { Height } from '@mui/icons-material';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [isError, setIsError] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(messages.passwords_do_not_match);
            setIsError(true);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/users/', {
                name: username,
                password: password,
                email: email,
            });

            if (response.status === 201) {
                setError(response.data.message);
                setIsError(false);
                console.log(response.data.message);
                setStep(2);
            }
        } catch (err: any) {
            if (err.response?.data) {
                if (err.response.data.message) {
                    setError(err.response.data.message);
                } else {
                    const errorMessages = Object.values(err.response.data);
                    const displayError = errorMessages.length > 0 ? errorMessages[0] : messages.registration_failed;
                    setError(displayError as string);
                }
            } else {
                setError(messages.registration_failed);
            }
            setIsError(true);
            console.log(err.response?.data || messages.registration_failed);
        } finally {
            setIsLoading(false);
            setIsError(true);
        }
    };



    const confirmRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post("/users/confirm-registration", {
                email: email,
                code: confirmationCode,
            });

            if (response.status === 200) {
                const successMessage = response.data.message || messages.account_activated;
                navigate('/login', { state: { message: successMessage } });
            } else {
                setError(response.data.message || messages.invalid_confirmation_code);
                setIsError(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || messages.confirmation_failed);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const [resendTimer, setResendTimer] = useState(0);

    const handleResendCode = async () => {
        if (resendTimer > 0) return; // Prevent spamming

        setIsLoading(true);
        try {
            const response = await api.post("/users/resend-confirmation", { email });

            if (response.status === 200) {
                setError(response.data.message || "A new confirmation code has been sent to your email.");
                setIsError(false);
                setResendTimer(30); // 60 seconds cooldown
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

    // Countdown effect
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

                        <ErrorMessage 
                            error={resendTimer > 0 ? `Resend code in ${resendTimer}s` : null}
                            isError={isError} 
                        />

                                {/* error + "Resend code in " + resendTimer.toString() + 's' */}

                        <UserButton
                            text="Resend Code"
                            isLoading={isLoading || resendTimer > 0}
                            onclick={handleResendCode}
                            disabled={resendTimer > 0}
                        />
                        <div style={{height: '1vh'}}></div>

                        <UserButton text="Confirm" isLoading={isLoading} />
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;