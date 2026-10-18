import { useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import Skeleton from '@mui/material/Skeleton';
import LoadIcon from './loadIcon';
import {AuthLoadingContext} from './authLoadingContext';
import styles from './authSkeleton.module.scss';

// Authentication forms only. Keep actual markup mounted to reserve its exact
// natural size and preserve input. Search/tree/table use their original loader.
export default function AuthSkeleton({loading = false, children}: {loading?: boolean; children: ReactNode}) {
    const previewLoading = useContext(AuthLoadingContext);
    const busy = loading || previewLoading;
    const content = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => { content.current?.toggleAttribute('inert',busy); },[busy]);
    return <div className={styles.frame} aria-busy={busy}>
        <div ref={content} style={{visibility: busy ? 'hidden' : undefined}} aria-hidden={busy || undefined}>{children}</div>
        {busy && <div className={styles.cover} role="status" aria-label="Loading">
            <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" aria-hidden="true"
                sx={{position:'absolute',inset:0,borderRadius:'inherit',bgcolor:'var(--form-color)'}} />
            <LoadIcon size={48}/>
        </div>}
    </div>;
}
