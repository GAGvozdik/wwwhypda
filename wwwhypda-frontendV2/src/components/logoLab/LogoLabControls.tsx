import { useId } from 'react';
import type { CardSettings, RevealMode } from './types';
import messages from '../../common/error_messages.json';
import siteStyles from '../menu.module.scss';
import styles from './logoLab.module.scss';
interface Props { settings: CardSettings; onChange: (value: CardSettings)=>void; onReplay: ()=>void }
export default function LogoLabControls({settings,onChange,onReplay}: Props) {
    const id=useId();
    return <div className={styles.controls}>
        <button type="button" className={siteStyles.submitButton} onClick={onReplay}>{messages.logo_lab_replay}</button>
        <label className={styles.control} htmlFor={id}>
            {messages.logo_lab_animation_label}
            <select className={siteStyles.inputField} id={id} value={settings.reveal}
                onChange={event=>onChange({...settings,reveal:event.target.value as RevealMode})}>
                {(['left','sequence','centre'] as const).map(value=><option key={value} value={value}>
                    {messages[`logo_lab_animation_${value}` as keyof typeof messages]}
                </option>)}
            </select>
        </label>
    </div>;
}