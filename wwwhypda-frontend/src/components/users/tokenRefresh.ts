import { useEffect } from 'react';
import axios from 'axios';

const useTokenRefresh = () => {
    useEffect(() => {
        const refreshAccessToken = async () => {
            try {
                const csrfRefreshToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('csrf_refresh_token='))
                    ?.split('=')[1];

                if (!csrfRefreshToken) {
                    console.warn('Missing CSRF refresh token, skipping refresh.');
                    return;
                }

                const response = await axios.post(
                    'http://localhost:5000/users/refresh',
                    {},
                    {
                        withCredentials: true,
                        headers: {
                            'X-CSRF-TOKEN': csrfRefreshToken,
                        },
                    }
                );

                console.log(response.data.message || 'Access token refreshed successfully');

                // ⏩ После успешного рефреша сразу проверяем пользователя
                await refreshUserData();

            } catch (error: any) {
                console.error('Error refreshing access token:', error.response?.data || error.message);

                if (error.response?.status === 401) {
                    console.error('Unauthorized! Refresh token is missing or expired.');
                }
            }
        };

        const refreshUserData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/users/check', {
                    withCredentials: true,
                });

                console.log('User checked:', res.data);
                // 🔥 Тут ты можешь обновить состояние пользователя, например:
                // dispatch(setUser(res.data))

            } catch (error) {
                console.error('Error checking user:', error);
            }
        };

        const intervalId = setInterval(() => {
            console.log('token refreshing');
            refreshAccessToken();
        }, 1 * 20 * 1000); // каждые 20 секунд

        return () => clearInterval(intervalId);
    }, []);
};

export default useTokenRefresh;
