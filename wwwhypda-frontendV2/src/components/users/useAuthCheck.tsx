import axios from 'axios';
import { sessionEvent, sessionUnavailable, sessionEnded } from './accountSession';
import { useEffect, useState } from 'react';
import api from '../api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface AuthState {
    isAuth: boolean | null;
    isSuperuser: boolean | null;
}

const useAuthCheck = (): AuthState => {
    const [auth, setAuth] = useState<AuthState>({ isAuth: null, isSuperuser: null });
    const { executeRecaptcha } = useGoogleReCaptcha();
    const isTestMode = import.meta.env.VITE_CYPRESS_TEST === 'true';

    useEffect(() => {
        let cancelled = false;
        const onSessionChange = () => {
            if (sessionEnded()) setAuth({ isAuth: false, isSuperuser: false });
            else if (!sessionUnavailable()) void checkAuth();
        };
        const checkAuth = async () => {
            if (cancelled || sessionUnavailable()) return;
            if (!isTestMode && !executeRecaptcha) {
                console.error("ReCAPTCHA not available yet");
                return;
            }

            try {
                const token = isTestMode ? 'test-token' : await executeRecaptcha!('check_auth');
                const response = await api.get('/users/check', {
                    withCredentials: true,
                    headers: {
                        'X-Recaptcha-Token': token,
                    },
                });

                if (cancelled || sessionUnavailable()) return;
                setAuth({
                    isAuth: true,
                    isSuperuser: response.data.is_superuser || false,
                });
            } catch (error) {
                if (cancelled || axios.isCancel(error) || sessionUnavailable()) return;
                setAuth({ isAuth: false, isSuperuser: false });
            }
        };

        window.addEventListener(sessionEvent, onSessionChange);
        void checkAuth();
        return () => {
            cancelled = true;
            window.removeEventListener(sessionEvent, onSessionChange);
        };
    }, [executeRecaptcha, isTestMode]);

    return auth;
};

export default useAuthCheck;