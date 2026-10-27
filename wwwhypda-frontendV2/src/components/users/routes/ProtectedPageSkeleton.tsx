import CustomStepIcon from '../../inputData/StepIcon';
import { useState, type ReactNode } from 'react';
import Skeleton from '@mui/material/Skeleton';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LoadIcon from '../../commonFeatures/loadIcon';
import messages from '../../../common/error_messages.json';
import accounts from '../accounts/accountsStyles.module.scss';
import users from '../users.module.scss';
import steps from '../../inputData/stepper.module.scss';
import page from '../../pages/inputPage.module.scss';
import styles from './protectedPageSkeleton.module.scss';

export type ProtectedPageKind = 'account' | 'superaccount' | 'dataset' | 'read' | 'edit';

function TextPlaceholder({children}: {children:ReactNode}) {
    return <span className={styles.textPlaceholder} aria-hidden="true">{children}
        <Skeleton variant="rectangular" className={styles.textCover}/>
    </span>;
}
function TablePlaceholder() {
    return <div className={styles.table} data-page-loading-surface="">
        <Skeleton variant="rounded" animation="wave" width="100%" height="100%" sx={{borderRadius:'inherit'}}/>
        <div className={styles.activity} aria-hidden="true"><LoadIcon /></div>
    </div>;
}
const stepLabels=[messages.step_1,messages.step_2,messages.step_3,messages.step_4,messages.step_5];

// Public structure only. Share actual page layout classes without mounting grids, forms or private data.
export default function ProtectedPageSkeleton({kind='dataset'}: {kind?:ProtectedPageKind}) {
    const [activeStep]=useState(()=>{
        try {
            const value=Number(localStorage.getItem('activeStep'));
            return Number.isInteger(value)&&value>=0&&value<=5?value:0;
        } catch { return 0; }
    });
    const titles=[messages.step_site_title,messages.step_general_title,messages.step_source_title,messages.step_sample_title,messages.step_measurements_title];
    const datasetTitle=kind==='read'?messages.input_read_title:kind==='edit'?messages.input_edit_title:messages.input_page_title;
    if(kind!=='account' && kind!=='superaccount')return <div className={styles.page} role="status"
        aria-label={messages.ui_loading} data-page-skeleton={kind}>
        <div className={styles.datasetTitle}>{datasetTitle}</div>
        <div className={steps.treeText+' '+steps.stepperPage}>
            <Stepper activeStep={activeStep}>{stepLabels.map(label=><Step key={label}>
                <StepLabel StepIconComponent={CustomStepIcon}><div className={steps.treeText}>{label}</div></StepLabel>
            </Step>)}</Stepper>
            <div className={steps.stepContent}>
                <div className={steps.stepTitle}><div style={{fontSize:'calc(var(--main-font-size) * 1.5)'}}>{activeStep===5?messages.ui_all_steps_completed:titles[activeStep]}</div></div>
                {activeStep!==5 && <div className={steps.measurementGrid}>
                    <div className={steps.stepActions}>
                        <div className={steps.rowActions}>{activeStep>=3 && <>
                            <Skeleton variant="rounded" width="7.5rem" height="2.5rem"/>
                            <Skeleton variant="rounded" width="7.5rem" height="2.5rem"/>
                        </>}</div>
                        <div className={steps.clearAction}><Skeleton variant="rounded" width="7.5rem" height="2.5rem"/></div>
                    </div>
                    <div className={steps.tableArea}><TablePlaceholder /></div>
                </div>}
            </div>
            <div className={steps.stepNavigation}>
                <Skeleton variant="rounded" width="7.5rem" height="2.5rem"/>
                <div className={styles.spacer}/>
                <Skeleton variant="rounded" width="7.5rem" height="2.5rem"/>
            </div>
        </div>
        {kind=== 'dataset' && <p className={page.submissionNotice}><TextPlaceholder>{messages.dataset_submission_notice}{' '}
            {messages.user_agreement} {messages.legal_link_and} {messages.privacy_policy}.
        </TextPlaceholder></p>}
    </div>;
    const admin=kind==='superaccount';
    return <div className={accounts.accountPage+' '+styles.page} role="status"
        aria-label={messages.ui_loading} data-page-skeleton={kind}>
        <div className={accounts.topActions}><Skeleton variant="rounded" width="10rem" height="2.5rem"/></div>
        <div className={users.formTitle} style={{fontSize:'calc(var(--main-font-size) * 2.25)'}}>
            {admin?messages.superaccount_title:messages.account_title}
        </div>
        <div className={styles.tableBlock}><TablePlaceholder /></div>
        {admin ? <>
            <div className={styles.adminDetails}>
                <div className={styles.profileLine}>{messages.account_name}:</div>
                <div className={styles.profileLine}>{messages.account_email}:</div>
            </div>
            <div className={styles.tableBlock}><TablePlaceholder /></div>
        </> : <div className={users.accountDetails}>
            <div className={styles.profile}>
                <div className={styles.profileLine}>{messages.account_name}:</div>
                <div className={styles.profileLine}>{messages.account_email}:</div>
            </div>
            <section className={users.accountPrivacy}>
                <p>{messages.personal_data_request_description}</p>
                <a className={users.policyLink} href="mailto:support@wwhypdatestdeployversion.it?subject=Personal%20data%20request">support@wwhypdatestdeployversion.it</a>
                <p>{messages.logout_does_not_delete}</p>
            </section>
        </div>}
        <div className={accounts.bottomActions}><Skeleton variant="rounded" width="10rem" height="2.5rem"/></div>
    </div>;
}