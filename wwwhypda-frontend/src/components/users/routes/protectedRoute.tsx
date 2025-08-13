import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthCheck from '../useAuthCheck';
import LoadIcon from '../../commonFeatures/loadIcon';
import SingleSkeleton from '../../commonFeatures/singleSkeleton';
import styles from '../users.module.scss';
interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuth } = useAuthCheck();

    if (isAuth === null) {
        return (
            <div className={styles.skeletonContainer}>
                <div 
                    className={styles.skeletonAuthForm}
                    style={{ height: '40vh' }}
                >
                    <SingleSkeleton loading={true} height='' margin=''> 
                        <></>
                    </SingleSkeleton>
                </div>
            </div>
        );
    }
    const delay = (ms: number) => { const end = Date.now() + ms; while (Date.now() < end) {} };
    // delay(1000);

    if (!isAuth) {
        return <Navigate to="/login" />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
