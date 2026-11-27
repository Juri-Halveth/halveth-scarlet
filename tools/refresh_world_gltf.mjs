// HALVETH PIRL 2.0; see LICENSES.md. Explicit recovery for old Windows checkouts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function recoveryBytes(actual,committed,expected){
  if(!/^[a-f0-9]{64}$/.test(expected)||digest(committed)!==expected)throw Error('Committed asset does not match its manifest.');
  if(actual.equals(committed))return null;
  const normalized=Buffer.from(actual.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
  if(!normalized.equals(committed))throw Error('Local asset contains changes beyond CRLF conversion; preserve it and review manually.');
  return committed;
}
export function refreshWorldGltf(root,{repair=false}={}){
  const assets=path.join(root,'forschung/ashbound/play/assets');
  const manifest=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json'),'utf8').replace(/^\uFEFF/,''));
  const pending=[];
  for(const record of manifest.files.filter(item=>item.path.endsWith('.gltf'))){
    const file=path.resolve(assets,record.path),relative=path.relative(assets,file);
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||fs.lstatSync(file).isSymbolicLink())throw Error('Unsafe asset path.');
    const real=path.relative(fs.realpathSync(assets),fs.realpathSync(file));
    if(real.startsWith('..')||path.isAbsolute(real))throw Error('Asset resolves outside its directory.');
    const repositoryPath=path.relative(root,file).split(path.sep).join('/');
    const committed=execFileSync('git',['show','HEAD:'+repositoryPath],{cwd:root,maxBuffer:16*1024*1024});
    const actual=fs.readFileSync(file),restored=recoveryBytes(actual,committed,record.sha256);
    if(restored)pending.push({file,actual,restored,repositoryPath});
  }
  // Preflight the whole set before writing; semantic local edits always stop it.
  if(repair){
    for(const item of pending)if(!fs.readFileSync(item.file).equals(item.actual))throw Error('Asset changed during preflight; no files restored.');
    for(const item of pending)fs.writeFileSync(item.file,item.restored);
  }
  return {mode:repair?'EXPLICIT_LINE_ENDING_RECOVERY':'READ_ONLY',pending:pending.map(item=>item.repositoryPath),restored:repair?pending.length:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.some(arg=>arg!=='--repair')||args.length>1)throw Error('Usage: node tools/refresh_world_gltf.mjs [--repair]');
  console.log(JSON.stringify(refreshWorldGltf(fileURLToPath(new URL('..',import.meta.url)),{repair:args.includes('--repair')})));
}
