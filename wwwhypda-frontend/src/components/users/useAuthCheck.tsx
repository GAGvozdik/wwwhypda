import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api';

interface AuthState {
    isAuth: boolean | null;
    isSuperuser: boolean | null;
}

const useAuthCheck = (): AuthState => {
    const [auth, setAuth] = useState<AuthState>({ isAuth: null, isSuperuser: null });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await api.get('/users/check', {
                    withCredentials: true,
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
    }, []); // Вызывается только один раз при монтировании компонента

    return auth;
};

export default useAuthCheck;
