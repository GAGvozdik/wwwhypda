import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    RefObject,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import styles from './modalStyles.module.scss';

interface ModalButton {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary'; // на будущее для кастомизации
}

interface OpenModalOptions {
    title: string;
    description?: string;
    buttons: ModalButton[];
}

interface ModalContextProps {
    openModal: (options: OpenModalOptions) => void;
    legacyOpenModal: (
        title: string,
        description: string,
        actionButtonText: string,
        onAction: () => void
    ) => void;
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
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children, modalRootRef }: ModalProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ReactNode>(null);

    const openModal = ({ title, description, buttons }: OpenModalOptions) => {
        setModalContent(
            <>
                <div className={styles.modalTitle}>{title}</div>
                {description && <div className={styles.modalDescription}>{description}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh', marginTop: '2vh' }}>
                    {buttons.map((btn, idx) => (
                        <Button
                            key={idx}
                            style={{ minWidth: 200 }}
                            className={styles.submitButton}
                            onClick={() => {
                                btn.onClick();
                                closeModal();
                            }}
                        >
                            {btn.label}
                        </Button>
                    ))}
                </div>
            </>
        );
        setIsOpen(true);
    };

    const legacyOpenModal = (
        title: string,
        description: string,
        actionButtonText: string,
        onAction: () => void
    ) => {
        openModal({
            title,
            description,
            buttons: [
                {
                    label: actionButtonText,
                    onClick: onAction,
                },
                {
                    label: 'Close',
                    onClick: () => {},
                },
            ],
        });
    };

    const closeModal = () => {
        setIsOpen(false);
        setModalContent(null);
    };

    return (
        <ModalContext.Provider value={{ openModal, legacyOpenModal, closeModal }}>
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
