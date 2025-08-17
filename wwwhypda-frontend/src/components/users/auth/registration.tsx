import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import ErrorMessage from './errorMessage';
import UserButton from './userButton';
import api from '../../api';
import messages from '../../../common/error_messages.json';
import withRecaptcha, { WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';

const Register: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
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

    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(messages.passwords_do_not_match);
            setIsError(true);
            return;
        }

        if (!executeRecaptcha) {
            return;
        }

        setIsLoading(true);
        try {
            const token = await executeRecaptcha('register');
            const response = await api.post('/users/', {
                name: username,
                password: password,
                email: email,
                recaptcha_token: token,
            });

            if (response.status === 201) {
                setError(response.data.message);
                setIsError(false);
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
        } finally {
            setIsLoading(false);
        }
    }, [executeRecaptcha, username, password, confirmPassword, email]);

    const confirmRegistration = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) {
            return;
        }
        setIsLoading(true);

        try {
            const token = await executeRecaptcha('confirm_registration');
            const response = await api.post("/users/confirm-registration", {
                email: email,
                code: confirmationCode,
                recaptcha_token: token,
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
    }, [executeRecaptcha, email, confirmationCode, navigate]);

    const [resendTimer, setResendTimer] = useState(0);

    const handleResendCode = useCallback(async () => {
        if (resendTimer > 0 || !executeRecaptcha) return;

        setIsLoading(true);
        try {
            const token = await executeRecaptcha('resend_code');
            const response = await api.post("/users/resend-confirmation", { email, recaptcha_token: token });

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
    }, [executeRecaptcha, email, resendTimer]);

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
                            error={resendTimer > 0 ? `Resend code in ${resendTimer}s` : error}
                            isError={isError} 
                        />

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

export default withRecaptcha(Register);
