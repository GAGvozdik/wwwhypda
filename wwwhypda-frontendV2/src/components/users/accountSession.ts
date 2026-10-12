import store from '../../redux/store';
import { Logout } from '../../redux/actions';

const draftKeys = [
    'generalInfoData', 'measurementsTableData', 'sampleMeasurementTableData',
    'siteInfoTableData', 'sourceTableData', 'activeStep', 'submissionId', 'isSuperuser',
];
export const sessionEvent = 'account-session-change';
const deletionKey = 'accountDeletionEpoch';
let epoch = 0;
let paused = false;
let ended = false;

export const sessionVersion = () => epoch;
export const sessionUnavailable = () => paused || ended;
export const sessionEnded = () => ended;

function notify() {
    window.dispatchEvent(new Event(sessionEvent));
}

export function pauseAccountSession() {
    paused = true;
    epoch += 1;
    notify();
}

export function resumeAccountSession() {
    paused = false;
    ended = false;
    epoch += 1;
    notify();
}

export function endAccountSession(broadcast = true) {
    paused = false;
    ended = true;
    epoch += 1;
    // Сначала очищаем Redux; его подписчик больше не сохранит старые таблицы.
    store.dispatch(Logout());
    for (const key of draftKeys) localStorage.removeItem(key);
    if (broadcast) localStorage.setItem(deletionKey, crypto.randomUUID());
    notify();
}

window.addEventListener('storage', (event) => {
    if (event.key === deletionKey && event.newValue) {
        endAccountSession(false);
        window.location.replace('/');
    }
});
