import { useId } from 'react';
import type { CardSettings } from './types';
import messages from '../../common/error_messages.json';
import siteStyles from '../menu.module.scss';
import styles from './logoLab.module.scss';
interface Props { settings: CardSettings; onChange: (value: CardSettings)=>void; onReplay: ()=>void }
export default function LogoLabControls({settings,onChange,onReplay}: Props) {
    const id=useId();
    return <div className={styles.controls}>
        <button type="button" className={siteStyles.submitButton} onClick={onReplay}>{messages.logo_lab_replay}</button>
        {(['palette','reveal'] as const).map(field=>{
            const options=field==='palette' ? ['mono','duo','tones','multi'] : ['soft','left','sequence','centre'];
            const prefix=field==='reveal' ? 'animation' : field;
            const label=messages[`logo_lab_${prefix}_label` as keyof typeof messages];
            return <label className={styles.control} key={field} htmlFor={`${id}-${field}`}>
                {label}
                <select className={siteStyles.inputField} id={`${id}-${field}`} value={settings[field]}
                    onChange={event=>onChange({...settings,[field]:event.target.value})}>
                    {options.map(value=><option key={value} value={value}>{messages[`logo_lab_${prefix}_${value}` as keyof typeof messages]}</option>)}
                </select>
            </label>;
        })}
    </div>;
}