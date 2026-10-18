import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const messages = JSON.parse(readFileSync('src/common/error_messages.json', 'utf8'));
function fixture(file, post = async () => ({ status: 200, data: {} }), restricted = false) {
    const slots = [], effects = [], timers = new Set(), calls = [], actions = [], destinations = [];
    let cursor = 0;
    const react = {
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
        useState: initial => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
            return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
        },
        useRef: initial => {
            const index = cursor++;
            if (!(index in slots)) slots[index] = { current: initial };
            return slots[index];
        },
        useCallback: callback => callback,
        useEffect: callback => { effects.push(callback); },
    };
    const source = readFileSync(`src/components/users/auth/${file}.tsx`, 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText.replaceAll('import.meta.env.BASE_URL', "'/'");
    const exports = {};
    const components = { UserButton: 'UserButton', ErrorMessage: 'ErrorMessage' };
    const dependencies = {
        react, axios: { isAxiosError: value => Boolean(value?.isAxiosError) },
        'react-router-dom': { Link: 'Link', useNavigate: () => (...args) => destinations.push(args),
            useLocation: () => ({ pathname: '/login' }) },
    };
    vm.runInNewContext(output, {
        exports, require: name => {
            if (name in dependencies) return dependencies[name];
            if (name.endsWith('error_messages.json')) return messages;
            if (name.endsWith('.module.scss')) return {};
            if (name.endsWith('/modalWindow')) return 'ModalWindow';
            if (name.endsWith('/modalContext')) return { useModal: () => ({ modalRootRef: {current:null} }) };
            if (name === '@mui/material/Button') return 'Button';
            if (name.endsWith('/api')) return { post: async (...args) => { calls.push(args); return post(...args); },
                get: async () => ({ data: { is_superuser: false } }) };
            if (name.endsWith('/withRecaptcha')) return value => value;
            if (name === './userButton') return components.UserButton;
            if (name === './errorMessage') return components.ErrorMessage;
            if (name.endsWith('/accounts/deleteAccount')) return 'DeleteAccount';
            if (name.endsWith('/accountSession')) return { termsAcceptanceRequired: () => restricted, termsEvent: 'terms-required', clearTermsRequirement: () => { restricted=false; } };
            if (name.endsWith('/legalDocuments')) return {
                legalDocuments: ['user-agreement','privacy-policy','cookie-policy'].map(slug => ({slug,label:slug,route:'/'+slug})),
                legalPdfPath: (slug,version) => 'legal/'+slug+'-'+version+'.pdf',
            };
            if (name.endsWith('/customCheckbox')) return 'CustomCheckbox';
            if (name.endsWith('/userAgreementVersion')) return { USER_AGREEMENT_VERSION: 'synthetic-version' };
            if (name === './validation') return { validateRegistration: () => null };
            throw new Error(`Unexpected dependency ${name}`);
        },
        setInterval: callback => { timers.add(callback); return callback; },
        clearInterval: callback => timers.delete(callback),
        localStorage: { setItem: () => {} },
        window: new EventTarget(),
    });
    const execute = async action => { actions.push(action); return 'synthetic-token-' + actions.length; };
    let cleanups = [];
    function render() {
        cursor = 0;
        cleanups.forEach(callback => callback?.());
        effects.length = 0;
        const tree = exports.default({ executeRecaptcha: execute });
        cleanups = effects.map(callback => callback());
        return tree;
    }
    function nodes(tree = render()) {
        const result = [];
        function visit(node) {
            if (Array.isArray(node)) { node.forEach(visit); return; }
            if (!node || typeof node !== 'object') return;
            result.push(node);
            visit(node.props?.children);
        }
        visit(tree);
        return result;
    }
    const find = (type, predicate = () => true) => nodes().find(node => node.type === type && predicate(node.props));
    function input(type, value, index = 0) {
        nodes().filter(node => node.type === 'input' && node.props.type === type)[index].props.onChange({ target: { value } });
    }
    return { render, nodes, find, input, calls, actions, destinations,
        tick: () => { [...timers].forEach(callback => callback()); render(); } };
}
const event = { preventDefault() {} };

