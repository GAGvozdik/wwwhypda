import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../common/types';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const token = useSelector((state: State) => state.token);

    if (!token) {
        console.log('No token found, redirecting to login'); // Добавьте лог
        return <Navigate to="/login" />;
    }

    console.log('Token found, rendering children'); // Проверка условия
    return <>{children}</>;
};


export default ProtectedRoute;
