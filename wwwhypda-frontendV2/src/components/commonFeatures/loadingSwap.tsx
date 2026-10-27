import { useLayoutEffect, useState } from 'react';
import { createInitialPageLoading } from './initialPageLoadingState';
import { InitialPageLoadingContext } from './initialPageLoading';
import type { CSSProperties, ReactNode } from 'react';
import { useLoadingPresentation } from './useLoadingPresentation';
import { LOADING_EXIT_MS } from './loadingPresentation';
import styles from './loadingSwap.module.scss';

interface Props { loading:boolean;fallback:ReactNode;children:ReactNode;preserveContent?:boolean;animateEnter?:boolean;animateSwap?:boolean;coordinatePage?:boolean }
export default function LoadingSwap({loading,fallback,children,preserveContent=false,animateEnter=true,animateSwap=true,coordinatePage=false}: Props) {
    const [pageBusy,setPageBusy]=useState(true);
    const [page]=useState(()=>createInitialPageLoading(setPageBusy));
    useLayoutEffect(()=>{
        if(!coordinatePage||!preserveContent)return;
        page.start();
        return page.dispose;
    },[coordinatePage,preserveContent,page]);
    const phase=useLoadingPresentation(loading||(coordinatePage&&preserveContent&&pageBusy),
        !animateSwap&&(!coordinatePage||!preserveContent));
    const busy=phase!=='ready';
    if(coordinatePage)return <div className={styles.pageStack} aria-busy={busy}
        style={{'--loading-exit-duration':LOADING_EXIT_MS+'ms'} as CSSProperties}>
        <div key="page" className={styles.pageContent} style={{visibility:phase==='loading'?'hidden':undefined}}
            inert={busy} aria-hidden={busy||undefined}>
            {preserveContent?<InitialPageLoadingContext.Provider value={page}>{children}</InitialPageLoadingContext.Provider>:
                busy?null:children}
        </div>
        {busy&&<div key="page-pending" className={styles.pageFallback} data-phase={phase}
            inert={phase==='exiting'} aria-hidden={phase==='exiting'||undefined}>{fallback}</div>}
    </div>;
    return <div className={styles.contents} aria-busy={busy}
        style={{'--loading-exit-duration':LOADING_EXIT_MS+'ms'} as CSSProperties}>
        {preserveContent && <div key="preserved" className={styles.preserved+(!animateSwap?' '+styles.staticSwap:'')}
            hidden={busy} inert={busy} aria-hidden={busy||undefined}>{children}</div>}
        {busy?
            <div key="pending" className={styles.pending+(!animateEnter ? ' '+styles.noEnterChildren : '')+(!animateSwap?' '+styles.staticSwap:'')} data-phase={phase}>{fallback}</div>:
            !preserveContent && <div key="ready" className={styles.content+(!animateSwap?' '+styles.staticSwap:'')}>{children}</div>}
    </div>;
}