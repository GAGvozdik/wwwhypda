import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@mui/material';
import type { CardSettings, Composition, Layout, RockName } from './types';
import { getLayout } from './layoutCache';
import { diagnoseLayout } from './layoutDiagnostics';
import WordLogo from './WordLogo';
import LogoLabControls from './LogoLabControls';
import LogoLabDialog from './LogoLabDialog';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
interface Props { composition: Composition; names: RockName[] }
export default function LogoLabCard({composition,names}: Props) {
    const ref=useRef<HTMLElement>(null);
    const [layout,setLayout]=useState<Layout>(),[error,setError]=useState(false),[retry,setRetry]=useState(0),[expanded,setExpanded]=useState(false);
    const [settings,setSettings]=useState<CardSettings>({palette:'mono',reveal:'soft',surface:'light',replayVersion:0});
    const title=messages[`logo_lab_composition_${composition.id.toLowerCase()}_name` as keyof typeof messages];
    useEffect(()=>{
        const controller=new AbortController();
        let requested=false;
        const observer=new IntersectionObserver(entries=>{
            if(requested || !entries.some(entry=>entry.isIntersecting)) return;
            requested=true; observer.disconnect();
            getLayout(composition,names,controller.signal).then(value=>{
                if(!controller.signal.aborted) setLayout(value);
            }).catch(()=>{if(!controller.signal.aborted) setError(true);});
        },{rootMargin:'150px'});
        if(ref.current) observer.observe(ref.current);
        return ()=>{observer.disconnect();controller.abort();};
    },[composition,names,retry]);
    const diagnostics=useMemo(()=>layout ? diagnoseLayout(layout,composition) : undefined,[layout,composition]);
    const change=(value:CardSettings)=>setSettings({...value,replayVersion:0});
    return <article ref={ref} className={styles.card} data-card={composition.id} data-layout-diagnostics={diagnostics ? JSON.stringify(diagnostics) : undefined}>
        <h3>{composition.id} · {title}</h3>
        <p>{messages[`logo_lab_composition_${composition.id.toLowerCase()}_description` as keyof typeof messages]}</p>
        <div className={styles.preview} data-surface={settings.surface} aria-busy={!layout && !error}>
            {layout ? <WordLogo layout={layout} palette={settings.palette} reveal={settings.reveal} replay={settings.replayVersion} title={title}/> :
                <p role="status">{error ? messages.logo_lab_failed : messages.logo_lab_loading}</p>}
        </div>
        {error && <Button onClick={()=>{setError(false);setRetry(value=>value+1);}}>{messages.maintenance_retry}</Button>}
        {layout && <>
            <LogoLabControls settings={settings} onChange={change} onReplay={()=>setSettings(value=>({...value,replayVersion:value.replayVersion+1}))}/>
            <Button onClick={()=>setExpanded(true)} aria-label={`${messages.logo_lab_enlarge}: ${composition.id}`}>{messages.logo_lab_enlarge}</Button>
            {expanded && <LogoLabDialog layout={layout} title={`${composition.id} · ${title}`} settings={settings} onSettings={change} onClose={()=>setExpanded(false)}/>}
        </>}
    </article>;
}