test('reset initial/resend keep generic notice, identical step/countdown and explicit actions', async () => {
    for (const category of ['active', 'unknown', 'unconfirmed', 'disabled']) {
        const view = fixture('forgotPassword');
        view.input('email', `${category}@example.test`);
        await view.find('form').props.onSubmit(event);
        assert.equal(view.find('input', props => props.type === 'email'), undefined);
        const notice = view.find('ErrorMessage').props;
        assert.equal(notice.isError, false);
        assert.ok(notice.error.includes(messages.password_reset_requested));
        assert.ok(notice.error.includes('30'));
        const resend = () => view.find('UserButton', props => props.text === messages.resend_code_button);
        assert.equal(resend().props.disabled, true);
        await resend().props.onclick();
        assert.equal(view.calls.length, 1);
        for (let n = 0; n < 30; n++) view.tick();
        await resend().props.onclick();
        assert.equal(view.calls.length, 2);
        assert.deepEqual(view.actions, ['request_password_reset', 'resend_password_reset']);
        assert.ok(view.find('ErrorMessage').props.error.includes(messages.password_reset_requested));
        assert.equal(resend().props.disabled, true);
    }
});

test('reset pending prevents duplicates; network/rate errors remain errors', async () => {
    let finish;
    const view = fixture('forgotPassword', () => new Promise(resolve => { finish = resolve; }));
    view.input('email', 'synthetic@example.test');
    const pending = view.find('form').props.onSubmit(event);
    await Promise.resolve(); await Promise.resolve();
    assert.equal(view.find('UserButton').props.isLoading, true);
    await view.find('form').props.onSubmit(event);
    assert.equal(view.calls.length, 1);
    finish({ status: 200, data: {} });
    await pending;
    assert.equal(view.find('UserButton', props => props.text === messages.reset_password_button).props.isLoading, false);
    const failed = fixture('forgotPassword', async () => { throw { isAxiosError: true, response: { status: 429, data: { message: 'Try again later' } } }; });
    failed.input('email', 'synthetic@example.test');
    await failed.find('form').props.onSubmit(event);
    assert.equal(failed.find('ErrorMessage').props.isError, true);
    assert.equal(failed.find('ErrorMessage').props.error, 'Try again later');
    assert.ok(failed.find('input', props => props.type === 'email'));
});

test('registration terms/adult requirements and neutral initial/resend states remain intact', async () => {
    for (const category of ['new', 'active', 'unconfirmed', 'disabled']) {
        const view = fixture('registration');
        await view.find('form').props.onSubmit(event);
        assert.equal(view.calls.length, 0);
        const checks = view.nodes().filter(node => node.type === 'CustomCheckbox');
        assert.equal(checks.length, 2);
        checks.forEach(node => node.props.onChange(true));
        view.input('email', `${category}@example.test`);
        view.input('text', 'Researcher');
        view.input('password', 'Password1!', 0);
        view.input('password', 'Password1!', 1);
        await view.find('form').props.onSubmit(event);
        assert.equal(view.calls.length, 1);
        assert.equal(view.calls[0][1].terms_accepted, true);
        assert.equal(view.calls[0][1].adult_confirmed, true);
        assert.equal(view.find('ErrorMessage').props.isError, false);
        assert.ok(view.find('ErrorMessage').props.error.includes(messages.registration_requested));
        const resend = () => view.find('UserButton', props => props.text === messages.resend_code_button);
        assert.equal(resend().props.disabled, true);
        for (let n = 0; n < 30; n++) view.tick();
        await resend().props.onclick();
        assert.deepEqual(view.actions, ['register', 'resend_code']);
        assert.equal(view.find('ErrorMessage').props.isError, false);
    }
});

test('failed login has safe error; successful login preserves check and destination', async () => {
    const bad = fixture('login', async () => { throw { isAxiosError: true, response: { data: { message: 'Invalid email or password' } } }; });
    bad.input('email', 'synthetic@example.test'); bad.input('password', 'WrongPassword1!');
    await bad.find('form').props.onSubmit(event);
    assert.equal(bad.find('ErrorMessage').props.error, 'Invalid email or password');
    assert.equal(bad.find('ErrorMessage').props.isError, true);
    assert.equal(bad.destinations.length, 0);
    const good = fixture('login');
    good.input('email', 'synthetic@example.test'); good.input('password', 'Password1!');
    await good.find('form').props.onSubmit(event);
    assert.equal(good.destinations.at(-1)[0], '/account');
});

