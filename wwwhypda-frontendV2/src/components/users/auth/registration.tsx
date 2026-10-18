import AuthSkeleton from '../../commonFeatures/authSkeleton';
import axios from 'axios';
import CustomCheckbox from '../../commonFeatures/customCheckbox';
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from '../users.module.scss';
import ErrorMessage from './errorMessage';
import RegistrationConfirmation from './registrationConfirmation';
import UserButton from './userButton';
import api from '../../api';
import messages from '../../../common/error_messages.json';
import { USER_AGREEMENT_VERSION } from '../../../common/userAgreementVersion';
import withRecaptcha from '../../commonFeatures/withRecaptcha';
import type{ WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';
import { validateRegistration } from './validation';

const Register: React.FC<WithRecaptchaProps> = ({ executeRecaptcha }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const pendingRequest = useRef(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [isError, setIsError] = useState<boolean>(false);
    const navigate = useNavigate();
    const [isChecked, setIsChecked] = useState(false);
    const [isAdult, setIsAdult] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [termsVersionError, setTermsVersionError] = useState(false);
    const termsMissing = hasSubmitted && !isChecked;
    const ageMissing = hasSubmitted && !isAdult;
    const checkboxError = termsMissing && ageMissing
        ? messages.terms_and_age_required
        : termsMissing
            ? messages.terms_required
            : ageMissing ? messages.age_required : null;



    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (pendingRequest.current) return;
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
            setError(messages.captcha_unavailable);
            setIsError(true);
            return;
        }

        const validatRes: string | null = validateRegistration(username, email, password);

        if (validatRes != null) {
            setIsError(true);
            setError(validatRes);
            return;
        }
        setTermsVersionError(false);
        pendingRequest.current = true;
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
                terms_version: USER_AGREEMENT_VERSION,
            });

            if (response.status === 200 || response.status === 201) {
                setError(messages.registration_requested);
                setIsError(false);
                setStep(2);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError<{ message?: string; code?: string }>(err) && err.response?.data) {
                if (err.response.data.code === 'terms_version_mismatch' || err.response.data.code === 'terms_version_required') {
                    setStep(1);
                    setIsChecked(false);
                    setTermsVersionError(true);
                    setError(messages.terms_version_error);
                } else if (err.response.data.message) {
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
            pendingRequest.current = false;
            setIsLoading(false);
        }
    }, [executeRecaptcha, username, password, confirmPassword, email, isChecked, isAdult]);

    return (
        <div className={styles.registrationPage}>
            <AuthSkeleton loading={isLoading}><div className={styles.authForm}>
                <div className={styles.formTitle}>{messages.registration_title}</div>
                {step === 1 && (
                    <form onSubmit={handleRegister} onInvalid={() => setHasSubmitted(true)}>
                        <input
                            type="email"
                            placeholder={messages.email_label}
                            aria-label={messages.email_label}
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
                            placeholder={messages.username_label}
                            aria-label={messages.username_label}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.inputField}
                            required
                        />
                        <input
                            type="password"
                            placeholder={messages.password_label}
                            aria-label={messages.password_label}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.inputField}
                            autoComplete="new-password"
                            name="password"
                            required
                        />
                        <input
                            type="password"
                            placeholder={messages.confirm_password_label}
                            aria-label={messages.confirm_password_label}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={styles.inputField}
                            autoComplete="new-password"
                            name="password"
                            required
                        />

                        <ErrorMessage error={termsVersionError ? error : checkboxError || error} isError={!!checkboxError || isError} />

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
                                    {messages.accept_terms_prefix} <Link to="/user-agreement" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>{messages.user_agreement}</Link> {messages.read_policy_prefix} <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>{messages.privacy_policy}</Link> {messages.and} <Link to="/cookie-policy" target="_blank" rel="noopener noreferrer" className={styles.policyLink}>{messages.cookie_policy}</Link>.
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
                                <span id="registration-age-label">{messages.age_confirmation}</span>
                            </div>
                            <p className={styles.registrationEmailNotice}>{messages.registration_email_notice}</p>
                        </div>
                        <UserButton text={messages.register_button} isLoading={isLoading} />

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
                {step === 2 && <RegistrationConfirmation key={email} email={email}
                    onBusyChange={setIsLoading} executeRecaptcha={executeRecaptcha} initialNotice={messages.registration_requested} initialCooldown={30}
                    onConfirmed={message => navigate('/login', {state: {message, email}})} />}

            </div></AuthSkeleton>
        </div>
    );
};

export default withRecaptcha(Register);
