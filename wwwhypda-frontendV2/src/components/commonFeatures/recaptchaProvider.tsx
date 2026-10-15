import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { RecaptchaRequestContext } from './recaptchaContext';
import type { CaptchaExecutor } from './recaptchaContext';
import { allowsRecaptchaAction, requiresRecaptcha } from './recaptchaRoutes';
import { createRecaptchaFrameBridge } from './recaptchaFrameBridge';
import messages from '../../common/error_messages.json';

export default function RecaptchaProvider({ children, pathname }: { children: ReactNode; pathname: string }) {
    const bridge = useRef<ReturnType<typeof createRecaptchaFrameBridge> | null>(null);
    useLayoutEffect(() => () => {
        bridge.current?.cancel();
        bridge.current = null;
    }, [pathname]);
    const execute = useCallback<CaptchaExecutor>((action) => {
        if (!allowsRecaptchaAction(pathname, action)) return Promise.reject(new Error('CAPTCHA unavailable'));
        if (!bridge.current || bridge.current.disposed) {
            bridge.current = createRecaptchaFrameBridge(pathname, messages.captcha_frame_title);
        }
        return bridge.current.execute(action);
    }, [pathname]);
    return <RecaptchaRequestContext.Provider value={requiresRecaptcha(pathname) ? execute : undefined}>
        {children}
    </RecaptchaRequestContext.Provider>;
}
