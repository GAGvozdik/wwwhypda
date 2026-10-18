import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as XLSX from 'xlsx';
const require=createRequire(import.meta.url);
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('src/common/exportWorkbook.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require});

test('XLSX export preserves all rows, zero/null/unicode and literal formula-like strings',()=>{
    const rows=Array.from({length:125},(_,i)=>({id:i,value:i===0?0:i,missing:null,name:'ρ / м² / 岩石',text:'=HYPERLINK("https://example.test")'}));
    const original=JSON.stringify(rows);
    const workbook=exports.createDataWorkbook(rows);
    const binary=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});
    const decoded=XLSX.read(binary,{type:'buffer'});
    const result=XLSX.utils.sheet_to_json(decoded.Sheets.Data,{defval:null});
    assert.deepEqual(result,rows);assert.equal(JSON.stringify(rows),original);
    assert.equal(decoded.Sheets.Data.E2.t,'s');assert.equal(decoded.Sheets.Data.E2.f,undefined);
    assert.equal(XLSX.version,'0.20.3');
});
