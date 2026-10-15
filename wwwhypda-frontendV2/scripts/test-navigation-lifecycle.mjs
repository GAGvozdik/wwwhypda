import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const channel = 'wwhypda-recaptcha-v1';
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
async function moduleFor(name, globals = {}, externals = {}) {
    const context = vm.createContext({ URL, setTimeout, clearTimeout, ...globals });
    const modules = new Map();
    function load(file) {
        file = path.resolve(file);
        if (modules.has(file)) return modules.get(file);
        const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
            module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
        } }).outputText;
        const module = new vm.SourceTextModule(source, { context, identifier: file });
        modules.set(file, module);
        return module;
    }
    const module = load(name);
    const synthetic = new Map();
    await module.link((specifier, owner) => {
        const dependency = path.resolve(path.dirname(owner.identifier), specifier);
        let values = externals[specifier];
        if (specifier.endsWith('.json')) values = { default: JSON.parse(readFileSync(dependency, 'utf8')) };
        if (/\.(css|scss)$/.test(specifier)) values = { default: {} };
        if (values) {
            const key = specifier.endsWith('.json') ? dependency : specifier;
            if (!synthetic.has(key)) synthetic.set(key, new vm.SyntheticModule(Object.keys(values), function () {
                for (const [name, value] of Object.entries(values)) this.setExport(name, value);
            }, { context }));
            return synthetic.get(key);
        }
        return load(`${dependency}.ts`);
    });
    await module.evaluate();
    return module.namespace;
}
function eventTarget(extra = {}) {
    const listeners = new Map();
    return { ...extra, listeners,
        addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
        removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
        emit(type, data = {}) { return Promise.all([...listeners.get(type) || []].map(callback => callback(data))); },
    };
}
function fixture(route = '/login') {
    let nextId = 0;
    const sent = [], frames = [], scripts = [];
    const host = eventTarget({ location: { origin: 'http://localhost:8080', pathname: route },
        crypto: { randomUUID: () => uid(++nextId) } });
    const doc = {
        body: { append: frame => { frames.push(frame); } },
        head: { append: script => { scripts.push(script); } },
        createElement: type => {
            if (type === 'script') return { remove() { this.removed = true; } };
            assert.equal(type, 'iframe');
            return { contentWindow: { postMessage: (data, origin) => sent.push({ data, origin }) },
                setAttribute(name, value) { this[name] = value; }, remove() { this.removed = true; } };
        },
    };
    return { host, doc, sent, frames, scripts };
}
async function bridgeFixture(route = '/login', timeout = 1000) {
    const f = fixture(route);
    const { createRecaptchaFrameBridge } = await moduleFor('src/components/commonFeatures/recaptchaFrameBridge.ts');
    return { ...f, bridge: createRecaptchaFrameBridge(route, 'Security verification', f.host, f.doc, timeout) };
}
function reply(f, id, token = 'synthetic-token', changes = {}) {
    return f.host.emit('message', { origin: f.host.location.origin, source: f.frames[0].contentWindow,
        data: { channel, type: 'token', id, token }, ...changes });
}

test('early bootstrap restores explicit preference, defaults dark and tolerates inaccessible storage', async () => {
    const source = readFileSync('public/theme-bootstrap.js', 'utf8');
    for (const saved of [null, '', 'true', 'false', 'other', 'denied']) {
        const root = { dataset: {} };
        vm.runInNewContext(source, { document: { documentElement: root }, localStorage: {
            getItem: () => { if (saved === 'denied') throw new Error('denied'); return saved; },
        } });
        assert.equal(root.dataset.theme, ['false', 'other'].includes(saved) ? 'light' : 'dark');
        const persisted = [];
        const theme = await moduleFor('src/common/theme.ts', { document: { documentElement: root }, localStorage: {
            getItem: () => { throw new Error('denied'); }, setItem: (...args) => persisted.push(args),
        } });
        assert.equal(theme.readThemePreference(), root.dataset.theme === 'dark');
        theme.saveThemePreference(false);
        assert.equal(root.dataset.theme, 'light');
        assert.deepEqual(persisted, [['isDarkTheme', 'false']]);
    }
    const html = readFileSync('index.html', 'utf8');
    assert.ok(html.indexOf('/theme-bootstrap.js') < html.indexOf('/src/main.tsx'));
});

