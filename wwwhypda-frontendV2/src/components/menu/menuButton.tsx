import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import styles from "./menuStyles.module.scss";
import { Link } from 'react-router-dom';

interface MenuButtonProps {
    className: string;
    children?: ReactNode;
    path?: string;
    onClick?: () => void;
    'aria-label'?: string;
    'aria-expanded'?: boolean;
    'aria-controls'?: string;
}

export default function MenuButton({ children, className, path, onClick, ...accessibility }: MenuButtonProps) {
    // let isDarkTheme = useSelector((state: State) => state.isDarkTheme);
    return path ? (
        <Button component={Link} to={path} className={`${className} ${styles.menuLabel}`} {...accessibility}>
            {children}
        </Button>
    ) : (
        <Button className={`${className} ${styles.menuLabel}`} onClick={onClick} {...accessibility}>
            {children}
        </Button>
    );
}
