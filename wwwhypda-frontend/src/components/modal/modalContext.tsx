// ModalContext.tsx
import React, { createContext, useContext, useState, ReactNode, RefObject } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import styles from './modalStyles.module.scss';

interface ModalContextProps {
    openModal: (title: string, description: string, actionButtonText: string, onAction: () => void) => void;
    closeModal: () => void;
}

interface ModalProviderProps {
    children: ReactNode;
    modalRootRef: RefObject<HTMLDivElement>;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};

export const ModalProvider = ({ children, modalRootRef }: ModalProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ReactNode>(null);

    const openModal = (title: string, description: string, actionButtonText: string, onAction: () => void) => {
        setModalContent(
            <>
                <div
                    style={{
                        color: 'var(--tree-text)',
                        fontFamily: 'Afacad_Flux !important',
                        fontSize: '2.5vh',
                        margin: '2vh',
                        textAlign: 'center',
                        fontWeight: '600',
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        color: 'var(--tree-text)',
                        fontFamily: 'Afacad_Flux !important',
                        fontSize: '2vh',
                        margin: '2vh',
                        textAlign: 'center',
                    }}
                >
                    {description}
                </div>
                <Button
                    style={{ minWidth: 220 }}
                    className={styles.submitButton}
                    onClick={() => {
                        onAction(); // вызываем переданную функцию
                        closeModal(); // Закрытие модального окна после действия
                    }}
                >
                    {actionButtonText}
                </Button>
                <Button
                    onClick={closeModal}
                    style={{ minWidth: 120, marginTop: '2vh' }}
                    className={styles.submitButton}
                >
                    Close
                </Button>
            </>
        );
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setModalContent(null);
    };

    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            <Modal
                open={isOpen}
                onClose={closeModal}
                container={modalRootRef.current || undefined}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
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
                    {modalContent}
                </Box>
            </Modal>
        </ModalContext.Provider>
    );
};
