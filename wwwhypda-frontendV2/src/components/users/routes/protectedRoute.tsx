import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
// import LoadIcon from '../../commonFeatures/loadIcon';
import Login from '../auth/login';
interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuth, termsRequired } = useAuthCheck();

    if (isAuth === null) {
        return <Login checkingAccess />;
    }
    // const delay = (ms: number) => { const end = Date.now() + ms; while (Date.now() < end) {} };
    // delay(1000);

    if (!isAuth) {
        return <Navigate to="/login" state={{ termsRequired }} />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
