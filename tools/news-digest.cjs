'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

function berlinTime(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Berlin', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`, minutes:Number(parts.hour)*60+Number(parts.minute)};
}
function readJson(file, fallback) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : fallback; }
function atomicJson(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data,null,2)+'\n', {encoding:'utf8',mode:0o600});
  fs.renameSync(temporary,file);
}
function draftAdapter() {
  return {id:'draft', async publish(){return {state:'DRAFT_ONLY'};}};
}

// Future adapters must implement publish({digest,idempotencyKey}) and, before
// retrying an uncertain operation, findByKey(key). No network adapter ships here.
async function deliverDigest(digest, receiptFile, adapter=draftAdapter(), now=new Date()) {
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  const lock = receiptFile+'.lock';
  const handle = fs.openSync(lock,'wx');
  try {
    let receipt=readJson(receiptFile,null);
    if(receipt && receipt.idempotencyKey!==digest.idempotencyKey) throw new Error('RECEIPT_KEY_MISMATCH');
    if(receipt && receipt.adapterId!==adapter.id) throw new Error('ADAPTER_CHANGE_REQUIRES_SEPARATE_REVIEW');
    if(receipt && ['PUBLISHED','DRAFT_ONLY'].includes(receipt.state)) return receipt;
    if(receipt && ['ATTEMPTING','UNCERTAIN'].includes(receipt.state)) {
      if(typeof adapter.findByKey!=='function') throw new Error('RECONCILIATION_REQUIRED');
      const found=await adapter.findByKey(digest.idempotencyKey);
      if(found?.postId) {
        receipt={...receipt,state:'PUBLISHED',postId:found.postId,confirmedAt:now.toISOString()};
        atomicJson(receiptFile,receipt); return receipt;
      }
      if(found!==null) throw new Error('RECONCILIATION_INCONCLUSIVE');
    }
    receipt={schemaVersion:1,idempotencyKey:digest.idempotencyKey,adapterId:adapter.id,target:digest.target,state:'ATTEMPTING',attempts:(receipt?.attempts||0)+1,attemptedAt:now.toISOString(),itemIds:digest.items.map(i=>i.id)};
    atomicJson(receiptFile,receipt);
    try {
      const result=await adapter.publish({digest,idempotencyKey:digest.idempotencyKey});
      if(adapter.id==='draft' && result?.state==='DRAFT_ONLY') receipt={...receipt,state:'DRAFT_ONLY',confirmedAt:now.toISOString()};
      else if(typeof result?.postId==='string' && result.postId) receipt={...receipt,state:'PUBLISHED',postId:result.postId,confirmedAt:now.toISOString()};
      else throw new Error('PUBLISHER_RECEIPT_MISSING');
      atomicJson(receiptFile,receipt); return receipt;
    } catch(error) {
      receipt={...receipt,state:error.retrySafe===true?'FAILED':'UNCERTAIN',error:'PUBLISH_ATTEMPT_FAILED'};
      atomicJson(receiptFile,receipt); throw error;
    }
  } finally { fs.closeSync(handle); fs.unlinkSync(lock); }
}

function makeDigest(data, priorDrafts, now=new Date()) {
  const local=berlinTime(now);
  if(local.minutes<18*60+17 || priorDrafts.some(d=>d.date===local.date)) return null;
  const seen=new Set(priorDrafts.flatMap(d=>d.items.map(i=>i.id)));
  const goodSources=new Set(data.sources.filter(s=>s.status==='fresh' && now-new Date(s.lastSuccessAt)<=180*60*1000 && now-new Date(s.lastSuccessAt)>=0).map(s=>s.id));
  const items=data.items.filter(i=>!seen.has(i.id)&&goodSources.has(i.sourceId)&&now-new Date(i.sourcePublishedAt)>=0&&now-new Date(i.sourcePublishedAt)<=7*86400000).sort((a,b)=>b.sourcePublishedAt.localeCompare(a.sourcePublishedAt)||a.id.localeCompare(b.id)).slice(0,5);
  if(!items.length)return null;
  const title=`HALVETH Quellen-Update · ${local.date}`;
  const lines=[`# ${title}`,'','Tagesentwurf für u/Halveth. Noch nicht auf Reddit veröffentlicht.','','Neue Meldungen aus offiziellen Quellen. Die folgenden Überschriften bleiben im englischen Original; sie sind keine von HALVETH verfassten Zusammenfassungen.',''];
  for(const item of items)lines.push(`- **${item.publisher}** · Originaltitel (EN): [${item.title.replace(/[\[\]\\]/g,'\\$&')}](${item.url}) · veröffentlicht ${item.sourcePublishedAt.slice(0,10)}`);
  lines.push('','[Alle Quellen mit Abrufzeit und Aktualitätsstatus](https://juri-halveth.github.io/halveth-scarlet/news/?lang=de)','','HALVETH · automatisiert zusammengestellter Quellenüberblick. Die Quellen bleiben für Inhalt und Einordnung maßgeblich.');
  const body=lines.join('\n')+'\n';
  return {schemaVersion:1,date:local.date,createdAt:now.toISOString(),target:{kind:'profile',name:'Halveth'},state:'DRAFT_ONLY',title,body,items,idempotencyKey:sha(`halveth-news|${local.date}|Halveth|${items.map(i=>i.id).join('|')}`)};
}

async function buildDraft(root=ROOT,now=new Date()) {
  const directory=path.join(root,'news','drafts');
  fs.mkdirSync(directory,{recursive:true});
  const drafts=fs.readdirSync(directory).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f=>readJson(path.join(directory,f),null));
  const local=berlinTime(now), data=readJson(path.join(root,'assets','news-data.json'),null);
  if(!data)throw new Error('NEWS_SNAPSHOT_MISSING');
  const digest=makeDigest(data,drafts,now);
  // If a prior run materialized the draft but was interrupted before its receipt,
  // finish that draft's local receipt without selecting a second set of articles.
  const current=digest||drafts.find(d=>d.date===local.date);
  if(!current)return {state:'NO_NEW_DRAFT',date:local.date};
  const jsonPath=path.join(directory,local.date+'.json');
  if(digest)atomicJson(jsonPath,digest);
  fs.writeFileSync(path.join(directory,local.date+'.md'),current.body,'utf8');
  const receipt=await deliverDigest(current,path.join(root,'news','receipts',local.date+'.json'),draftAdapter(),now);
  atomicJson(path.join(directory,'index.json'),{schemaVersion:1,target:current.target,publishingMode:'draft',drafts:[...drafts.filter(d=>d.date!==current.date),current].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>({date:d.date,title:d.title,file:d.date+'.md',state:'DRAFT_ONLY'}))});
  return {state:receipt.state,date:local.date,articles:current.items.length};
}
module.exports={berlinTime,makeDigest,deliverDigest,draftAdapter,buildDraft,atomicJson};
if(require.main===module)buildDraft().then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;});
