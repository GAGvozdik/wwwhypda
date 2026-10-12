import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import LegalLinks from '../pages/legalLinks';

import { useSelector } from 'react-redux';
// import { useDispatch } from 'react-redux';
import type { State } from '../../common/types';
// import type { UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import messages from '../../common/error_messages.json';
import windowStyles from "./windowStyles.module.scss";
import styles from "../menu.module.scss";
import MainMenu from '../menu/mainMenu';
import MainBody from './mainBody';
// import useTokenRefresh from '../users/tokenRefresh';
import GitHubIcon from '@mui/icons-material/GitHub';

// import 'simplebar/dist/simplebar.min.css';


export default function MainWindow() {
    const pathname = useLocation().pathname;
    const fillsFirstScreen = pathname === '/' || pathname === '/search';
    const shellRef = useRef<HTMLDivElement>(null);
    const isLegalPage = ['/privacy-policy', '/cookie-policy', '/user-agreement'].includes(pathname);
    // useTokenRefresh();

    const isDarkTheme = useSelector((state: State) => state.isDarkTheme);


    useLayoutEffect(() => {
        const scroller = document.scrollingElement ?? document.documentElement;
        const targets = new Set([document.documentElement, scroller]);
        const previous = [...targets].map(element => [element, element.classList.contains(styles.dark)] as const);
        targets.forEach(element => element.classList.toggle(styles.dark, isDarkTheme));
        return () => previous.forEach(([element, wasDark]) => element.classList.toggle(styles.dark, wasDark));
    }, [isDarkTheme]);

    useLayoutEffect(() => {
        const shell = shellRef.current;
        const header = shell?.firstElementChild;
        if (!fillsFirstScreen || !shell || !(header instanceof HTMLElement)) return;
        const measureHeader = () => {
            shell.style.setProperty('--shell-header-height', `${header.offsetHeight}px`);
        };
        measureHeader();
        const observer = new ResizeObserver(measureHeader);
        observer.observe(header);
        return () => observer.disconnect();
    }, [fillsFirstScreen]);



    if (isLegalPage) {
        return <div className={`${windowStyles.legalPage} ${isDarkTheme ? styles.dark : ''}`}>
            <header><Link to="/">{messages.back_to_website}</Link></header>
            <MainBody />
            <footer><LegalLinks /></footer>
        </div>;
    }


    return (
        <div ref={shellRef} className={`${windowStyles.container} ${fillsFirstScreen ? windowStyles.fullScreenContent : ''} ${isDarkTheme ? styles.dark : ''}`}>

            <MainMenu />
            <MainBody />

            <footer className={`${windowStyles.underMenu} ${isDarkTheme ? styles.dark : ''}`}>
                <div style={{fontWeight: '300'}}>{messages.website_credits}</div>


                <a
                    href="https://github.com/GAGvozdik/wwwhypda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${windowStyles.undermenuLink} ${isDarkTheme ? styles.dark : ''}`}
                >
                    <GitHubIcon />
                    https://github.com/GAGvozdik/wwwhypda
                </a>

                <div className={windowStyles.legalDocuments}>
                    <span>{messages.recaptcha_notice}</span>
                    <LegalLinks className={`${windowStyles.undermenuLink} ${isDarkTheme ? styles.dark : ''}`} />
                </div>

            </footer>

        </div>
    );
}
