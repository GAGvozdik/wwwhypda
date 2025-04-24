import { useEffect, useState } from 'react';
import axios from 'axios';

const useAuthCheck = () => {
    const [isAuth, setIsAuth] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await axios.get('http://localhost:5000/users/check', {
                    withCredentials: true,
                });
                setIsAuth(res.status === 200);  // Устанавливаем в true, если статус 200
            } catch (err) {
                setIsAuth(false);  // Устанавливаем в false, если ошибка
            }
        };

        checkAuth();
    }, []);  // Запускается только один раз при монтировании компонента

    return isAuth;
};

export default useAuthCheck;
