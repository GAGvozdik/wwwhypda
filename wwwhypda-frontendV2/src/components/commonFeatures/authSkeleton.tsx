import { useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import Skeleton from '@mui/material/Skeleton';
import LoadIcon from './loadIcon';
import {AuthLoadingContext} from './authLoadingContext';
import styles from './authSkeleton.module.scss';
import motion from './loadingSwap.module.scss';
import {useLoadingPresentation} from './useLoadingPresentation';
import {LOADING_EXIT_MS} from './loadingPresentation';
import type {CSSProperties} from 'react';
import messages from '../../common/error_messages.json';

// Authentication forms only. Keep actual markup mounted to reserve its exact
// natural size and preserve input. Search/tree/table use their original loader.
export default function AuthSkeleton({loading = false, children}: {loading?: boolean; children: ReactNode}) {
    const previewLoading = useContext(AuthLoadingContext);
    const phase=useLoadingPresentation(loading || previewLoading);
    const busy=phase!=="ready";
    const content = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => { content.current?.toggleAttribute('inert',busy); },[busy]);
    return <div className={styles.frame} aria-busy={busy} style={{"--loading-exit-duration":LOADING_EXIT_MS+"ms"} as CSSProperties}>
        <div ref={content} className={styles.content+" "+(!busy?motion.enter:"")} style={{visibility: busy ? 'hidden' : undefined}} aria-hidden={busy || undefined}>{children}</div>
        {busy && <div className={styles.cover+" "+motion.surface} data-phase={phase} role="status" aria-label={messages.ui_loading}>
            <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" aria-hidden="true"
                sx={{position:'absolute',inset:0,borderRadius:'inherit',bgcolor:'var(--form-color)'}} />
            <LoadIcon size={48}/>
        </div>}
    </div>;
}
