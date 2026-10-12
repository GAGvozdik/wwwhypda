import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import styles from '../users.module.scss';

export interface UserButtonProps {
    text: string;
    isLoading: boolean;
    onclick?: () => void;
    disabled?: boolean;
}

const UserButton: React.FC<UserButtonProps> = ({ text, isLoading, onclick, disabled }) => {
    return (
        <button
            type={onclick ? "button" : "submit"}
            className={styles.submitButton}
            disabled={isLoading || disabled}
            aria-busy={isLoading}
            onClick={onclick ? onclick : undefined}
        >
            {isLoading ? (
                <CircularProgress
                    size="1.5rem"
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
