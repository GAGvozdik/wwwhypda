import { useDialogMotion } from '../../modal/useDialogMotion';
import { useRef, useState } from 'react';
import axios from 'axios';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { getCsrfTokenFromCookie } from '../../../common/types';
import type { State } from '../../../common/types';
import messages from '../../../common/error_messages.json';
import palette from '../../menu.module.scss';
import styles from './accountsStyles.module.scss';
import { pauseAccountSession, resumeAccountSession, endAccountSession } from '../accountSession';

export default function DeleteAccount() {
    const duration = useDialogMotion();
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const busy = useRef(false);
    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);
    const navigate = useNavigate();

    const close = () => {
        if (busy.current) return;
        setOpen(false);
        setPassword('');
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy.current) return;
        setError('');
        if (!password) { setError(messages.password_required); return; }
        const csrf = getCsrfTokenFromCookie();
        if (!csrf) { setError(messages.csrf_missing); return; }
        busy.current = true;
        setPending(true);
        pauseAccountSession();
        try {
            await api.delete('/users/me', {
                data: { password },
                withCredentials: true,
                headers: { 'X-CSRF-TOKEN': csrf },
            });
            setPassword('');
            endAccountSession();
            navigate('/', { replace: true });
        } catch (failure: unknown) {
            resumeAccountSession();
            const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
            setError(status === 403 ? messages.account_delete_password_invalid :
                status === 401 ? messages.account_delete_session_invalid :
                status === 400 ? messages.captcha_unavailable : messages.account_delete_failed);
        } finally {
            busy.current = false;
            setPending(false);
        }
    };

    return <div className={styles.deleteAction}>
        <Button className={styles.deleteButton} onClick={() => { setError(''); setOpen(true); }}>{messages.account_delete_button}</Button>
        <Dialog open={open} onClose={close} transitionDuration={duration}
            slotProps={{backdrop:{transitionDuration:duration},transition:{onExited:() => setError('')}}} aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            className={`${styles.deleteDialog} ${isDarkTheme ? palette.dark : ''}`}>
            <form onSubmit={submit} noValidate inert={!open} aria-hidden={!open || undefined}>
                <DialogTitle id="delete-account-title">{messages.account_delete_title}</DialogTitle>
                <DialogContent>
                    <p id="delete-account-description">{messages.account_delete_description}</p>
                    <label htmlFor="delete-account-password">{messages.current_password}</label>
                    <input id="delete-account-password" className={styles.deletePassword}
                        type="password" autoComplete="current-password" autoFocus
                        value={password} onChange={(event) => setPassword(event.target.value)}
                        disabled={pending} required aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'delete-account-error' : undefined} />
                    {error && <p id="delete-account-error" className={styles.deleteError} role="alert">{error}</p>}
                    {pending && <p role="status" aria-live="polite">{messages.account_delete_pending}</p>}
                </DialogContent>
                <DialogActions>
                    <Button type="button" className={styles.deleteButton} onClick={close} disabled={pending}>{messages.cancel}</Button>
                    <Button type="submit" className={styles.deleteButton} disabled={pending}>{messages.account_delete_confirm}</Button>
                </DialogActions>
            </form>
        </Dialog>
    </div>;
}
