import { useId } from 'react';
import { Button, FormControl, InputLabel, Select } from '@mui/material';
import type { CardSettings } from './types';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
interface Props { settings: CardSettings; onChange: (value: CardSettings)=>void; onReplay: ()=>void }
export default function LogoLabControls({settings,onChange,onReplay}: Props) {
    const id=useId();
    return <div className={styles.controls}>
        <Button variant="outlined" onClick={onReplay}>{messages.logo_lab_replay}</Button>
        {(['palette','reveal','surface'] as const).map(field=>{
            const options=field==='palette' ? ['mono','duo','tones','multi'] : field==='reveal' ? ['soft','left','sequence','centre'] : ['light','dark'];
            const prefix=field==='reveal' ? 'animation' : field;
            const label=messages[`logo_lab_${prefix}_label` as keyof typeof messages];
            return <FormControl size="small" key={field}>
                <InputLabel htmlFor={`${id}-${field}`}>{label}</InputLabel>
                <Select native label={label} value={settings[field]} inputProps={{id:`${id}-${field}`}}
                    onChange={event=>onChange({...settings,[field]:event.target.value})}>
                    {options.map(value=><option key={value} value={value}>{messages[`logo_lab_${prefix}_${value}` as keyof typeof messages]}</option>)}
                </Select>
            </FormControl>;
        })}
    </div>;
}
