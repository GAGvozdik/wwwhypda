import {ESLint} from 'eslint';
import {readFileSync} from 'node:fs';
const baseline=JSON.parse(readFileSync('/baseline.json','utf8'));
const eslint=new ESLint({overrideConfig:{rules:{'react-refresh/only-export-components':['error',{allowConstantExport:true,extraHOCs:['withRecaptcha']}]}}});
let newIssues=0,oldIssues=0,currentIssues=0;
const signature=message=>JSON.stringify([message.ruleId,message.severity,message.message]);
for(const [file,before] of Object.entries(baseline)){
    const old=before===null?[]:(await eslint.lintText(before,{filePath:file}))[0].messages;
    const current=(await eslint.lintFiles([file]))[0].messages;
    oldIssues+=old.length;currentIssues+=current.length;
    const remaining=old.map(signature);
    for(const message of current){
        const index=remaining.indexOf(signature(message));
        if(index>=0)remaining.splice(index,1);
        else{newIssues++;console.error(file,message.ruleId,message.message);}
    }
}
console.log(JSON.stringify({files:Object.keys(baseline).length,baselineIssues:oldIssues,currentIssues,newIssues}));
process.exitCode=newIssues?1:0;