test('bridge creates one same-origin document only after allowed action; tokens are never cached', async () => {
    const f = await bridgeFixture();
    assert.equal(f.frames.length, 0);
    await assert.rejects(f.bridge.execute('register'), /CAPTCHA unavailable/);
    assert.equal(f.frames.length, 0);
    for (let i = 1; i <= 2; i++) {
        const promise = f.bridge.execute('login');
        if (i === 1) f.frames[0].onload();
        await flush();
        const request = f.sent.at(-1);
        assert.equal(request.origin, 'http://localhost:8080');
        assert.equal(request.data.action, 'login');
        await reply(f, request.data.id, `synthetic-${i}`);
        assert.equal(await promise, `synthetic-${i}`);
    }
    assert.notEqual(f.sent[0].data.id, f.sent[1].data.id);
    assert.equal(f.frames.length, 1);
    assert.equal(f.scripts.length, 0);
    assert.equal(f.frames[0].src, 'http://localhost:8080/recaptcha-frame.html');
    f.bridge.cancel();
    assert.equal(f.frames[0].removed, true);
});

test('bridge ignores wrong origin, source, request ID and unexpected message shape', async () => {
    const f = await bridgeFixture();
    let resolved = false;
    const promise = f.bridge.execute('login').then(token => { resolved = true; return token; });
    f.frames[0].onload(); await flush();
    const id = f.sent[0].data.id;
    await reply(f, id, 'wrong', { origin: 'https://foreign.invalid' });
    await reply(f, id, 'wrong', { source: {} });
    await reply(f, uid(999), 'wrong');
    await reply(f, id, 'wrong', { data: { channel, type: 'token', id, token: 'wrong', extra: true } });
    await reply(f, id, { token: 'wrong' });
    await flush(); assert.equal(resolved, false);
    await reply(f, id); assert.equal(await promise, 'synthetic-token');
    f.bridge.cancel();
});

test('departure cancels queued/in-flight work and a late token cannot submit a form', async () => {
    for (const loaded of [false, true]) {
        const f = await bridgeFixture();
        let submitted = false;
        const promise = f.bridge.execute('login').then(() => { submitted = true; });
        if (loaded) { f.frames[0].onload(); await flush(); }
        const rejection = assert.rejects(promise, /CAPTCHA unavailable/);
        f.host.location.pathname = '/privacy-policy';
        if (loaded) await reply(f, f.sent[0].data.id);
        else f.bridge.cancel();
        await rejection;
        assert.equal(submitted, false);
        assert.equal(f.frames[0].removed, true);
        assert.equal(f.host.listeners.get('message').size, 0);
        await assert.rejects(f.bridge.execute('login'), /CAPTCHA unavailable/);
        f.host.location.pathname = '/login';
        await assert.rejects(f.bridge.execute('login'), /CAPTCHA unavailable/);
    }
});

test('timeout/pagehide remove the document and return remains lazy until a fresh action', async () => {
    const timed = await bridgeFixture('/login', 5);
    await assert.rejects(timed.bridge.execute('login'), /CAPTCHA unavailable/);
    assert.equal(timed.frames[0].removed, true);
    assert.equal(timed.bridge.disposed, true);
    const f = await bridgeFixture();
    const promise = f.bridge.execute('login');
    const rejection = assert.rejects(promise, /CAPTCHA unavailable/);
    await f.host.emit('pagehide'); await rejection;
    assert.equal(f.frames[0].removed, true);
    const fresh = await bridgeFixture();
    assert.equal(fresh.frames.length, 0);
    const next = fresh.bridge.execute('login');
    const cancelled = assert.rejects(next, /CAPTCHA unavailable/);
    fresh.bridge.cancel(); await cancelled;
});

