import { isCaptchaRequest, RECAPTCHA_CHANNEL } from './recaptchaProtocol';

interface RecaptchaClient {
    ready(callback: () => void): void;
    execute(key: string, options: { action: string }): Promise<string>;
}
type CaptchaWindow = Window & { grecaptcha?: RecaptchaClient };

export function installRecaptchaFrame(host: CaptchaWindow, doc: Document, siteKey: string | undefined) {
    const origin = host.location.origin;
    if (host.parent === host || origin === 'null') return () => {};
    let alive = true;
    let library: Promise<RecaptchaClient> | undefined;
    let script: HTMLScriptElement | undefined;
    const pending = new Set<string>();
    function load(): Promise<RecaptchaClient> {
        if (!siteKey) return Promise.reject(new Error('CAPTCHA unavailable'));
        if (!library) library = new Promise((resolve, reject) => {
            script = doc.createElement('script');
            script.async = true;
            script.src = `https://www.recaptcha.net/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
            script.onerror = () => reject(new Error('CAPTCHA unavailable'));
            script.onload = () => {
                const client = host.grecaptcha;
                if (!client) { reject(new Error('CAPTCHA unavailable')); return; }
                client.ready(() => resolve(client));
            };
            doc.head.append(script);
        });
        return library;
    }
    async function receive(event: MessageEvent) {
        if (!alive || event.source !== host.parent || event.origin !== origin || !isCaptchaRequest(event.data)) return;
        const { id, action } = event.data;
        if (pending.has(id)) return;
        if (pending.size >= 8) {
            host.parent.postMessage({ channel: RECAPTCHA_CHANNEL, type: 'error', id }, origin);
            return;
        }
        pending.add(id);
        try {
            const client = await load();
            if (!alive) return;
            const token = await client.execute(siteKey!, { action });
            if (alive && typeof token === 'string' && token) {
                host.parent.postMessage({ channel: RECAPTCHA_CHANNEL, type: 'token', id, token }, origin);
            } else if (alive) throw new Error('CAPTCHA unavailable');
        } catch {
            if (alive) host.parent.postMessage({ channel: RECAPTCHA_CHANNEL, type: 'error', id }, origin);
        } finally { pending.delete(id); }
    }
    function dispose() {
        alive = false;
        pending.clear();
        host.removeEventListener('message', receive);
        host.removeEventListener('pagehide', dispose);
        // The parent removes this document; removing a script alone is not Google cleanup.
        script?.remove();
    }
    host.addEventListener('message', receive);
    host.addEventListener('pagehide', dispose);
    return dispose;
}
