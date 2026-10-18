import { maintenanceActive, maintenanceEvent } from '../commonFeatures/maintenanceState';
import axios from 'axios';
import { sessionEvent, sessionUnavailable, sessionEnded, termsEvent, termsAcceptanceRequired } from './accountSession';
import { useEffect, useState } from 'react';
import api from '../api';

interface AuthState {
    isAuth: boolean | null;
    isSuperuser: boolean | null;
    termsRequired: boolean;
}

const useAuthCheck = (): AuthState => {
    const [auth, setAuth] = useState<AuthState>({ isAuth: null, isSuperuser: null, termsRequired: false });

    useEffect(() => {
        let cancelled = false;
        const onSessionChange = () => {
            if (sessionEnded()) setAuth({ isAuth: false, isSuperuser: false, termsRequired: termsAcceptanceRequired() });
            else if (!sessionUnavailable()) void checkAuth();
        };
        const checkAuth = async () => {
            if (cancelled || sessionUnavailable()) return;
            if (termsAcceptanceRequired()) {
                setAuth({ isAuth: false, isSuperuser: false, termsRequired: true });
                return;
            }
            try {
                const response = await api.get('/users/check', { withCredentials: true });

                if (cancelled || sessionUnavailable()) return;
                setAuth({
                    isAuth: true,
                    termsRequired: false,
                    isSuperuser: response.data.is_superuser || false,
                });
            } catch (error) {
                if (cancelled || axios.isCancel(error) || sessionUnavailable() || maintenanceActive()) return;
                setAuth({ isAuth: false, isSuperuser: false, termsRequired: termsAcceptanceRequired() });
            }
        };

        const maintenanceChanged = () => { if (!maintenanceActive()) void checkAuth(); };
        window.addEventListener(maintenanceEvent, maintenanceChanged);
        window.addEventListener(sessionEvent, onSessionChange);
        window.addEventListener(termsEvent, onSessionChange);
        void checkAuth();
        return () => {
            cancelled = true;
            window.removeEventListener(maintenanceEvent, maintenanceChanged);
            window.removeEventListener(sessionEvent, onSessionChange);
            window.removeEventListener(termsEvent, onSessionChange);
        };
    }, []);

    return auth;
};

export default useAuthCheck;