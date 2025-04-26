import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import LoadIcon from '../../commonFeatures/loadIcon';


interface SuperProtectedRouteProps {
    children: React.ReactNode;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children }) => {
    const { isAuth, isSuperuser } = useAuthCheck();
    console.log('10');
    if (isAuth === null || isSuperuser === null) {
        console.log('11');
        return <LoadIcon size={60}/>;
    }

    if (!isAuth) {
        console.log('12');
        return <Navigate to="/login" />;
    }

    if (!isSuperuser) {
        console.log('13');
        return <Navigate to="/account" />;
    }

    return <>{children}</>;
};

export default SuperProtectedRoute;