test('terms review requires an unchecked choice, fresh CAPTCHA and keeps password out of links', async () => {
    let n=0;
    const view=fixture('login',async () => {
        if(n++===0) throw {isAxiosError:true,response:{status:409,data:{
            code:'terms_acceptance_required',terms_version:'new-edition'}}};
        return {status:200,data:{}};
    });
    view.input('email','synthetic@example.test');view.input('password','Password1!');
    await view.nodes().filter(node=>node.type==='form').at(-1).props.onSubmit(event);
    assert.equal(view.find('CustomCheckbox').props.isChecked,false);
    assert.equal(view.find('Button',props=>props.type==='submit').props.disabled,true);
    assert.equal(view.destinations.length,0);
    assert.equal(view.find('input',props=>props.type==='password').props.value,'Password1!');
    const links=view.nodes().filter(node=>node.type==='a');
    assert.equal(links.length,6);
    assert.ok(links.every(node=>node.props.target==='_blank' && !node.props.href.includes('Password')));
    await view.nodes().filter(node=>node.type==='form').at(-1).props.onSubmit(event);
    assert.equal(view.calls.length,1);
    view.find('CustomCheckbox').props.onChange(true);
    await view.nodes().filter(node=>node.type==='form').at(-1).props.onSubmit(event);
    assert.deepEqual(view.actions,['login','login']);
    assert.notEqual(view.calls[0][1].recaptcha_token,view.calls[1][1].recaptcha_token);
    assert.equal(view.calls[1][1].terms_accepted,true);
    assert.equal(view.calls[1][1].terms_version,'new-edition');
    assert.equal(view.destinations.at(-1)[0],'/account');
});

test('changed release resets acceptance and refusal makes no acceptance request', async () => {
    let n=0;
    const view=fixture('login',async () => {throw {isAxiosError:true,response:{status:409,data:{
        code:n++===0?'terms_acceptance_required':'terms_version_mismatch',
        terms_version:n===1?'first':'second'}}};});
    view.input('email','synthetic@example.test');view.input('password','Password1!');
    await view.nodes().filter(node=>node.type==='form').at(-1).props.onSubmit(event);
    view.find('CustomCheckbox').props.onChange(true);
    await view.nodes().filter(node=>node.type==='form').at(-1).props.onSubmit(event);
    assert.equal(view.find('CustomCheckbox').props.isChecked,false);
    assert.equal(view.find('ErrorMessage').props.error,messages.terms_version_mismatch);
    const decline=view.find('Button',props=>props.children.includes(messages.terms_decline));
    decline.props.onClick();
    assert.equal(view.destinations.at(-1)[0],'/');
    assert.equal(view.calls.length,2);
});


test('terms modal close preserves credentials, clears choice and makes no request', async () => {
    const view=fixture('login',async()=>{throw {isAxiosError:true,response:{status:409,data:{
        code:'terms_acceptance_required',terms_version:'new-edition'}}};});
    view.input('email','synthetic@example.test');view.input('password','Password1!');
    await view.find('form').props.onSubmit(event);
    assert.equal(view.find('ModalWindow',props=>props.labelledBy==='updated-terms-title').props.open,true);
    assert.equal(view.find('ModalWindow',props=>props.labelledBy==='updated-terms-title').props.labelledBy,'updated-terms-title');
    assert.equal(view.find('CustomCheckbox').props.autoFocus,true);
    assert.equal(view.find('CustomCheckbox').props.labelledBy,'updated-terms-label');
    view.find('CustomCheckbox').props.onChange(true);
    view.find('ModalWindow',props=>props.labelledBy==='updated-terms-title').props.onClose();
    assert.equal(view.find('ModalWindow',props=>props.labelledBy==='updated-terms-title').props.open,false);
    assert.equal(view.find('CustomCheckbox'),undefined);
    assert.equal(view.find('input',props=>props.type==='password').props.value,'Password1!');
    assert.equal(view.calls.length,1);
    await view.find('form').props.onSubmit(event);
    assert.equal(view.find('CustomCheckbox').props.isChecked,false);
    assert.equal(view.calls[1][1].terms_accepted,undefined);
});


test('old-session notice is modal; closing or choosing sign-in never accepts documents', () => {
    for (const method of ['close','sign-in']) {
        const view=fixture('login',undefined,true);
        const modal=()=>view.find('ModalWindow',props=>props.labelledBy==='restricted-session-title');
        assert.equal(modal().props.open,true);
        assert.equal(modal().props.describedBy,'restricted-session-description');
        assert.ok(view.find('DeleteAccount'));
        if(method==='close')modal().props.onClose();
        else view.find('Button',props=>props.children.includes(messages.terms_review_sign_in)).props.onClick();
        assert.equal(modal().props.open,false);
        view.find('Button',props=>props.children.includes(messages.terms_update_title)).props.onClick();
        assert.equal(modal().props.open,true);
        assert.equal(view.calls.length,0);
        assert.equal(view.destinations.length,0);
    }
});

test('old-session modal logout remains available without accepting documents', async () => {
    const view=fixture('login',undefined,true);
    await view.find('Button',props=>props.children.includes(messages.logout)).props.onClick();
    assert.equal(view.calls.length,1);
    assert.equal(view.calls[0][0],'/users/logout');
    assert.equal(view.calls[0][1].terms_accepted,undefined);
    assert.equal(view.destinations.at(-1)[0],'/');
});
