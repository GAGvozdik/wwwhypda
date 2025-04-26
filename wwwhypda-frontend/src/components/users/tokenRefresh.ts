import { useEffect } from 'react';
import axios from 'axios';

const useTokenRefresh = () => {
    useEffect(() => {
        const refreshAccessToken = async () => {
            try {
                console.log('Current cookies:', document.cookie);

                const csrfRefreshToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('csrf_refresh_token='))
                    ?.split('=')[1];

                console.log('csrfRefreshToken:', csrfRefreshToken);

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

            } catch (error: any) {
                console.error('Error refreshing access token:', error.response?.data || error.message);

                if (error.response?.status === 401) {
                    console.error('Unauthorized! Refresh token is missing or expired.');
                }
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
