import axios from 'axios';
import { sessionEvent, sessionUnavailable } from './accountSession';
import { useEffect } from 'react';
// import axios from 'axios';
import api from '../api';

const useTokenRefresh = () => {
    useEffect(() => {
        let disposed = false;
        let busy = false;
        const refreshAccessToken = async () => {
            if (disposed || busy || sessionUnavailable()) return;
            busy = true;
            try {
                const csrfRefreshToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('csrf_refresh_token='))
                    ?.split('=')[1];

                if (!csrfRefreshToken) {
                    console.warn('Missing CSRF refresh token, skipping refresh.');
                    return;
                }

                const response = await api.post(
                    '/users/refresh',
                    {},
                    {
                        withCredentials: true,
                        headers: {
                            'X-CSRF-TOKEN': csrfRefreshToken,
                        },
                    }
                );

                if (disposed || sessionUnavailable() || response.status !== 200) return;

                // ⏩ После успешного рефреша сразу проверяем пользователя
                await refreshUserData();

            } catch (error: unknown) {
                if (!axios.isCancel(error)) console.warn('Session refresh failed');
            } finally {
                busy = false;
            }
        };

        const refreshUserData = async () => {
            if (disposed || sessionUnavailable()) return;
            try {
                const res = await api.get('/users/check', { withCredentials: true });
                if (res.status !== 200) console.warn('Session check failed');

            } catch (error) {
                if (!axios.isCancel(error)) console.warn('Session check failed');
            }
        };

        let intervalId: ReturnType<typeof setInterval> | undefined;
        const onSessionChange = () => {
            if (intervalId) clearInterval(intervalId);
            intervalId = undefined;
            if (!sessionUnavailable() && !disposed) {
                intervalId = setInterval(() => {
                    void refreshAccessToken();
                }, 1 * 20 * 1000); // каждые 20 секунд
            }
        };
        onSessionChange();
        window.addEventListener(sessionEvent, onSessionChange);
        return () => {
            disposed = true;
            clearInterval(intervalId);
            window.removeEventListener(sessionEvent, onSessionChange);
        };
    }, []);
};

export default useTokenRefresh;
