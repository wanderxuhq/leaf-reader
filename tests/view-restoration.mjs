
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['src/epub-viewer/lbp.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {parseLBP,serializeLBP}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
for(const value of ['Books/a.epub::2@0/1#3-3@0/2#4','Books/a.epub::0@#0','中文.epub::0@0#0-0#5']){
 const parsed=parseLBP(value);assert.ok(parsed);assert.deepEqual(parseLBP(serializeLBP(parsed)),parsed);
}
for(const value of ['x::0@0//1#0','x::0@/1#0','x::0@0#-1','x::0@0#9007199254740992','x::2@0#0-1@0#3',null,{}]) assert.equal(parseLBP(value),null);
console.log('PASS: LBP round trips, body roots, cross-chapter ranges and malformed input');
