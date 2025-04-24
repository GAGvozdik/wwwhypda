import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from './useAuthCheck';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const isAuth = useAuthCheck();

    if (isAuth === null) {
        console.log('isAuth === null')
        return <div>Checking authentication...</div>;  // Показываем спиннер или сообщение
    }

    if (!isAuth) {
        console.log('не авторизован, редиректим на /login')
        return <Navigate to="/login" />;  // Если не авторизован, редиректим на /login
    }
    console.log('авторизован, показываем дочерние элементы')
    return <>{children}</>;  // Если авторизован, показываем дочерние элементы
};

export default ProtectedRoute;
