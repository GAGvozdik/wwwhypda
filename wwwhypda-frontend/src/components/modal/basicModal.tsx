import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import styles from './modalStyles.module.scss';
import Stack from '@mui/material/Stack';
import { useSelector, useDispatch } from 'react-redux';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';

interface BasicModalProps {
    children: React.ReactNode;
    trigger: React.ReactNode;
}

export default function BasicModal({ children, trigger }: BasicModalProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null); // ✅ создаём реф

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const triggerWithHandler = React.cloneElement(
        trigger as React.ReactElement,
        { onClick: handleOpen }
    );
    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  

    return (
        <div ref={containerRef} className={`${isDarkTheme ? styles.dark : ''}`}>

        </div>
    );
}
