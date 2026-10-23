import { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import api from '../api';
import type { RockTypeData } from '../../common/types';
import type { RockName } from './types';
import { extractRockNames } from './rockNames';
import { compositions } from './compositions';
import LogoLabCard from './LogoLabCard';
import OriginalLogoPreview from './OriginalLogoPreview';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
export default function LogoLabPage() {
    const [names,setNames]=useState<RockName[]>(),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
    useEffect(()=>{
        const controller=new AbortController();
        api.get<RockTypeData[]>('/rocks/rock_type',{signal:controller.signal}).then(response=>{
            if(!controller.signal.aborted) setNames(extractRockNames(response.data));
        }).catch(()=>{if(!controller.signal.aborted) setFailed(true);});
        return ()=>controller.abort();
    },[retry]);
    return <main className={styles.page}>
        <header><p className={styles.eyebrow}>WWHYPDA</p><h1>{messages.logo_lab_title}</h1><p>{messages.logo_lab_intro}</p></header>
        <OriginalLogoPreview/>
        {failed ? <div role="alert"><p>{messages.logo_lab_failed}</p><Button onClick={()=>{setFailed(false);setNames(undefined);setRetry(value=>value+1);}}>{messages.maintenance_retry}</Button></div> :
            !names ? <p role="status">{messages.logo_lab_loading}</p> : !names.length ? <div role="status"><p>{messages.logo_lab_empty}</p><Button onClick={()=>{setNames(undefined);setRetry(value=>value+1);}}>{messages.maintenance_retry}</Button></div> :
            (['A','B','C'] as const).map(group=><section key={group} aria-labelledby={`logo-lab-${group}`}>
                <h2 id={`logo-lab-${group}`}>{messages[`logo_lab_group_${group.toLowerCase()}` as keyof typeof messages]}</h2>
                <div className={styles.grid}>{compositions.filter(config=>config.group===group).map(config=><LogoLabCard key={config.id} composition={config} names={names}/>)}</div>
            </section>)}
    </main>;
}
