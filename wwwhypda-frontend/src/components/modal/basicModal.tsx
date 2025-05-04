import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import styles from './modalStyles.module.scss';
import Stack from '@mui/material/Stack';

interface BasicModalProps {
    children: React.ReactNode;
}

export default function BasicModal({ children }: BasicModalProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null); // ✅ создаём реф

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    return (
        <div ref={containerRef}>
            <Stack>
                <Button
                    onClick={handleOpen}
                    className={styles.submitButton}
                    style={{ minWidth: 120 }}
                >
                    Submit
                </Button>
            </Stack>

            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
                container={containerRef.current} // ✅ указываем контейнер
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        backgroundColor: 'var(--body-color)',
                        border: '4px solid var(--border)',
                        borderRadius: '25px',
                        boxShadow: 24,
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            color: 'var(--tree-text)',
                            fontFamily: 'Afacad_Flux !important',
                            fontSize: '3vh',
                            margin: '2vh',
                        }}
                    >
                        Do you want to submit data?
                    </div>

                    {children}
                </Box>
            </Modal>
        </div>
    );
}
