import CustomCheckbox from '../../commonFeatures/customCheckbox';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import ErrorMessage from './errorMessage';
import UserButton from './userButton';
import api from '../../api';
import messages from '../../../common/error_messages.json';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';
import { validateRegistration } from './validation';

const Register: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [step, setStep] = useState(1);
    const [isError, setIsError] = useState<boolean>(false);
    const navigate = useNavigate();
    const [isChecked, setIsChecked] = useState(false);
    const [isAdult, setIsAdult] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const termsMissing = hasSubmitted && !isChecked;
    const ageMissing = hasSubmitted && !isAdult;
    const checkboxError = termsMissing && ageMissing
        ? "Please accept the terms and confirm that you are at least 18 years old."
        : termsMissing
            ? "Please accept the User Agreement and acknowledge the Privacy and Cookie Policies."
            : ageMissing ? "Please confirm that you are at least 18 years old." : null;



    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setHasSubmitted(true);
        if (!isChecked || !isAdult) {
            setIsError(true);
            return;
        }

        if (password !== confirmPassword) {
            setError(messages.passwords_do_not_match);
            setIsError(true);
            return;
        }

        if (!executeRecaptcha) {
            return;
        }

        const validatRes: string | null = validateRegistration(username, email, password);

        if (validatRes != null) {
            setIsError(true);
            setError(validatRes);
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
                adult_confirmed: isAdult,
                terms_accepted: isChecked,
            });

            if (response.status === 200 || response.status === 201) {
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
    }, [executeRecaptcha, username, password, confirmPassword, email, isChecked, isAdult]);

    const confirmRegistration = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!executeRecaptcha) {
            return;
        }

        const validatRes: string | null = validateRegistration(username, email, password);

        if (validatRes != null) {
            setIsError(true);
            setError(validatRes);
            return;
        }
        setIsError(false);
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

        setIsResending(true);
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
            setIsResending(false);
        }
    }, [executeRecaptcha, email, resendTimer]);

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

    return (
        <div className={styles.registrationPage}>
            <div className={styles.authForm}>
                <div className={styles.formTitle}>Registration</div>
                {step === 1 && (
                    <form onSubmit={handleRegister} onInvalid={() => setHasSubmitted(true)}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.inputField}
                            name="email"
                            list="emailSuggestions"
                            autoComplete="username"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.inputField}
                            autoComplete="new-password"
                            name="password"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.inputField}
                            autoComplete="new-password"
                            name="password"
                            required
                        />

                        <ErrorMessage error={checkboxError || error} isError={!!checkboxError || isError} />

                        <div className={styles.registrationNotice}>
                            <div className={`${styles.checkboxRow} ${termsMissing ? styles.checkboxRowError : ''}`}>
                                <CustomCheckbox
                                    isChecked={isChecked}
                                    onChange={setIsChecked}
                                    required
                                    labelledBy="registration-legal-label"
                                    color={termsMissing ? 'var(--error-text)' : undefined}
                                />
                                <span id="registration-legal-label">
                                    I accept the <Link to="/user-agreement" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>User Agreement</Link> and have read the <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>Privacy Policy</Link> and <Link to="/cookie-policy" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>Cookie Policy</Link>.
                                </span>
                            </div>
                            <div className={`${styles.checkboxRow} ${ageMissing ? styles.checkboxRowError : ''}`}>
                                <CustomCheckbox
                                    isChecked={isAdult}
                                    onChange={setIsAdult}
                                    required
                                    labelledBy="registration-age-label"
                                    color={ageMissing ? 'var(--error-text)' : undefined}
                                />
                                <span id="registration-age-label">I confirm that I am at least 18 years old.</span>
                            </div>
                            <p className={styles.registrationEmailNotice}>Account and security emails only; registration does not subscribe you to a newsletter.</p>
                        </div>
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
                            isLoading={isResending || resendTimer > 0}
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
