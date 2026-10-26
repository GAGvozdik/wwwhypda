import { useState } from 'react';
import Fade from '@mui/material/Fade';
import { useDialogMotion } from './useDialogMotion';
import styles from './modalWindow.module.scss';
import type { ReactNode, RefObject } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';

interface ModalWindowProps {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    modalRootRef: RefObject<HTMLDivElement | null>;
    labelledBy: string;
    describedBy?: string;
}

// Shared shell for submission/edit choices and controlled interactive dialogs.
export default function ModalWindow({ children, open, onClose, modalRootRef, labelledBy, describedBy }: ModalWindowProps) {
    const duration = useDialogMotion();
    const [retained, setRetained] = useState(children);
    // A caller may clear children as it closes; keep the last visible body through the exit.
    if (open && retained !== children) setRetained(children);
    return <Modal closeAfterTransition slotProps={{backdrop:{transitionDuration:duration}}} open={open} onClose={onClose} container={() => modalRootRef.current}
        aria-labelledby={labelledBy} aria-describedby={describedBy}>
        <Fade in={open} timeout={duration} onExited={() => { if (!open) setRetained(null); }}>
        <Box className={styles.surface} inert={!open} aria-hidden={!open || undefined} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
            tabIndex={-1} sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(25rem, calc(100% - 2rem))', boxSizing: 'border-box',
                maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto',
                backgroundColor: 'var(--body-color)',
                outline: 'none',
                padding: '2rem', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
            }}>
            {open ? children : retained}
        </Box>
        </Fade>
    </Modal>;
}
