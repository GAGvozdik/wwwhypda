import { cloneElement, useLayoutEffect, useMemo, useState, type ReactElement } from 'react';
import Skeleton from '@mui/material/Skeleton';
import LoadIcon from '../../commonFeatures/loadIcon';
import type { AgGridReactProps } from 'ag-grid-react';
import { useLoadingPresentation } from '../../commonFeatures/useLoadingPresentation';
import { LOADING_EXIT_MS } from '../../commonFeatures/loadingPresentation';
import type { CSSProperties } from 'react';
import messages from '../../../common/error_messages.json';
import motion from '../../commonFeatures/loadingSwap.module.scss';
import styles from './accountsStyles.module.scss';

function createPaintController() {
    const frames=new Set<number>();
    let generation=0;
    const cancel=()=>{
        generation++;
        frames.forEach(cancelAnimationFrame);
        frames.clear();
    };
    return {cancel,afterPaint(callback:()=>void){
        const current=generation;
        const schedule=(next:()=>void)=>{
            const frame=requestAnimationFrame(()=>{
                frames.delete(frame);
                if(current===generation)next();
            });
            frames.add(frame);
        };
        schedule(()=>schedule(callback));
    }};
}
// Keep the populated grid in layout while it paints behind a single loading cover.
export default function AccountTable({loading,error,children}: {
    loading: boolean; error?: string; children: ReactElement<AgGridReactProps>;
}) {
    const rows=children.props.rowData;
    const preparation=useMemo(()=>({loading,rows}),[loading,rows]);
    const [painted,setPainted]=useState<typeof preparation>();
    const [paint]=useState(createPaintController);
    useLayoutEffect(()=>{
        paint.cancel();
        return paint.cancel;
    },[preparation,paint]);
    const markPainted=()=>paint.afterPaint(()=>setPainted(preparation));
    const phase=useLoadingPresentation(loading || (!error && painted!==preparation));
    const busy=phase!=='ready';
    return <div className={styles.tableFrame} aria-busy={busy}
        style={{'--loading-exit-duration':LOADING_EXIT_MS+'ms'} as CSSProperties}>
        <div className={styles.tableContent+(!busy?' '+motion.enter:'')}
            style={{visibility:busy?'hidden':undefined}} inert={busy} aria-hidden={busy||undefined}>
            {error ? <div role="alert" className={styles.tableError}>{error}</div> :
                !loading && cloneElement(children,{
                    alwaysShowVerticalScroll:true,
                    onGridReady:event=>{
                        children.props.onGridReady?.(event);
                        if(!rows?.length)markPainted();
                    },
                    onFirstDataRendered:event=>{
                        children.props.onFirstDataRendered?.(event);
                        markPainted();
                    },
                })}
        </div>
        {busy && <div className={styles.tableCover+' '+motion.surface} data-phase={phase}
            role="status" aria-label={messages.ui_loading}>
            <Skeleton variant="rectangular" animation="wave" width="100%" height="100%"
                sx={{position:'absolute',inset:0,bgcolor:'var(--table-color)',borderRadius:'inherit'}}/>
            <LoadIcon />
        </div>}
    </div>;
}