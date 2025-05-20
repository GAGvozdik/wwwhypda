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
                    backgroundColor: 'var(--form-color)',
    
                    alignSelf: 'center',
                    justifySelf: 'center',
                    height: '40vh',

                    width: '45vh',
                    // margin-top: '15vh',
                    // margin-bottom: '3vh',
                    paddingBottom: '2vh',
                    marginTop: '21vh',

                    borderRadius: '8px',
                    fontFamily: 'Afacad_Flux !important',
                    fontSize: 'var(--head-font-size)',
                }}
            >
                <SingleSkeleton loading={true} height='' margin=''> 
                    <></>
                </SingleSkeleton>
            </div>
        );
    }

    if (!isAuth) {
        return <Navigate to="/login" />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
