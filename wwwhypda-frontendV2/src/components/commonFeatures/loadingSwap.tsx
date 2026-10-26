import type { CSSProperties, ReactNode } from 'react';
import { useLoadingPresentation } from './useLoadingPresentation';
import { LOADING_EXIT_MS } from './loadingPresentation';
import styles from './loadingSwap.module.scss';

interface Props { loading:boolean;fallback:ReactNode;children:ReactNode;preserveContent?:boolean }
export default function LoadingSwap({loading,fallback,children,preserveContent=false}: Props) {
    const phase=useLoadingPresentation(loading);
    const busy=phase!=='ready';
    return <div className={styles.contents} aria-busy={busy}
        style={{'--loading-exit-duration':LOADING_EXIT_MS+'ms'} as CSSProperties}>
        {preserveContent && <div key="preserved" className={styles.preserved}
            hidden={busy} inert={busy} aria-hidden={busy||undefined}>{children}</div>}
        {busy?
            <div key="pending" className={styles.pending} data-phase={phase}>{fallback}</div>:
            !preserveContent && <div key="ready" className={styles.content}>{children}</div>}
    </div>;
}