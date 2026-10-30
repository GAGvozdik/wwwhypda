import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';
const policy=JSON.parse(readFileSync('src/common/passwordPolicy.json','utf8'));
const messages=JSON.parse(readFileSync('src/common/error_messages.json','utf8'));
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('src/common/passwordPolicy.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {exports,require:name=>({default:name.endsWith('passwordPolicy.json')?policy:messages})});
const validate=exports.validateNewPassword;
test('new passwords accept punctuation, Unicode, spaces, passphrases and 15/128 code-point boundaries',()=>{
    for(const password of ['x'.repeat(14)+'-', 'x'.repeat(14)+'_', 'x'.repeat(127)+'!',
        'É🪨_ phrase - 日本語 42','correct horse battery staple','  a spaced passphrase  ','a'.repeat(14)+'🪨']){
        assert.equal(validate(password),null);
    }
    for(const symbol of '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')assert.equal(validate('a'.repeat(14)+symbol),null);
    for(const password of ['short-pass_42','a'.repeat(13)+'🪨','x'.repeat(128)+'!'])assert.equal(validate(password),messages.password_invalid);
    assert.equal(validate(''),messages.password_required);
    assert.equal(validate('x'.repeat(14)+'\ud800'),messages.password_unicode_invalid);
});
test('obvious common passwords and single-character repetition are blocked locally',()=>{
    for(const password of [...policy.blockedPasswords,...policy.blockedPasswords.map(value=>value.toUpperCase()),'a'.repeat(15),' '.repeat(20),'🪨'.repeat(15)]){
        assert.equal(validate(password),messages.password_common);
    }
});