import authStyles from '../users/users.module.scss';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import ModalWindow from '../modal/modalWindow';
import UserButton from '../users/auth/userButton';
import LegalLinks from '../pages/legalLinks';
import messages from '../../common/error_messages.json';
import styles from '../modal/modalStyles.module.scss';
import {maintenanceActive, maintenanceEvent, setMaintenance} from './maintenanceState';

// No polling, stored requests, automatic replay or session reset. The mounted
// page stays behind the dialog. Only an explicit owner-controlled Nginx flag
// can turn a whole-site maintenance notice on.
export default function MaintenanceNotice({legalPage = false}: {legalPage?: boolean}) {
    const pathname = useLocation().pathname;
    const [active,setActive] = useState(maintenanceActive);
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const pending = useRef(false);
    const lastCheck = useRef(0);
    const check = async (force = false) => {
        if (pending.current || (!force && Date.now()-lastCheck.current<1500)) return;
        pending.current = true; lastCheck.current = Date.now(); setBusy(true);
        try {
            const response = await api.get('/maintenance-status',{baseURL:''});
            if (typeof response.data?.maintenance === 'boolean') {
                setMaintenance(response.data.maintenance); setError(false);
            }
        } catch { setError(true); } finally { pending.current = false; setBusy(false); }
    };
    useEffect(() => {
        const update = () => setActive(maintenanceActive());
        window.addEventListener(maintenanceEvent,update);
        return () => window.removeEventListener(maintenanceEvent,update);
    },[]);
    useEffect(() => {
        void check();
        const focus = () => { void check(); };
        window.addEventListener('focus',focus);
        return () => window.removeEventListener('focus',focus);
        // check uses only persistent refs/setters, not route/form data.
    },[pathname]);
    return <div ref={root} style={{display: 'contents'}}>
        <ModalWindow open={active && !legalPage} onClose={() => {}} modalRootRef={root}
            labelledBy="maintenance-title" describedBy="maintenance-description">
            <h2 id="maintenance-title" className={styles.modalTitle}>{messages.maintenance_title}</h2>
            <p id="maintenance-description" className={styles.modalDescription}>{messages.maintenance_description}</p>
            {error && <p role="alert" className={styles.modalDescription}>{messages.maintenance_check_failed}</p>}
            <UserButton text={messages.maintenance_retry} isLoading={busy} onclick={() => { void check(true); }} />
            <p className={`${styles.modalDescription} ${styles.maintenanceLinks}`}><a className={authStyles.link} href="mailto:support@wwhypdatestdeployversion.it">support@wwhypdatestdeployversion.it</a></p>
            <div className={`${styles.modalDescription} ${styles.maintenanceLinks}`}><LegalLinks className={authStyles.link} /></div>
        </ModalWindow>
    </div>;
}
