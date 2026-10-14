import type { CaptchaExecutor } from './recaptchaContext';

// No token caching: each pending explicit action receives its own fresh execute.
export function createRecaptchaQueue(load: () => void, timeoutMs = 15000) {
    let executor: CaptchaExecutor | undefined;
    let cancelled = false;
    const pending = new Set<{ run: () => void; fail: () => void }>();
    return {
        execute(action?: string): Promise<string> {
            if (cancelled) return Promise.reject(new Error('CAPTCHA unavailable'));
            return new Promise((resolve, reject) => {
                let done = false;
                let started = false;
                const finish = (token?: string) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    pending.delete(task);
                    if (token) resolve(token);
                    else reject(new Error('CAPTCHA unavailable'));
                };
                const task = { run: () => {
                    if (!executor || started || done) return;
                    started = true;
                    const run = executor;
                    void Promise.resolve().then(() => {
                        if (done) throw new Error('CAPTCHA unavailable');
                        return run(action);
                    }).then(token => finish(token), () => finish());
                }, fail: () => finish() };
                const timer = setTimeout(task.fail, timeoutMs);
                pending.add(task);
                try {
                    if (executor) task.run();
                    else load();
                } catch { task.fail(); }
            });
        },
        ready(value: CaptchaExecutor) {
            if (cancelled) return;
            executor = value;
            for (const task of pending) task.run();
        },
        cancel() {
            cancelled = true;
            executor = undefined;
            for (const task of pending) task.fail();
        },
    };
}
