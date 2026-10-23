import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useModal } from '../modal/modalContext';
import type { CardSettings, Layout } from './types';
import WordLogo from './WordLogo';
import LogoLabControls from './LogoLabControls';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
interface Props { layout: Layout; title: string; settings: CardSettings; onSettings: (value:CardSettings)=>void; onClose:()=>void }
export default function LogoLabDialog({layout,title,settings,onSettings,onClose}: Props) {
    const {modalRootRef}=useModal();
    const panRef=useRef<HTMLDivElement>(null);
    const id=useId(),[zoom,setZoom]=useState(1),[replay,setReplay]=useState(0);
    return <Dialog open onClose={onClose} container={()=>modalRootRef.current} maxWidth={false}
        aria-labelledby={id} slotProps={{paper:{className:styles.dialog}}}>
        <DialogTitle id={id}>{title}</DialogTitle>
        <DialogContent>
            <LogoLabControls settings={settings} onChange={value=>{setReplay(0);onSettings(value);}} onReplay={()=>setReplay(value=>value+1)}/>
            <div className={styles.controls}>
                <Button onClick={()=>setZoom(value=>Math.max(.125,value/1.5))}>{messages.logo_lab_zoom_out}</Button>
                <output>{Math.round(zoom*100)}%</output>
                <Button onClick={()=>setZoom(value=>Math.min(4,value*1.5))}>{messages.logo_lab_zoom_in}</Button>
                <Button onClick={()=>setZoom(1)}>{messages.logo_lab_zoom_reset}</Button>
                <Button onClick={()=>setZoom(Math.min(1,((panRef.current?.clientWidth || window.innerWidth-96)-2)/layout.width,window.innerHeight*.5/layout.height))}>{messages.logo_lab_zoom_fit}</Button>
            </div>
            <div ref={panRef} className={styles.pan} tabIndex={0} role="region" aria-label={messages.logo_lab_pan} data-surface={settings.surface}>
                <div style={{width:layout.width*zoom,height:layout.height*zoom} as CSSProperties}>
                    <WordLogo layout={layout} palette={settings.palette} reveal={settings.reveal} replay={replay} title={title}/>
                </div>
            </div>
        </DialogContent>
        <DialogActions><Button autoFocus onClick={onClose}>{messages.close}</Button></DialogActions>
    </Dialog>;
}
