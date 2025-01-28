
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './users.module.scss';

export interface ErrorMessageProps {
    error: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({error}) => {

    return (
        <>
            {error ?
                <div
                    style={{
                        color: error.includes('ailed') || error.includes('do not match') ? 'red' : 'green',
                        fontSize: '60%',
                        width: '80%',
                        marginLeft: '10%',
                        textAlign: 'center',
                        marginBottom: '1vh'
                        // backgroundColor: 'green'
                    }}
                >
                    {error}
                </div>
            :
                <></>
            }
        </>
    );
}

export default ErrorMessage;