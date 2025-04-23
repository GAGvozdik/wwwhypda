import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { State } from '../../common/types';
import isTokenValid from './initAuth';

const SuperProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const token = useSelector((state: State) => state.token);
    // const is_superuser = useSelector((state: State) => state.is_superuser);
    const valid = token && isTokenValid(token);
    const is_superuser = localStorage.getItem('is_superuser');

    if (!valid) return <Navigate to="/login" />;
    if (!is_superuser) return <Navigate to="/account" />; // 👈 не пускаем, если не суперюзер

    return <>{children}</>;
};

export default SuperProtectedRoute;
