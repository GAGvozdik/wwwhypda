import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import LoadIcon from '../../commonFeatures/loadIcon';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuth } = useAuthCheck();
    console.log('5');
    if (isAuth === null) {
        console.log('6');
        return <LoadIcon size={60}/>;
    }

    if (!isAuth) {
        console.log('7');
        return <Navigate to="/login" />;
    }
    console.log('8');
    return <>{children}</>;
};

export default ProtectedRoute;
