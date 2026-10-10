const API_ROOT='https://mempool.space/api/';
const EXPLORER='https://mempool.space/';
const ENDPOINTS=Object.freeze({tip:new URL('blocks/tip',API_ROOT).href,fees:new URL('v1/fees/recommended',API_ROOT).href});
const HASH=/^[a-f0-9]{64}$/i;
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
export function validateTip(payload){
  const block=Array.isArray(payload)?payload[0]:payload;
  if(!block||typeof block!=='object'||!HASH.test(String(block.id||'')))throw new TypeError('Invalid block identifier');
  const height=number(block.height),timestamp=number(block.timestamp);
  if(!Number.isSafeInteger(height)||height<1||!Number.isSafeInteger(timestamp)||timestamp<1)throw new TypeError('Invalid block fields');
  return {id:String(block.id).toLowerCase(),height,timestamp};
}
export function validateFees(payload){
  if(!payload||typeof payload!=='object')throw new TypeError('Invalid fee response');
  const fastest=number(payload.fastestFee),hour=number(payload.hourFee);
  if(!Number.isSafeInteger(fastest)||!Number.isSafeInteger(hour))throw new TypeError('Invalid fee values');
  return {fastest,hour};
}
async function requestJSON(url,fetchImpl){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetchImpl(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('HTTP status');
    return await response.json();
  }finally{clearTimeout(timer);}
}
export async function loadBitcoinOverview(fetchImpl=globalThis.fetch){
  if(typeof fetchImpl!=='function')throw new TypeError('Fetch unavailable');
  const [tipResult,feeResult]=await Promise.allSettled([
    requestJSON(ENDPOINTS.tip,fetchImpl),requestJSON(ENDPOINTS.fees,fetchImpl)
  ]);
  let tip=null,fees=null;
  if(tipResult.status==='fulfilled'){try{tip=validateTip(tipResult.value);}catch{}}
  if(feeResult.status==='fulfilled'){try{fees=validateFees(feeResult.value);}catch{}}
  return {tip,fees,tipAvailable:tip!==null,feesAvailable:fees!==null};
}
const setText=(root,id,value)=>{const node=root.getElementById(id);if(node)node.textContent=value;return node;};
function language(root){return root.documentElement?.lang?.toLowerCase().startsWith('en')?'en':'de';}
export function connectBitcoinObserver(root=globalThis.document,fetchImpl=globalThis.fetch){
  if(!root)return;
  const details=root.getElementById('btc-observer'),refresh=root.getElementById('btc-live-refresh');
  if(!details||!refresh)return;
  let started=false,busy=false,lastStatus='idle';
  const strings={
    de:{idle:'Beim Öffnen werden öffentliche Explorer-Daten lesend abgefragt.',loading:'Lade öffentliche Bitcoin-Daten …',ok:'Live-Stand gelesen. Quelle: mempool.space.',partial:'Ein Teil der aktuellen Daten ist gerade nicht verfügbar.',failed:'Explorer-Daten gerade nicht verfügbar. Öffne die Quelle direkt oder versuche es später erneut.'},
    en:{idle:'Open this panel to request public explorer data.',loading:'Loading public Bitcoin data …',ok:'Live status read. Source: mempool.space.',partial:'Some current data is unavailable.',failed:'Explorer data is currently unavailable. Open the source directly or try again later.'}
  };
  const setStatus=key=>{lastStatus=key;setText(root,'btc-live-status',strings[language(root)][key]);};
  const updateLanguage=()=>{if(lastStatus!=='idle')setStatus(lastStatus);};
  const load=async()=>{
    if(busy)return;
    busy=true;refresh.disabled=true;setStatus('loading');
    setText(root,'btc-live-height','—');
    setText(root,'btc-live-hash','—');
    setText(root,'btc-live-time','—');
    setText(root,'btc-live-fees','—');
    const link=root.getElementById('btc-live-link');
    if(link)link.href=EXPLORER;
    try{
      const data=await loadBitcoinOverview(fetchImpl);
      if(data.tip){
        setText(root,'btc-live-height',data.tip.height.toLocaleString(language(root)));
        setText(root,'btc-live-hash',data.tip.id);
        setText(root,'btc-live-time',new Intl.DateTimeFormat(language(root)==='en'?'en-GB':'de-DE',{dateStyle:'short',timeStyle:'medium',timeZone:'UTC'}).format(new Date(data.tip.timestamp*1000))+' UTC');
        if(link)link.href=new URL('/block/'+data.tip.id,EXPLORER).href;
      }
      if(data.fees)setText(root,'btc-live-fees',data.fees.fastest+' / '+data.fees.hour);
      setStatus(data.tipAvailable&&data.feesAvailable?'ok':data.tipAvailable||data.feesAvailable?'partial':'failed');
    }catch{setStatus('failed');}
    finally{busy=false;refresh.disabled=false;}
  };
  details.addEventListener('toggle',()=>{if(details.open&&!started){started=true;void load();}});
  refresh.addEventListener('click',()=>{started=true;void load();});
  globalThis.window?.addEventListener('halveth:language',updateLanguage);
}
if(typeof document!=='undefined')connectBitcoinObserver(document,globalThis.fetch);
