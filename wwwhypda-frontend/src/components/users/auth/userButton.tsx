import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import styles from '../users.module.scss';

export interface UserButtonProps {
    text: string;
    isLoading: boolean;
}

const UserButton: React.FC<UserButtonProps> = ({ text, isLoading }) => {
    return (
        <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? (
                <CircularProgress
                    size={30}
                    sx={{
                        color: 'var(--border)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                />
            ) : (
                text
            )}
        </button>
    );
};

export default UserButton;
