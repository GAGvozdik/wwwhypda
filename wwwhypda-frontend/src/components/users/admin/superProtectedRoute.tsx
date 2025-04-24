import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';

interface SuperProtectedRouteProps {
    children: React.ReactNode;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children }) => {
    const isAuth = useAuthCheck();
    const isSuperuser = localStorage.getItem('is_superuser');

    // Если проверка аутентификации ещё не завершена, показываем сообщение или спиннер
    if (isAuth === null) {
        return <div>Checking authentication...</div>;
    }

    // Если пользователь не авторизован, редиректим на страницу логина
    if (!isAuth) {
        return <Navigate to="/login" />;
    }

    // Если это не суперпользователь, редиректим на обычный аккаунт
    if (!isSuperuser) {
        return <Navigate to="/account" />;
    }

    // Если все проверки пройдены, отображаем дочерние элементы
    return <>{children}</>;
};

export default SuperProtectedRoute;
