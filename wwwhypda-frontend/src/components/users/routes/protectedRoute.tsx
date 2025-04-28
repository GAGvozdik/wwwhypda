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
            <div 
                // className={styles.authForm}
                style={{      
                    alignSelf: 'center',
                    justifySelf: 'center',
                    width: '45vh',
                    height: '50%',
                    marginTop: '15vh',
                    marginBottom: '3vh',
                    // borderRadius: '8px',
                    // border: '3px solid var(--border)',
                }}
            >
                <SingleSkeleton loading={true}> 
                    <div></div>
                </SingleSkeleton>
            </div>);
    }

    if (!isAuth) {
        return <Navigate to="/login" />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
