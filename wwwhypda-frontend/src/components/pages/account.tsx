// import React from 'react';
import styles from '../menu.module.scss';

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Logout } from '../../redux/actions';


const Account: React.FC = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        // Очищаем токен из Redux
        dispatch(Logout());

        // Перенаправляем на страницу входа
        navigate('/login');
    };

    return (

        <div className={styles.authForm}>
            <h2 className={styles.formTitle}> Your account</h2>
            <button onClick={handleLogout} className={styles.submitButton}>Log Out</button>
        </div>
    );
};

export default Account;

