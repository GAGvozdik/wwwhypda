import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Account from '../accounts/account';

const SuperuserAccountRedirect: React.FC = () => {
    const navigate = useNavigate();
    const isSuperuser = localStorage.getItem('isSuperuser') === 'true';

    useEffect(() => {
        if (isSuperuser) {
            navigate('/superaccount', { replace: true });
        }
    }, [isSuperuser, navigate]);

    return isSuperuser ? null : <Account />;
};

export default SuperuserAccountRedirect;
