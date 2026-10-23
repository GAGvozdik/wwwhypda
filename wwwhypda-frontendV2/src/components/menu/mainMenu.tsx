// import * as React from 'react';

import messages from '../../common/error_messages.json';
import { LOGO_LAB_ENABLED } from '../../common/experimentalFeatures';
import MenuButtuon from './menuButton';
// import {useEffect, useState, useRef} from 'react';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import IconButton from '@mui/material/IconButton';
import styles from "./menuStyles.module.scss"

import { useSelector, useDispatch } from 'react-redux';
import { UpdateTheme } from '../../redux/actions';
import { saveThemePreference } from '../../common/theme';
import type { State, UpdateThemeAction } from '../../common/types';
import { Link } from 'react-router-dom';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
// import LanguageIcon from '@mui/icons-material/Language';
// import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
// import useAuthCheck from '../users/useAuthCheck';

export default function MainMenu() {


    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);
    const dispatch = useDispatch();

    const toggleTheme = () => {
        saveThemePreference(!isDarkTheme);
        dispatch<UpdateThemeAction>(UpdateTheme(!isDarkTheme));
    };

    const isSuperuser = localStorage.getItem('isSuperuser') === 'true';


    return (

        <div className={`${styles.mainMenuItems} ${isDarkTheme ? styles.dark : ''}`}>


            <MenuButtuon
                className={`${styles.homePageItem} ${styles.menuButton}`}
                path={'/'}
            >
                {messages.menu_home}
            </MenuButtuon>

            <MenuButtuon
                className={`${styles.searchItem} ${styles.menuButton}`}
                path={'search'}
            >
                {messages.menu_search}
            </MenuButtuon>

            {LOGO_LAB_ENABLED && <MenuButtuon className={styles.menuButton} path="/logo-lab">
                {messages.menu_logo_lab}
            </MenuButtuon>}
            {/* <MenuButtuon
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
            </MenuButtuon> */}

            <MenuButtuon
                className={` ${styles.menuButton}`}
                // path={token ? '/input' : '/login'}
                path={'/input'}
            >
                {messages.menu_add_data}
            </MenuButtuon>


            {/* <div className={`${styles.helpItem} ${styles.menuLabel}`}>
                <IconButton>
                    <HelpOutlineIcon className={styles.themeIcon}/>
                </IconButton>
            </div> */}

            <div className={`${styles.accountItem} ${styles.menuLabel}`}>
                <IconButton component={Link} aria-label={messages.menu_account} to={
                    // isSuperuser === null ? '/login' :
                    isSuperuser ? '/superaccount' : '/account'
                }>
                        <AccountCircleIcon className={styles.themeIcon} />
                </IconButton>
            </div>

            {/* <div className={`${styles.languageItem} ${styles.menuLabel}`}>
                <IconButton>
                    <LanguageIcon className={styles.themeIcon}/>
                </IconButton>
            </div> */}

            <div className={`${styles.themeItem} ${styles.menuLabel}`}>
                <IconButton onClick={toggleTheme} aria-label={isDarkTheme ? messages.light_theme : messages.dark_theme}>
                    {isDarkTheme ?
                        (<Brightness4Icon className={styles.themeIcon}/>)
                            :
                        (<Brightness7Icon className={styles.themeIcon}/>)
                    }
                </IconButton>
            </div>

        </div>
    );
}




