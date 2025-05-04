import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import styles from './modalStyles.module.scss';

interface BasicButtonProps {
    text: string;
    handleOpen: () => void;
}

const BasicButton: React.FC<BasicButtonProps> = ({ text, handleOpen }) => {
    return (
        <Stack spacing={2} direction="row">
            <Button  onClick={handleOpen} className={styles.submitButton}>{text}</Button>
        </Stack>
    );
};

export default BasicButton;