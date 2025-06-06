// import * as React from 'react';

import MenuButtuon from './menuButton';
import {useEffect, useState, useRef} from 'react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import IconButton from '@mui/material/IconButton';
import styles from "./menuStyles.module.scss" 

import { useSelector, useDispatch } from 'react-redux';
import { UpdateTheme, UpdateOpenClose } from '../../redux/actions';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ClearIcon from '@mui/icons-material/Clear';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LanguageIcon from '@mui/icons-material/Language';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import useAuthCheck from '../users/useAuthCheck';

export default function MainMenu() {


    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  
    const dispatch = useDispatch();

    const toggleTheme = () => {
        dispatch<UpdateThemeAction>(UpdateTheme(!isDarkTheme)); 
        localStorage.setItem("isDarkTheme", String(!isDarkTheme));
    };

    let isOpenNow = useSelector((state: State) => state.open);  

    const toggleOpen = () => {
        dispatch<UpdateOpenCloseAction>(UpdateOpenClose(!isOpenNow)); 
    };

    const isSuperuser = localStorage.getItem('isSuperuser');
    console.log('isSuperuser in main menu', isSuperuser);

    return (

        <div className={`${styles.mainMenuItems} ${isDarkTheme ? styles.dark : ''}`}>
            
            <MenuButtuon 
                className={`${styles.drawerItem} ${styles.menuButton}`} 
                onClick={toggleOpen}
            >
                <IconButton className={`${styles.drawerButton}`} style={{}}>
                    {isOpenNow ? 
                        <MenuIcon className={styles.drawerIcon}/>
                            : 
                        <ClearIcon className={styles.drawerIcon} />
                    }  
                </IconButton>
            </MenuButtuon>

            <MenuButtuon 
                className={`${styles.homePageItem} ${styles.menuButton}`} 
                path={'/'}
            >
                Home
            </MenuButtuon>

            <MenuButtuon 
                className={`${styles.searchItem} ${styles.menuButton}`} 
                path={'search'}
            >
                Search
            </MenuButtuon>
            
            <MenuButtuon 
                className={`${styles.contributeItem} ${styles.menuButton}`} 
                path={'contribute'}
            >
                Contribute
            </MenuButtuon>
            
            <MenuButtuon 
                className={`${styles.documentsItem} ${styles.menuButton}`} 
                path={'documents'}
            >
                Documents
            </MenuButtuon>

            <MenuButtuon 
                className={` ${styles.menuButton}`} 
                // path={token ? '/input' : '/login'}
                path={'/input'}
            >
                Add data
            </MenuButtuon>


            <div className={`${styles.helpItem} ${styles.menuLabel}`}>
                <IconButton>
                    <HelpOutlineIcon className={styles.themeIcon}/>
                </IconButton>
            </div>

            <div className={`${styles.themeItem} ${styles.menuLabel}`}>
                <IconButton onClick={toggleTheme}>
                    {isDarkTheme ? 
                        (<Brightness4Icon className={styles.themeIcon}/>) 
                            : 
                        (<Brightness7Icon className={styles.themeIcon}/>)
                    }  
                </IconButton>
            </div> 
            
            <div className={`${styles.languageItem} ${styles.menuLabel}`}>
                <IconButton>
                    <LanguageIcon className={styles.themeIcon}/>
                </IconButton>
            </div>

            <div className={`${styles.accountItem} ${styles.menuLabel}`}>
                <Link to={
                    // isSuperuser === null ? '/login' : 
                    isSuperuser ? '/superaccount' : '/account'
                }>
                    <IconButton>
                        <AccountCircleIcon className={styles.themeIcon} />
                    </IconButton>
                </Link>
            </div>

        </div>
    );
}




