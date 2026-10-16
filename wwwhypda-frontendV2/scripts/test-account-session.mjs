import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import axios from 'axios';
import { createStore } from 'redux';

async function fixture() {
    const values = new Map([
        ['isDarkTheme', 'true'], ['generalInfoData', '["private draft"]'],
        ['measurementsTableData', '[{"id":1}]'], ['sampleMeasurementTableData', '[{"id":2}]'],
        ['activeStep', '3'], ['submissionId', '7'], ['isSuperuser', 'true'],
    ]);
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
    const window = new EventTarget();
    window.location = { replace: (url) => { window.destination = url; } };
    const context = vm.createContext({ window, document: { documentElement: { dataset: {} } }, localStorage: storage, crypto: webcrypto,
        Event, AbortController, console });
    const modules = new Map();
    const sources = new Map([
        ['axios', { default: axios, CanceledError: axios.CanceledError }],
        ['redux', { createStore }],
    ]);
    async function moduleFor(id) {
        if (modules.has(id)) return modules.get(id);
        if (sources.has(id)) {
            const exports = sources.get(id);
            const module = new vm.SyntheticModule(Object.keys(exports), function () {
                for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
            }, { context, identifier: id });
            modules.set(id, module);
            return module;
        }
        const code = ts.transpileModule(readFileSync(id, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        const module = new vm.SourceTextModule(code, { context, identifier: id,
            initializeImportMeta: (meta) => { meta.env = { VITE_API_BASE_URL: '/api' }; },
        });
        modules.set(id, module);
        return module;
    }
    const root = await moduleFor(path.resolve('src/components/api.tsx'));
    await root.link(async (specifier, parent) => {
        if (sources.has(specifier)) return moduleFor(specifier);
        let id = path.resolve(path.dirname(parent.identifier), specifier);
        if (!path.extname(id)) id += id.endsWith('/api') ? '.tsx' : '.ts';
        return moduleFor(id);
    });
    await root.evaluate();
    return { api: root.namespace.default, values, window,
        session: modules.get(path.resolve('src/components/users/accountSession.ts')).namespace,
        store: modules.get(path.resolve('src/redux/store.ts')).namespace.default };
}

const response = (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });

test('success clears personal drafts and Redux while preserving theme', async () => {
    const { session, store, values } = await fixture();
    session.endAccountSession();
    assert.equal(values.get('isDarkTheme'), 'true');
    for (const key of ['generalInfoData', 'measurementsTableData', 'sampleMeasurementTableData', 'activeStep', 'submissionId', 'isSuperuser']) {
        assert.equal(values.has(key), false);
    }
    assert.equal(store.getState().measurementsTableData.length, 0);
    assert.equal(store.getState().sampleMeasurementTableData.length, 0);
    assert.equal(session.sessionEnded(), true);
});

test('pause aborts late response; resume after failure preserves drafts', async () => {
    const { api, session, values } = await fixture();
    let finish;
    const started = new Promise((resolve) => {
        api.defaults.adapter = (config) => new Promise((done) => {
            finish = () => done(response(config));
            resolve();
        });
    });
    const pending = api.get('/input/my_submissions');
    const rejected = assert.rejects(pending, (error) => axios.isCancel(error));
    await started;
    session.pauseAccountSession();
    finish();
    await rejected;
    await assert.rejects(api.get('/users/check'), (error) => axios.isCancel(error));
    session.resumeAccountSession();
    assert.equal(values.get('generalInfoData'), '["private draft"]');
    api.defaults.adapter = async (config) => response(config);
    assert.equal((await api.get('/users/check')).status, 200);
});

test('deletion stays available while paused; login restores new session', async () => {
    const { api, session } = await fixture();
    api.defaults.adapter = async (config) => response(config);
    session.pauseAccountSession();
    assert.equal((await api.delete('/users/me')).status, 200);
    session.endAccountSession();
    await assert.rejects(api.post('/users/refresh'), (error) => axios.isCancel(error));
    assert.equal((await api.post('/users/login')).status, 200);
    assert.equal(session.sessionUnavailable(), false);
});

test('other tabs clear drafts and leave protected page', async () => {
    const { window, values, session } = await fixture();
    const event = new Event('storage');
    Object.assign(event, { key: 'accountDeletionEpoch', newValue: 'another-tab' });
    window.dispatchEvent(event);
    assert.equal(window.destination, '/');
    assert.equal(values.has('generalInfoData'), false);
    assert.equal(values.get('isDarkTheme'), 'true');
    assert.equal(session.sessionEnded(), true);
});

test('terms-required response preserves drafts, cookies epoch and deletion availability', async () => {
    const {api,session,values,store}=await fixture();
    const before=session.sessionVersion();
    const state=store.getState();
    api.defaults.adapter=async config=>{throw new axios.AxiosError('Review current terms','ERR_BAD_REQUEST',config,null,
        {data:{code:'terms_acceptance_required'},status:409,statusText:'Conflict',headers:{},config});};
    await assert.rejects(api.get('/users/check'),error=>error.response?.status===409);
    assert.equal(session.termsAcceptanceRequired(),true);
    assert.equal(session.sessionVersion(),before);
    assert.equal(session.sessionEnded(),false);
    assert.equal(values.get('generalInfoData'),'["private draft"]');
    assert.equal(values.has('accountDeletionEpoch'),false);
    assert.equal(store.getState(),state);
    api.defaults.adapter=async config=>response(config);
    assert.equal((await api.delete('/users/me')).status,200);
    await api.post('/users/login');
    assert.equal(session.termsAcceptanceRequired(),false);
    assert.equal(values.get('generalInfoData'),'["private draft"]');
});
