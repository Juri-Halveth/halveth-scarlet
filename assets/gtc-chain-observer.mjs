const CONTRACT='0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F';
const API_URL='https://eth.blockscout.com/api/v2/tokens/'+CONTRACT+'/transfers';
const EXPLORER='https://eth.blockscout.com/';
const TX_HASH=/^0x[a-f0-9]{64}$/i;

export function validateGtcTransfer(payload){
  const transfer=payload?.items?.[0];
  if(!transfer||typeof transfer!=='object')throw new TypeError('No indexed transfer');
  const block=transfer.block_number,timestamp=transfer.timestamp,hash=String(transfer.transaction_hash||'');
  if(!Number.isSafeInteger(block)||block<1||typeof timestamp!=='string'||!Number.isFinite(Date.parse(timestamp))||!TX_HASH.test(hash))throw new TypeError('Invalid transfer fields');
  if(String(transfer.token?.address_hash||'').toLowerCase()!==CONTRACT.toLowerCase()||transfer.token?.symbol!=='GTC')throw new TypeError('Unexpected token identity');
  return {block,timestamp:new Date(timestamp).toISOString(),hash:hash.toLowerCase()};
}

async function requestTransfer(fetchImpl){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  try{
    const response=await fetchImpl(API_URL,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('Blockscout API status');
    return validateGtcTransfer(await response.json());
  }finally{clearTimeout(timer);}
}

const setText=(root,id,value)=>{const node=root.getElementById(id);if(node)node.textContent=value;return node;};
function language(root){return root.documentElement?.lang?.toLowerCase().startsWith('en')?'en':'de';}

export function connectGtcObserver(root=globalThis.document,fetchImpl=globalThis.fetch){
  if(!root)return;
  const details=root.getElementById('gtc-observer'),refresh=root.getElementById('gtc-live-refresh');
  if(!details||!refresh)return;
  let started=false,busy=false,lastStatus='idle';
  const strings={
    de:{idle:'Beim Öffnen wird der jüngste indexierte GTC-Transfer auf Ethereum gelesen.',loading:'Lese GTC-Transfer …',ok:'Transfer aus dem öffentlichen Explorer gelesen. Indexierung kann nachlaufen.',failed:'GTC-Transfer gerade nicht verfügbar. Öffne den Explorer direkt oder versuche es später erneut.'},
    en:{idle:'Opening this panel reads the latest indexed GTC transfer on Ethereum.',loading:'Reading GTC transfer …',ok:'Transfer read from the public explorer. Indexing may lag.',failed:'GTC transfer is currently unavailable. Open the explorer directly or try again later.'}
  };
  const setStatus=key=>{lastStatus=key;setText(root,'gtc-live-status',strings[language(root)][key]);};
  const updateLanguage=()=>{if(lastStatus!=='idle')setStatus(lastStatus);};
  const load=async()=>{
    if(busy)return;
    busy=true;refresh.disabled=true;setStatus('loading');
    setText(root,'gtc-live-block','—');setText(root,'gtc-live-time','—');setText(root,'gtc-live-tx','—');
    const link=root.getElementById('gtc-live-link');if(link)link.href=EXPLORER;
    try{
      const transfer=await requestTransfer(fetchImpl);
      setText(root,'gtc-live-block',transfer.block.toLocaleString(language(root)));
      setText(root,'gtc-live-time',new Intl.DateTimeFormat(language(root)==='en'?'en-GB':'de-DE',{dateStyle:'medium',timeStyle:'medium',timeZone:'UTC'}).format(new Date(transfer.timestamp))+' UTC');
      setText(root,'gtc-live-tx',transfer.hash.slice(0,14)+'…');
      if(link)link.href=EXPLORER+'tx/'+transfer.hash;
      setStatus('ok');
    }catch{setStatus('failed');}
    finally{busy=false;refresh.disabled=false;}
  };
  details.addEventListener('toggle',()=>{if(details.open&&!started){started=true;void load();}});
  refresh.addEventListener('click',()=>{started=true;void load();});
  globalThis.window?.addEventListener('halveth:language',updateLanguage);
}

if(typeof document!=='undefined')connectGtcObserver(document,globalThis.fetch);
