
import { useSelector, useDispatch } from 'react-redux';
import { State, UpdateThemeAction, UpdateOpenCloseAction } from '../../src/common/types';
import { useMediaQuery } from 'react-responsive';
import styles from "./menu.module.scss"; 
import MainTree from './pages/mainTree';
import MainMenu from './menu/mainMenu';
import MainBody from './mainBody';

export default function MainWindow() {

    let isDarkTheme = useSelector((state: State) => state.isDarkTheme);  
    let isOpenNow = useSelector((state: State) => state.open);  

    const widthLessThan650 = useMediaQuery({ maxWidth: 1000 });
    const heightLessThan559 = useMediaQuery({ maxHeight: 559 });
    const unsupportedResolution = widthLessThan650 || heightLessThan559;
    
    if (unsupportedResolution) {
        return (
            <div className={`${styles.menuLabel} ${styles.lowScreen}`} style={{color: 'var(--tree-text)', backgroundColor: 'var(--drawer-color)', height: '100vh'}}>
                The window size should be larger than 1000x560
            </div>
        )
    }

    return (
        <div className={
            isOpenNow ? 
                (`${styles.container} ${isDarkTheme ? styles.dark : ''}`) 
                    : 
                (`${styles.openContainer} ${isDarkTheme ? styles.dark : ''}`)   
        }>
    
            <MainMenu />
            <MainBody />
            <MainTree />

            <div className={`${styles.underMenu}`}>
            </div>

        </div>
    );
}
