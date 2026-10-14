import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { RecaptchaRequestContext } from './recaptchaContext';
import type { CaptchaExecutor } from './recaptchaContext';
import { createRecaptchaQueue } from './recaptchaQueue';

function ReadyBridge({ ready }: { ready: (execute: CaptchaExecutor) => void }) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    useEffect(() => {
        if (executeRecaptcha) ready(executeRecaptcha);
    }, [executeRecaptcha, ready]);
    return null;
}

export default function RecaptchaProvider({ children }: { children: ReactNode }) {
    const [requested, setRequested] = useState(false);
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const queue = useRef<ReturnType<typeof createRecaptchaQueue> | null>(null);
    const execute = useCallback<CaptchaExecutor>((action) => {
        if (!siteKey) return Promise.reject(new Error('CAPTCHA unavailable'));
        if (!queue.current) queue.current = createRecaptchaQueue(() => setRequested(true));
        return queue.current.execute(action);
    }, [siteKey]);
    const ready = useCallback((value: CaptchaExecutor) => queue.current?.ready(value), []);
    useEffect(() => () => { queue.current?.cancel(); queue.current = null; }, []);
    return <RecaptchaRequestContext.Provider value={execute}>
        {children}
        {requested && <GoogleReCaptchaProvider reCaptchaKey={siteKey} useRecaptchaNet>
            <ReadyBridge ready={ready} />
        </GoogleReCaptchaProvider>}
    </RecaptchaRequestContext.Provider>;
}