test('bridge bounds queued requests before document load', async () => {
    const f = await bridgeFixture();
    const pending = Array.from({ length: 8 }, () => f.bridge.execute('login'));
    const rejected = pending.map(p => assert.rejects(p, /CAPTCHA unavailable/));
    await assert.rejects(f.bridge.execute('login'), /CAPTCHA unavailable/);
    assert.equal(f.frames.length, 1);
    f.bridge.cancel(); await Promise.all(rejected);
});

async function childFixture(siteKey = 'synthetic-public-key') {
    const f = fixture();
    const messages = [];
    f.host.parent = { postMessage: (data, origin) => messages.push({ data, origin }) };
    const executions = [];
    f.host.grecaptcha = { ready: callback => callback(), execute: async (_key, options) => {
        executions.push(options.action); return 'synthetic-child-token';
    } };
    const { installRecaptchaFrame } = await moduleFor('src/components/commonFeatures/recaptchaFrameRuntime.ts');
    const dispose = installRecaptchaFrame(f.host, f.doc, siteKey);
    const event = (changes = {}) => ({ source: f.host.parent, origin: f.host.location.origin,
        data: { channel, type: 'execute', id: uid(1), action: 'search' }, ...changes });
    return { ...f, messages, executions, event, dispose, installRecaptchaFrame };
}

test('child rejects foreign/unexpected messages before loading Google; exact action is forwarded', async () => {
    const f = await childFixture();
    assert.equal(f.scripts.length, 0);
    for (const changes of [{ source: {} }, { origin: 'null' }, { origin: 'https://foreign.invalid' },
        { data: { channel, type: 'execute', id: uid(1), action: 'session_check' } },
        { data: { channel, type: 'execute', id: uid(1), action: 'search', email: 'never-forwarded@example.test' } }]) {
        await f.host.emit('message', f.event(changes));
    }
    assert.equal(f.scripts.length, 0);
    const work = f.host.emit('message', f.event());
    assert.equal(f.scripts.length, 1);
    f.scripts[0].onload(); await work;
    assert.deepEqual(f.executions, ['search']);
    assert.equal(f.messages[0].origin, 'http://localhost:8080');
    assert.deepEqual({ ...f.messages[0].data }, { channel, type: 'token', id: uid(1), token: 'synthetic-child-token' });
    f.dispose();
});

test('blocked Google fails locally; disposed child never forwards a late token', async () => {
    const blocked = await childFixture();
    const work = blocked.host.emit('message', blocked.event());
    blocked.scripts[0].onerror(); await work;
    assert.deepEqual({ ...blocked.messages[0].data }, { channel, type: 'error', id: uid(1) });
    blocked.dispose();
    const f = await childFixture();
    let finish;
    f.host.grecaptcha.execute = () => new Promise(resolve => { finish = resolve; });
    const running = f.host.emit('message', f.event());
    f.scripts[0].onload(); await flush();
    f.dispose(); finish('synthetic-late'); await running;
    assert.equal(f.messages.length, 0);
    const top = await childFixture();
    top.dispose(); top.host.parent = top.host;
    top.installRecaptchaFrame(top.host, top.doc, 'synthetic');
    assert.equal(top.host.listeners.get('message').size, 0);
});


const jsxRuntime = { Fragment: 'Fragment', jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) };

test('App keeps the same provider/shell component path across public, action and protected routes', async () => {
    let pathname = '/';
    const Shell = () => {}, Captcha = () => {}, Router = () => {}, Provider = () => {};
    const app = await moduleFor('src/App.tsx', {}, {
        'react/jsx-runtime': jsxRuntime,
        'react-redux': { Provider }, './redux/store': { default: {} },
        'react-router-dom': { BrowserRouter: Router, useLocation: () => ({ pathname }) },
        './components/mainWindow/mainWindow': { default: Shell },
        './components/commonFeatures/recaptchaProvider': { default: Captcha },
    });
    const site = app.default().props.children.props.children.type;
    for (pathname of ['/', '/search', '/login', '/register', '/forgot-password', '/account', '/input',
        '/privacy-policy', '/cookie-policy', '/user-agreement', '/about', '/superaccount']) {
        const node = site();
        assert.equal(node.type, Captcha);
        assert.equal(node.props.pathname, pathname);
        assert.equal(node.props.children.type, Shell);
        assert.equal(node.key, undefined);
        assert.equal(node.props.children.key, undefined);
    }
});

