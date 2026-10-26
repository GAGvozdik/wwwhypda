import type { CSSProperties, ReactNode } from 'react';
import { useLoadingPresentation } from './useLoadingPresentation';
import { LOADING_EXIT_MS } from './loadingPresentation';
import styles from './loadingSwap.module.scss';

interface Props { loading:boolean;fallback:ReactNode;children:ReactNode;preserveContent?:boolean;animateEnter?:boolean;animateSwap?:boolean }
export default function LoadingSwap({loading,fallback,children,preserveContent=false,animateEnter=true,animateSwap=true}: Props) {
    const phase=useLoadingPresentation(loading,!animateSwap);
    const busy=phase!=='ready';
    return <div className={styles.contents} aria-busy={busy}
        style={{'--loading-exit-duration':LOADING_EXIT_MS+'ms'} as CSSProperties}>
        {preserveContent && <div key="preserved" className={styles.preserved+(!animateSwap?' '+styles.staticSwap:'')}
            hidden={busy} inert={busy} aria-hidden={busy||undefined}>{children}</div>}
        {busy?
            <div key="pending" className={styles.pending+(!animateEnter ? ' '+styles.noEnterChildren : '')+(!animateSwap?' '+styles.staticSwap:'')} data-phase={phase}>{fallback}</div>:
            !preserveContent && <div key="ready" className={styles.content+(!animateSwap?' '+styles.staticSwap:'')}>{children}</div>}
    </div>;
}