import { useId, useState } from 'react';
import { Button, FormControl, InputLabel, Select } from '@mui/material';
import AnimatedLogo from '../../logos/logo/AnimatedLogo';
import { originalLetters } from './originalLetters';
import { W_PATH } from './geometry';
import type { PreviewSurface } from './types';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
export default function OriginalLogoPreview() {
    const id=useId(),[replay,setReplay]=useState(0),[surface,setSurface]=useState<PreviewSurface>('light');
    return <article className={styles.card}>
        <h2>{messages.logo_lab_original}</h2>
        <p>{messages.logo_lab_original_description}</p>
        <div className={`${styles.preview} ${styles.original}`} data-surface={surface}>
            <svg className={styles.mark} viewBox="-8 -8 124 102" aria-hidden="true"><path d={W_PATH}/></svg>
            {replay ? <AnimatedLogo key={replay}/> : <svg className={styles.originalName} viewBox="120 -8 720 104" role="img" aria-label="WWHYPDA">
                <defs>{originalLetters.map((letter,index)=><mask key={letter.key} id={`${id}-${index}`}><path d={letter.maskPathD} fill="white"/></mask>)}</defs>
                {originalLetters.map((letter,index)=><g key={letter.key} transform={letter.transform}><path d={letter.mainPathD} mask={`url(#${id}-${index})`}/></g>)}
            </svg>}
        </div>
        <div className={styles.controls}>
            <Button variant="outlined" onClick={()=>setReplay(value=>value+1)}>{messages.logo_lab_replay}</Button>
            <FormControl size="small"><InputLabel htmlFor={`${id}-surface`}>{messages.logo_lab_surface_label}</InputLabel>
                <Select native label={messages.logo_lab_surface_label} value={surface} inputProps={{id:`${id}-surface`}}
                    onChange={event=>setSurface(event.target.value as PreviewSurface)}>
                    <option value="light">{messages.logo_lab_surface_light}</option><option value="dark">{messages.logo_lab_surface_dark}</option>
                </Select></FormControl>
        </div>
    </article>;
}
