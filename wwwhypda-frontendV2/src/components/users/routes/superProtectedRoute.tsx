import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import Login from '../auth/login';
import LoadingSwap from '../../commonFeatures/loadingSwap';
// import LoadIcon from '../../commonFeatures/loadIcon';


interface SuperProtectedRouteProps {
    children: React.ReactNode;
    redirectIfSuperuser?: boolean;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children, redirectIfSuperuser = false }) => {
    const { isAuth, isSuperuser, termsRequired } = useAuthCheck();
    if (isAuth === null || isSuperuser === null) {
        return <LoadingSwap loading fallback={<Login checkingAccess />}>{null}</LoadingSwap>;
    }

    if (!isAuth) {
        return <LoadingSwap loading={false} fallback={<Login checkingAccess />}><Navigate to="/login" state={{ termsRequired }} /></LoadingSwap>;
    }

    // If the route should redirect superusers away (e.g., the /account page)
    if (redirectIfSuperuser && isSuperuser) {
        return <LoadingSwap loading={false} fallback={<Login checkingAccess />}><Navigate to="/superaccount" /></LoadingSwap>;
    }

    // If the route is for superusers only (original logic)
    if (!redirectIfSuperuser && !isSuperuser) {
        return <LoadingSwap loading={false} fallback={<Login checkingAccess />}><Navigate to="/account" /></LoadingSwap>;
    }

    return <LoadingSwap loading={false} preserveContent fallback={<Login checkingAccess />}><>{children}</></LoadingSwap>;
};

export default SuperProtectedRoute;
