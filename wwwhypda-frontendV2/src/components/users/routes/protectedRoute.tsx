import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
// import LoadIcon from '../../commonFeatures/loadIcon';
import Login from '../auth/login';
import LoadingSwap from '../../commonFeatures/loadingSwap';
interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuth, termsRequired } = useAuthCheck();

    if (isAuth === null) {
        return <LoadingSwap loading fallback={<Login checkingAccess />}>{null}</LoadingSwap>;
    }
    // const delay = (ms: number) => { const end = Date.now() + ms; while (Date.now() < end) {} };
    // delay(1000);

    if (!isAuth) {
        return <LoadingSwap loading={false} fallback={<Login checkingAccess />}><Navigate to="/login" state={{ termsRequired }} /></LoadingSwap>;
    }
    return <LoadingSwap loading={false} preserveContent fallback={<Login checkingAccess />}><>{children}</></LoadingSwap>;
};

export default ProtectedRoute;
