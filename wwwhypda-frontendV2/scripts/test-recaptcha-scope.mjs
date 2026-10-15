import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
async function moduleFor(name) {
    const source=readFileSync(`src/components/commonFeatures/${name}.ts`,'utf8');
    const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}
const { createRecaptchaQueue }=await moduleFor('recaptchaQueue');
const { requiresRecaptcha, allowsRecaptchaAction }=await moduleFor('recaptchaRoutes');
test('only search/auth action routes are eligible, no read/session provider scope',()=>{
    for(const path of ['/search','/login','/register','/forgot-password']) assert.equal(requiresRecaptcha(path),true);
    for(const path of ['/','/input','/read','/edit','/account','/superaccount','/privacy-policy','/cookie-policy','/user-agreement','/about']) assert.equal(requiresRecaptcha(path),false);
});
test('no load until explicit execute, fresh token per action and no repeated ready execution',async()=>{
    let loads=0; const calls=[];
    const queue=createRecaptchaQueue(()=>{loads++;});
    assert.equal(loads,0);
    const first=queue.execute('login'),second=queue.execute('register');
    assert.equal(calls.length,0);
    assert.equal(loads,2);
    const executor=async action=>{calls.push(action);return `synthetic-${calls.length}`;};
    queue.ready(executor);queue.ready(executor);
    assert.deepEqual(await Promise.all([first,second]),['synthetic-1','synthetic-2']);
    assert.deepEqual(calls,['login','register']);
    assert.equal(await queue.execute('login'),'synthetic-3');
    queue.cancel();
});
test('script unavailable or synchronous provider error reject, never send an action silently',async()=>{
    const queue=createRecaptchaQueue(()=>{},1);
    await assert.rejects(queue.execute('login'),/CAPTCHA unavailable/);
    queue.ready(()=>{throw new Error('private provider body');});
    await assert.rejects(queue.execute('register'),/CAPTCHA unavailable/);
    queue.cancel();
});
test('document exit rejects queued and in-flight tokens and prevents new execution',async()=>{
    const queue=createRecaptchaQueue(()=>{});
    const promise=queue.execute('login');
    queue.cancel();
    await assert.rejects(promise,/CAPTCHA unavailable/);
    await assert.rejects(queue.execute('register'),/CAPTCHA unavailable/);
    const inflight=createRecaptchaQueue(()=>{});
    let complete; inflight.ready(()=>new Promise(resolve=>{complete=resolve;}));
    const pending=inflight.execute('login');
    await Promise.resolve(); inflight.cancel();
    complete('stale-token');
    await assert.rejects(pending,/CAPTCHA unavailable/);
});


test('each action stays bound to its actual form route, including activation and reset resends', () => {
    const expected = {
        '/search': ['search'], '/login': ['login'],
        '/register': ['register', 'confirm_registration', 'resend_code'],
        '/forgot-password': ['request_password_reset', 'resend_password_reset', 'confirm_password_reset'],
    };
    const all = Object.values(expected).flat();
    for (const [route, allowed] of Object.entries(expected)) {
        for (const action of all) assert.equal(allowsRecaptchaAction(route, action), allowed.includes(action));
    }
    for (const route of ['/', '/account', '/input', '/privacy-policy']) {
        for (const action of all) assert.equal(allowsRecaptchaAction(route, action), false);
    }
    for (const bad of [undefined, null, {}, 1, 'session_check']) assert.equal(allowsRecaptchaAction('/login', bad), false);
});
