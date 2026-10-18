import { Link } from 'react-router-dom';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import api from '../../api';
import messages from '../../../common/error_messages.json';
import styles from '../users.module.scss';
import UserButton from './userButton';
import ErrorMessage from './errorMessage';
import type { WithRecaptchaProps } from '../../commonFeatures/withRecaptcha';

interface RegistrationConfirmationProps extends WithRecaptchaProps {
    email: string;
    onConfirmed: (message: string) => void;
    onBack?: () => void;
    initialNotice?: string;
    initialCooldown?: number;
    onBusyChange?: (busy: boolean) => void;
}

// Shared registration step: login continuation and registration use identical actions.
export default function RegistrationConfirmation({ email, executeRecaptcha, onConfirmed, onBack,
    initialNotice = messages.email_confirmation_required, initialCooldown = 0, onBusyChange }: RegistrationConfirmationProps) {
    const [confirmationCode, setConfirmationCode] = useState('');
    const [notice, setNotice] = useState(initialNotice);
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(initialCooldown);
    const busy = useRef(false);
    const [local,domain = ''] = email.split('@');
    const suffix = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
    const maskedEmail = `${local.slice(0,1)}***@${domain.slice(0,1)}***${suffix}`;
    const codeInput = useRef<HTMLInputElement>(null);
    useEffect(() => { codeInput.current?.focus(); }, []);
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => setResendTimer(value => Math.max(0, value - 1)), 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const confirm = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy.current) return;
        if (!/^[0-9]{6}$/.test(confirmationCode)) {
            setNotice(messages.invalid_confirmation_code); setIsError(true); return;
        }
        if (!executeRecaptcha) { setNotice(messages.captcha_unavailable); setIsError(true); return; }
        busy.current = true; onBusyChange?.(true); setIsLoading(true);
        try {
            const token = await executeRecaptcha('confirm_registration');
            const response = await api.post('/users/confirm-registration', { email, code: confirmationCode, recaptcha_token: token });
            onConfirmed(response.data.message || messages.account_activated);
        } catch (failure: unknown) {
            setNotice((axios.isAxiosError<{message?: string}>(failure) ? failure.response?.data?.message : undefined) || messages.confirmation_failed);
            setIsError(true);
        } finally { busy.current = false; onBusyChange?.(false); setIsLoading(false); }
    };
    const resend = async () => {
        if (busy.current || resendTimer > 0) return;
        if (!executeRecaptcha) { setNotice(messages.captcha_unavailable); setIsError(true); return; }
        busy.current = true; onBusyChange?.(true); setIsResending(true); setNotice(''); setIsError(false);
        try {
            const token = await executeRecaptcha('resend_code');
            await api.post('/users/resend-confirmation', { email, recaptcha_token: token });
            setNotice(messages.registration_requested); setIsError(false); setResendTimer(30);
            setConfirmationCode(''); codeInput.current?.focus();
        } catch (failure: unknown) {
            setNotice((axios.isAxiosError<{message?: string}>(failure) ? failure.response?.data?.message : undefined) || messages.resend_error);
            setIsError(true);
        } finally { busy.current = false; onBusyChange?.(false); setIsResending(false); }
    };
    return <form onSubmit={confirm} aria-busy={isLoading || isResending}>
        <p className={styles.confirmationEmail}>{maskedEmail}</p>
        <input ref={codeInput} type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} aria-label={messages.confirmation_code_label}
            placeholder={messages.confirmation_code_label} className={styles.inputField}
            value={confirmationCode} onChange={event => setConfirmationCode(event.target.value)}
            disabled={isLoading || isResending} required />
        <ErrorMessage error={isError ? notice : resendTimer > 0
            ? `${notice} ${messages.resend_countdown.replace('{seconds}', String(resendTimer))}` : notice} isError={isError} />
        <UserButton text={messages.resend_code_button} isLoading={isResending} onclick={resend}
            disabled={resendTimer > 0 || isLoading} />
        <div style={{height: '0.5rem'}} />
        <UserButton text={messages.confirm_button} isLoading={isLoading} disabled={isResending} />
        {onBack && <div className={styles.confirmationBack}>
            <Link to="/login" className={styles.link} aria-disabled={isLoading || isResending}
                tabIndex={isLoading || isResending ? -1 : undefined}
                onClick={event => { event.preventDefault(); if (!busy.current) onBack(); }}>{messages.back_to_sign_in}</Link>
        </div>}
    </form>;
}
