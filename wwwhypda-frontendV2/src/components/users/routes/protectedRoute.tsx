import Login from '../auth/login';
import React from 'react';
import Navigate from '../../mainWindow/RouteRedirect';
import useAuthCheck from '../useAuthCheck';
// import LoadIcon from '../../commonFeatures/loadIcon';
import ProtectedPageSkeleton from './ProtectedPageSkeleton';
import type { ProtectedPageKind } from './ProtectedPageSkeleton';
import LoadingSwap from '../../commonFeatures/loadingSwap';
interface ProtectedRouteProps {
    children: React.ReactNode;
    skeleton?: ProtectedPageKind;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, skeleton = 'dataset' }) => {
    const { isAuth, termsRequired, showPageSkeleton } = useAuthCheck();
    const fallback=showPageSkeleton && isAuth!==false ? <ProtectedPageSkeleton kind={skeleton} /> : <Login checkingAccess />;

    if (isAuth === null) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading fallback={fallback}>{null}</LoadingSwap>;
    }
    // const delay = (ms: number) => { const end = Date.now() + ms; while (Date.now() < end) {} };
    // delay(1000);

    if (!isAuth) {
        return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} fallback={fallback}><Navigate fallback={fallback} to="/login" state={{ termsRequired }} /></LoadingSwap>;
    }
    return <LoadingSwap coordinatePage animateEnter={false} animateSwap={false} loading={false} preserveContent fallback={fallback}><>{children}</></LoadingSwap>;
};

export default ProtectedRoute;
