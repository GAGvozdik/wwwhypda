import type { RockName } from './types';
import rockNamesSnapshot from './rockNames.snapshot.json';
import { compositions } from './compositions';
import LogoLabCard from './LogoLabCard';
import OriginalLogoPreview from './OriginalLogoPreview';
import messages from '../../common/error_messages.json';
import styles from './logoLab.module.scss';
import siteStyles from '../menu.module.scss';

// A deliberately frozen public-catalogue snapshot. Search continues to use the live API.
const names: RockName[] = rockNamesSnapshot;

export default function LogoLabPage() {
    return <main className={`${styles.page} ${siteStyles.dark}`}>
        <header><p className={styles.eyebrow}>WWHYPDA</p><h1>{messages.logo_lab_title}</h1><p>{messages.logo_lab_intro}</p></header>
        <OriginalLogoPreview/>
        {!names.length ? <p role="status">{messages.logo_lab_empty}</p> :
            (['A','B','C'] as const).map(group=><section key={group} aria-labelledby={`logo-lab-${group}`}>
                <h2 id={`logo-lab-${group}`}>{messages[`logo_lab_group_${group.toLowerCase()}` as keyof typeof messages]}</h2>
                <div className={styles.grid}>{compositions.filter(config=>config.group===group).map(config=><LogoLabCard key={config.id} composition={config} names={names}/>)}</div>
            </section>)}
    </main>;
}
