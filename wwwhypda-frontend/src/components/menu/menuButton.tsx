import * as React from 'react';
import Button from '@mui/material/Button';
import styles from "./menuStyles.module.scss" 
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

interface MenuButtonProps {
    className: string;
    children?: React.ReactNode;
    path?: string;
    onClick?: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ children, className, path, onClick }) => {
    // let isDarkTheme = useSelector((state: State) => state.isDarkTheme); 
    return (
        <>
        {onClick ? 
            <Button className={className} style={{padding: '0px'}} onClick={onClick}>
                {path ? (
                    <Link to={path} className={styles.menuLabel}>
                        {children}
                    </Link>
                ) : (
                    <div className={styles.menuLabel}>
                        {children}
                    </div>
                )}
            </Button>
            :
            <Button className={className} style={{padding: '0px'}}>
                {path ? (
                    <Link to={path} className={styles.menuLabel}>
                        {children}
                    </Link>
                ) : (
                    <div className={styles.menuLabel}>
                        {children}
                    </div>
                )}
            </Button>
        }
        </>
    );
}

export default MenuButton;