test('provider route cleanup cancels the bridge without dropping children, and return stays lazy', async () => {
    const f = fixture();
    const ref = { current: null }, shell = {};
    let effect, cleanup, previous;
    const react = { useCallback: fn => fn, useRef: () => ref,
        useLayoutEffect: callback => { effect = callback; }, createContext: () => ({ Provider: 'ContextProvider' }) };
    const module = await moduleFor('src/components/commonFeatures/recaptchaProvider.tsx', { window: f.host, document: f.doc },
        { react, 'react/jsx-runtime': jsxRuntime });
    function render(pathname) {
        f.host.location.pathname = pathname;
        const node = module.default({ pathname, children: shell });
        if (previous !== pathname) { cleanup?.(); cleanup = effect(); previous = pathname; }
        assert.equal(node.props.children, shell);
        return node.props.value;
    }
    const execute = render('/login');
    assert.equal(f.frames.length, 0);
    const work = execute('login');
    const rejected = assert.rejects(work, /CAPTCHA unavailable/);
    assert.equal(render('/privacy-policy'), undefined);
    await rejected;
    assert.equal(f.frames[0].removed, true);
    const again = render('/login');
    assert.equal(f.frames.length, 1);
    const next = again('login');
    assert.equal(f.frames.length, 2);
    const cancelled = assert.rejects(next, /CAPTCHA unavailable/);
    render('/register'); await cancelled;
    assert.equal(f.frames[1].removed, true);
    cleanup();
});

async function searchView(execute, sampleResponse = []) {
    const slots = [], effectTasks = [], calls = [], updates = [];
    let cursor = 0;
    const react = {
        useContext: () => execute, useCallback: callback => callback,
        useState: initial => {
            const i = cursor++;
            if (!(i in slots)) slots[i] = initial;
            return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
        },
        useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
        useEffect: (callback, deps) => {
            const i = cursor++;
            if (!(i in slots) || deps.some((value, index) => value !== slots[i]?.[index])) {
                slots[i] = deps; effectTasks.push(callback);
            }
        },
    };
    const dependencies = {
        react: { ...react, default: react }, 'react/jsx-runtime': jsxRuntime,
        'react-redux': { useSelector: callback => callback({ currentRTID: '10', currentRTName: 'Synthetic' }), useDispatch: () => update => updates.push(update) },
        '../../redux/actions': { UpdateTableData: data => ({ type: 'table', data }) },
        '../commonFeatures/recaptchaContext': { RecaptchaRequestContext: {} },
        '../api': { default: { get: async (url, config) => {
            calls.push({ url, config });
            return { data: url === '/rocks/parameters' ? [{ id_Parameter: 7 }] : sampleResponse };
        } } },
    };
    for (const component of ['../tree/mainTree', '@mui/material/FormControl', '@mui/material/RadioGroup',
        './searchTableRow', '../commonFeatures/singleSkeleton', './searchResultsTable']) dependencies[component] = { default: component };
    const module = await moduleFor('src/components/search/search.tsx', { console: { log() {} } }, dependencies);
    function render() { cursor = 0; const tree = module.default(); for (const callback of effectTasks.splice(0)) callback(); return tree; }
    function nodes() {
        const result = [];
        function visit(node) {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) { node.forEach(visit); return; }
            result.push(node); visit(node.props?.children);
        }
        visit(render()); return result;
    }
    const find = type => nodes().find(node => node.type === type);
    render(); await flush();
    find('@mui/material/RadioGroup').props.onChange({ target: { value: '7' } });
    return { calls, updates, find, nodes, submit: () => find('@mui/material/FormControl').props.onSubmit({ preventDefault() {} }) };
}

