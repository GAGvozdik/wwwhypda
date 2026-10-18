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
    return <Modal open={open} onClose={onClose} container={() => modalRootRef.current}
        aria-labelledby={labelledBy} aria-describedby={describedBy}>
        <Box role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
            tabIndex={-1} sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(25rem, calc(100% - 2rem))', boxSizing: 'border-box',
                maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto',
                backgroundColor: 'var(--body-color)', border: '1px solid var(--menu-border)',
                outline: 'none',
                borderRadius: '25px', boxShadow: '0 0.5rem 1.5rem var(--under-body-color)',
                padding: '2rem', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
            }}>
            {children}
        </Box>
    </Modal>;
}
