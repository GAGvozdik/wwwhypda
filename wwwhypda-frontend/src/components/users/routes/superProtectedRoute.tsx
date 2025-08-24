import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import LoadIcon from '../../commonFeatures/loadIcon';


interface SuperProtectedRouteProps {
    children: React.ReactNode;
    redirectIfSuperuser?: boolean;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children, redirectIfSuperuser = false }) => {
    const { isAuth, isSuperuser } = useAuthCheck();
    if (isAuth === null || isSuperuser === null) {
        return <></>;
    }

    if (!isAuth) {
        return <Navigate to="/login" />;
    }

    // If the route should redirect superusers away (e.g., the /account page)
    if (redirectIfSuperuser && isSuperuser) {
        return <Navigate to="/superaccount" />;
    }

    // If the route is for superusers only (original logic)
    if (!redirectIfSuperuser && !isSuperuser) {
        return <Navigate to="/account" />;
    }

    return <>{children}</>;
};

export default SuperProtectedRoute;