test('Search pending blocks duplicate submit and preserves API/action/header and result update', async () => {
    let finish, executions = 0;
    const view = await searchView(action => { assert.equal(action, 'search'); executions++; return new Promise(resolve => { finish = resolve; }); }, [{ value: 42 }]);
    view.submit(); view.submit();
    assert.equal(executions, 1);
    assert.equal(view.find('button').props.disabled, true);
    assert.equal(view.calls.length, 1);
    finish('synthetic-search'); await flush();
    assert.equal(view.calls[1].url, '/rocks/samples/10/7');
    assert.equal(view.calls[1].config.headers['X-Recaptcha-Token'], 'synthetic-search');
    assert.equal(view.updates[0].data[0].id, 1);
    assert.equal(view.find('button').props.disabled, false);
});

test('Search CAPTCHA failure stays local to results, retains controls and permits retry', async () => {
    let attempt = 0;
    const view = await searchView(async () => { if (++attempt === 1) throw new Error('CAPTCHA unavailable'); return 'synthetic-search'; });
    view.submit(); await flush();
    const panels = view.nodes().filter(node => node.type === '../commonFeatures/singleSkeleton');
    assert.equal(panels[0].props.error, null);
    assert.equal(panels[1].props.error, 'Verification is not ready. Please try again.');
    assert.equal(view.calls.length, 1);
    assert.equal(view.find('button').props.disabled, false);
    view.submit(); await flush();
    assert.equal(view.calls.length, 2);
    assert.equal(view.updates.length, 1);
});


test('theme helper remains usable when storage is blocked and bootstrap attribute is absent', async () => {
    const root = { dataset: {} };
    const theme = await moduleFor('src/common/theme.ts', { document: { documentElement: root }, localStorage: {
        getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); },
    } });
    assert.equal(theme.readThemePreference(), true);
    assert.doesNotThrow(() => theme.saveThemePreference(false));
    assert.equal(root.dataset.theme, 'light');
});


test('frame origin follows each HTTPS hostname exactly, without adding an alternate origin', async () => {
    const { createRecaptchaFrameBridge } = await moduleFor('src/components/commonFeatures/recaptchaFrameBridge.ts');
    for (const origin of ['https://site.example.test', 'https://www.site.example.test']) {
        const f = fixture('/search'); f.host.location.origin = origin;
        const bridge = createRecaptchaFrameBridge('/search', 'Security verification', f.host, f.doc);
        const work = bridge.execute('search'); f.frames[0].onload(); await flush();
        assert.equal(f.frames[0].src, `${origin}/recaptcha-frame.html`);
        assert.equal(f.sent[0].origin, origin);
        await reply(f, f.sent[0].data.id);
        assert.equal(await work, 'synthetic-token');
        bridge.cancel();
    }
});

test('existing guards conceal private children during loading and preserve role redirects', async () => {
    let auth = { isAuth: null, isSuperuser: null };
    const dependencies = { react: { default: {} }, 'react/jsx-runtime': jsxRuntime,
        'react-router-dom': { Navigate: 'Navigate' }, '../useAuthCheck': { default: () => auth },
        '../../commonFeatures/singleSkeleton': { default: 'Skeleton' } };
    const protectedRoute = await moduleFor('src/components/users/routes/protectedRoute.tsx', {}, dependencies);
    const superRoute = await moduleFor('src/components/users/routes/superProtectedRoute.tsx', {}, dependencies);
    const privateChild = { private: true };
    for (const guard of [protectedRoute.default, superRoute.default]) {
        const node = guard({ children: privateChild });
        assert.notEqual(node.props.children, privateChild);
    }
    auth = { isAuth: false, isSuperuser: false };
    for (const guard of [protectedRoute.default, superRoute.default]) assert.equal(guard({ children: privateChild }).props.to, '/login');
    auth = { isAuth: true, isSuperuser: false };
    assert.equal(protectedRoute.default({ children: privateChild }).props.children, privateChild);
    assert.equal(superRoute.default({ children: privateChild }).props.to, '/account');
    assert.equal(superRoute.default({ children: privateChild, redirectIfSuperuser: true }).props.children, privateChild);
    auth = { isAuth: true, isSuperuser: true };
    assert.equal(superRoute.default({ children: privateChild }).props.children, privateChild);
    assert.equal(superRoute.default({ children: privateChild, redirectIfSuperuser: true }).props.to, '/superaccount');
});
