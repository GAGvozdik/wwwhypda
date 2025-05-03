
import { useSelector, useDispatch } from 'react-redux';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../common/types';
import { useMediaQuery } from 'react-responsive';
import windowStyles from "./windowStyles.module.scss"; 
import styles from "../menu.module.scss"; 
import MainTree from '../tree/mainTree';
import MainMenu from '../menu/mainMenu';
import MainBody from './mainBody';
import useTokenRefresh from '../users/tokenRefresh';
import GitHubIcon from '@mui/icons-material/GitHub';

import 'simplebar/dist/simplebar.min.css';


export default function MainWindow() {
    // useTokenRefresh(); 

    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  
    let isOpenNow = useSelector((state: State) => state.open);  

    const widthLessThan650 = useMediaQuery({ maxWidth: 700 });
    const heightLessThan559 = useMediaQuery({ maxHeight: 559 });
    const unsupportedResolution = widthLessThan650 || heightLessThan559;
    
    if (unsupportedResolution) {
        return (
            <div className={`${windowStyles.menuLabel} ${windowStyles.lowScreen} ${isDarkTheme ? styles.dark : ''}`} style={{color: 'var(--tree-text)', backgroundColor: 'var(--drawer-color)', height: '100vh'}}>
                The window size should be larger than 700x560
            </div>
        )
    }

    return (
        <div className={
            isOpenNow ? 
                (`${windowStyles.container} ${isDarkTheme ? styles.dark : ''}`) 
                    : 
                (`${windowStyles.openContainer} ${isDarkTheme ? styles.dark : ''}`)   
        }>
    
            <MainMenu />
            <MainBody />
            <MainTree />

            <div className={`${windowStyles.underMenu} ${isDarkTheme ? styles.dark : ''}`}>
            <div style={{fontWeight: '300'}}>This website was created by Gvozdik G. and A. Comunian.</div>
            <a 
                href="https://github.com/GAGvozdik/wwwhypda" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${windowStyles.undermenuLink} ${isDarkTheme ? styles.dark : ''}`}
            >
                <GitHubIcon />
                https://github.com/GAGvozdik/wwwhypda
            </a>
            </div>
            
        </div>
    );
}
