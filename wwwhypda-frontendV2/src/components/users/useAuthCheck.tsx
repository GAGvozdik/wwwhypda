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
        const checkAuth = async () => {
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

                setAuth({
                    isAuth: true,
                    isSuperuser: response.data.is_superuser || false,
                });
            } catch (error) {
                setAuth({ isAuth: false, isSuperuser: false });
            }
        };

        checkAuth();
    }, [executeRecaptcha, isTestMode]);

    return auth;
};

export default useAuthCheck;