import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {recoveryBytes,refreshWorldGltf} from '../tools/refresh_world_gltf.mjs';
const original=Buffer.from('{\n  "asset": {"version":"2.0"}\n}\n');
const expected=createHash('sha256').update(original).digest('hex');
test('an unchanged Windows CRLF conversion recovers exactly the committed glTF bytes',()=>{
 const windows=Buffer.from(original.toString().replace(/\n/g,'\r\n'));
 assert.deepEqual(recoveryBytes(windows,original,expected),original);
 assert.equal(recoveryBytes(original,original,expected),null);
});
test('local semantic edits and a mismatching committed asset are preserved by rejection',()=>{
 assert.throws(()=>recoveryBytes(Buffer.from('{"asset":"user edit"}'),original,expected),/Local asset contains changes/);
 assert.throws(()=>recoveryBytes(original,original,'0'.repeat(64)),/Committed asset/);
});
test('the complete Git-bound repair preflight preserves every local edit before restoring only line endings',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scarlet-gltf-recovery-'));
 try{
  const assets=path.join(dir,'forschung/ashbound/play/assets');fs.mkdirSync(assets,{recursive:true});
  fs.writeFileSync(path.join(dir,'.gitattributes'),'*.gltf -text\n');
  for(const name of ['a.gltf','b.gltf'])fs.writeFileSync(path.join(assets,name),original);
  fs.writeFileSync(path.join(assets,'manifest.json'),JSON.stringify({files:['a.gltf','b.gltf'].map(p=>({path:p,sha256:expected}))}));
  const git=(...args)=>execFileSync('git',args,{cwd:dir,stdio:'pipe'});
  git('init','-q');git('add','--','.gitattributes','forschung/ashbound/play/assets');
  git('-c','user.name=Synthetic Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','Synthetic glTF baseline');
  const windows=Buffer.from(original.toString().replace(/\n/g,'\r\n'));
  fs.writeFileSync(path.join(assets,'a.gltf'),windows);fs.writeFileSync(path.join(assets,'b.gltf'),'user edit');
  assert.throws(()=>refreshWorldGltf(dir,{repair:true}),/Local asset contains changes/);
  assert.deepEqual(fs.readFileSync(path.join(assets,'a.gltf')),windows);
  fs.writeFileSync(path.join(assets,'b.gltf'),windows);
  assert.equal(refreshWorldGltf(dir).pending.length,2);
  assert.deepEqual(fs.readFileSync(path.join(assets,'a.gltf')),windows);
  assert.equal(refreshWorldGltf(dir,{repair:true}).restored,2);
  assert.equal(git('status','--porcelain').toString(),'');
 }finally{
  const real=fs.realpathSync(dir);
  if(path.dirname(real)!==fs.realpathSync(os.tmpdir())||!path.basename(real).startsWith('scarlet-gltf-recovery-'))throw Error('Unsafe fixture cleanup path');
  fs.rmSync(real,{recursive:true,force:true});
 }
});
