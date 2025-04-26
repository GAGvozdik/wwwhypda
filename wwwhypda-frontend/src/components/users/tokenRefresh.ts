import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UpdateToken } from '../../redux/actions';
import axios from 'axios';

const useTokenRefresh = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const intervalId = setInterval(async () => {
            console.log('check');
            try {
                // Извлекаем CSRF токен из обычной куки
                const csrfToken = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('csrf_token='))
                    ?.split('=')[1];

                if (!csrfToken) return;

                // Попытка обновить токен
                const response = await axios.post(
                    'http://localhost:5000/users/refresh',
                    {},
                    {
                        withCredentials: true,  // Это гарантирует, что cookies отправляются
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,  // Добавляем CSRF токен в заголовок
                        },
                    }
                );

                const { message } = response.data;
                console.log(message);  // Можно логировать ответ, если нужно

            } catch (error) {
                console.error('Error refreshing token:', error);
            }
        }, 60 * 1000); // Проверка каждую минуту

        return () => clearInterval(intervalId);  // Очистка интервала при демонтировании компонента
    }, [dispatch]);
};

export default useTokenRefresh;
