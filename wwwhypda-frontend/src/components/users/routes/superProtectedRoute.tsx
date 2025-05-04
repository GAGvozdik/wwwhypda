import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import LoadIcon from '../../commonFeatures/loadIcon';


interface SuperProtectedRouteProps {
    children: React.ReactNode;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children }) => {
    const { isAuth, isSuperuser } = useAuthCheck();
    if (isAuth === null || isSuperuser === null) {
        return <></>;
    }

    if (!isAuth) {
        return <Navigate to="/login" />;
    }

    if (!isSuperuser) {
        return <Navigate to="/account" />;
    }

    return <>{children}</>;
};

export default SuperProtectedRoute;
