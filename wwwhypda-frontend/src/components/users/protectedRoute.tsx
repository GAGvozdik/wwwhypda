import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../common/types';
import isTokenValid  from '../../redux/initAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const token = useSelector((state: State) => state.token);

    // Проверка валидности токена
    const valid = token && isTokenValid(token);

    if (!valid) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;




