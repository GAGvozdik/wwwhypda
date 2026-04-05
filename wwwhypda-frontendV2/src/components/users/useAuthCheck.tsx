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

    useEffect(() => {
        const checkAuth = async () => {
            if (!executeRecaptcha) {
                console.error("ReCAPTCHA not available yet");
                return;
            }

            try {
                const token = await executeRecaptcha('check_auth');
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
    }, [executeRecaptcha]);

    return auth;
};

export default useAuthCheck;