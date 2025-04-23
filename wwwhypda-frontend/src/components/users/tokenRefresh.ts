import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UpdateToken } from '../../redux/actions';
import axios from 'axios';

const useTokenRefresh = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const intervalId = setInterval(async () => {
            console.log('setInt');
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                const expirationTime = decodedToken.exp * 1000;
                const currentTime = Date.now();

                if (expirationTime - currentTime <= 1 * 60 * 1000) {
                    console.log('⏳ Refreshing token...');
                    const response = await axios.post(
                        'http://localhost:5000/users/refresh',
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const { token: newToken } = response.data.data;
                    dispatch(UpdateToken(newToken));
                    localStorage.setItem('token', newToken);
                }
            } catch (error) {
                console.error('Error checking or refreshing token:', error);
            }
        }, 1 * 60 * 1000); // проверка каждую минуту

        return () => clearInterval(intervalId);
    }, [dispatch]);
};

export default useTokenRefresh;
