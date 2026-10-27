import Login from '../auth/login';
import React from 'react';
import Navigate from '../../mainWindow/RouteRedirect';
import useAuthCheck from '../useAuthCheck';
import ProtectedPageSkeleton from './ProtectedPageSkeleton';
import type { ProtectedPageKind } from './ProtectedPageSkeleton';
import LoadingSwap from '../../commonFeatures/loadingSwap';
// import LoadIcon from '../../commonFeatures/loadIcon';


interface SuperProtectedRouteProps {
    children: React.ReactNode;
    skeleton?: ProtectedPageKind;
    redirectIfSuperuser?: boolean;
}

const SuperProtectedRoute: React.FC<SuperProtectedRouteProps> = ({ children, redirectIfSuperuser = false, skeleton = 'dataset' }) => {
    const { isAuth, isSuperuser, termsRequired, showPageSkeleton } = useAuthCheck();
    const fallback=showPageSkeleton && isAuth!==false ? <ProtectedPageSkeleton kind={skeleton} /> : <Login checkingAccess />;
    if (isAuth === null || isSuperuser === null) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading fallback={fallback}>{null}</LoadingSwap>;
    }

    if (!isAuth) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} fallback={fallback}><Navigate fallback={fallback} to="/login" state={{ termsRequired }} /></LoadingSwap>;
    }

    // If the route should redirect superusers away (e.g., the /account page)
    if (redirectIfSuperuser && isSuperuser) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} fallback={fallback}><Navigate fallback={fallback} to="/superaccount" /></LoadingSwap>;
    }

    // If the route is for superusers only (original logic)
    if (!redirectIfSuperuser && !isSuperuser) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} fallback={fallback}><Navigate fallback={fallback} to="/account" /></LoadingSwap>;
    }

    return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} preserveContent fallback={fallback}><>{children}</></LoadingSwap>;
};

export default SuperProtectedRoute;
