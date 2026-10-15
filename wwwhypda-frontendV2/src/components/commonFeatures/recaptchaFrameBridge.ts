import { createRecaptchaQueue } from './recaptchaQueue';
import { allowsRecaptchaAction, recaptchaRoute } from './recaptchaRoutes';
import { isCaptchaResponse, RECAPTCHA_CHANNEL } from './recaptchaProtocol';

// Separate document lifetime, not a security boundary against hostile same-origin code.
export function createRecaptchaFrameBridge(pathname: string, title: string,
    host: Window = window, doc: Document = document, timeoutMs = 15000) {
    const origin = host.location.origin;
    let frame: HTMLIFrameElement | undefined;
    let disposed = false;
    let outstanding = 0;
    const pending = new Map<string, { resolve: (token: string) => void; reject: (error: Error) => void }>();
    const active = () => !disposed && origin !== 'null' && recaptchaRoute(host.location.pathname) === recaptchaRoute(pathname);
    const unavailable = () => new Error('CAPTCHA unavailable');
    const queue = createRecaptchaQueue(load, timeoutMs);

    function cancel() {
        if (disposed) return;
        disposed = true;
        queue.cancel();
        for (const task of pending.values()) task.reject(unavailable());
        pending.clear();
        host.removeEventListener('message', receive);
        host.removeEventListener('pagehide', cancel);
        if (frame) {
            frame.onload = null;
            frame.onerror = null;
            // Discard the entire browsing context, including nested Google frames/timers.
            frame.remove();
            frame = undefined;
        }
    }
    function receive(event: MessageEvent) {
        if (!active()) { cancel(); return; }
        if (event.origin !== origin || event.source !== frame?.contentWindow || !isCaptchaResponse(event.data)) return;
        const task = pending.get(event.data.id);
        if (!task) return;
        pending.delete(event.data.id);
        if (event.data.type === 'token') task.resolve(event.data.token);
        else task.reject(unavailable());
    }
    function send(action?: string): Promise<string> {
        if (!active() || !allowsRecaptchaAction(pathname, action) || !frame?.contentWindow || pending.size >= 8) {
            return Promise.reject(unavailable());
        }
        return new Promise((resolve, reject) => {
            const id = host.crypto.randomUUID();
            pending.set(id, { resolve, reject });
            try { frame!.contentWindow!.postMessage({ channel: RECAPTCHA_CHANNEL, type: 'execute', id, action }, origin); }
            catch { pending.delete(id); reject(unavailable()); }
        });
    }
    function load() {
        if (!active()) throw unavailable();
        if (frame) return;
        frame = doc.createElement('iframe');
        frame.src = new URL('/recaptcha-frame.html', origin).href;
        frame.hidden = true;
        frame.title = title;
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        frame.referrerPolicy = 'no-referrer';
        frame.onload = () => queue.ready(send);
        frame.onerror = cancel;
        host.addEventListener('message', receive);
        host.addEventListener('pagehide', cancel);
        doc.body.append(frame);
    }
    return {
        get disposed() { return disposed; },
        execute(action?: string): Promise<string> {
            if (!active() || !allowsRecaptchaAction(pathname, action) || outstanding >= 8) return Promise.reject(unavailable());
            outstanding++;
            return queue.execute(action).catch(error => { cancel(); throw error; }).finally(() => { outstanding--; });
        },
        cancel,
    };
}
