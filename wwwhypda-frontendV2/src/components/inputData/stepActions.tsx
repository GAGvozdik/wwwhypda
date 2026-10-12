import type { ReactNode } from 'react';
import styles from './stepper.module.scss';

export default function StepActions({ children, clearAction }: { children?: ReactNode; clearAction?: ReactNode }) {
    return <div className={styles.stepActions}>
        <div className={styles.rowActions}>{children}</div>
        <div className={styles.clearAction}>{clearAction}</div>
    </div>;
}
