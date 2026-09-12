/* Local file hashing and optional provider association. No upload or mint RPC. */
(()=>{'use strict';
const core=window.HalvethSnapshotCore;
const $=id=>document.getElementById(id);
const form=$('snapshot-form'),fileInput=$('snapshot-file'),label=$('snapshot-label');
const create=$('prepare-snapshot'),providerSelect=$('wallet-provider'),connect=$('wallet-connect');
const disconnect=$('wallet-disconnect'),refresh=$('wallet-refresh');
const download=$('download-receipt'),receiptContent=$('receipt-content');
const wallet=window.HalvethWalletConnection.createController({window});
const texts={
  ready:['Datei gewählt. Du kannst deinen Abdruck erstellen.','File selected. You can create your imprint.'],
  empty:['Wähle eine Datei, um zu beginnen.','Choose a file to begin.'],
  large:['Die Datei ist größer als 10 MiB. Wähle bitte eine kleinere Datei.','The file exceeds 10 MiB. Please choose a smaller file.'],
  hashing:['Dein Abdruck entsteht hier im Browser …','Creating your imprint here in the browser …'],
  done:['Dein Beleg ist fertig. Er wurde lokal erstellt und nicht gemintet.','Your receipt is ready. It was created locally and has not been minted.'],
  changed:['Angaben geändert. Erstelle deinen Abdruck erneut.','Details changed. Create your imprint again.'],
  unavailable:['Sicheres lokales Hashing ist in diesem Browser nicht verfügbar. Öffne die HTTPS-Seite in einem aktuellen Browser.','Secure local hashing is unavailable here. Open the HTTPS page in a current browser.'],
  failed:['Der Beleg konnte nicht erstellt werden. Prüfe Datei und Bezeichnung; ungültige Steuerzeichen sind nicht erlaubt.','The receipt could not be created. Check the file and label; invalid control characters are not allowed.'],
  noWallet:['Keine kompatible Browser-Wallet gefunden. Du kannst ohne Wallet fortfahren.','No compatible browser wallet found. You can continue without a wallet.'],
  choose:['Wähle eine Wallet. Das Studio funktioniert auch ohne Verbindung.','Choose a wallet. The studio also works without a connection.'],
  selected:['Wallet ausgewählt. Verbinden öffnet die Kontoanfrage deiner Erweiterung.','Wallet selected. Connect opens your extension’s account request.'],
  connecting:['Bitte prüfe die Kontoanfrage in deiner Wallet. Es wird keine Signatur angefordert.','Please review the account request in your wallet. No signature is requested.'],
  connected:['Konto und Netzwerk sind dieser Seite zugeordnet.','Account and network are associated with this page.'],
  rejected:['Anfrage abgelehnt. Du kannst den Abdruck ohne Wallet erstellen.','Request declined. You can create the imprint without a wallet.'],
  walletError:['Die Walletverbindung konnte nicht hergestellt werden. Du kannst ohne Wallet fortfahren oder erneut verbinden.','The wallet connection could not be established. Continue without a wallet or connect again.'],
  disconnected:['Seitenzuordnung getrennt. Walletberechtigungen bleiben in deiner Erweiterung verwaltbar.','Page association cleared. Wallet permissions remain managed in your extension.']
};
let version=0,busy=false,receipt=null,blobURL=null,snapshotStatus='empty',walletStatus='noWallet';
let previousBinding='',providerInventory='',walletState=wallet.getState(),lastProviders=[];
const available=Boolean(window.isSecureContext&&window.crypto?.subtle&&window.crypto?.getRandomValues);
const en=()=>window.HalvethLanguage?.get()==='en';
const local=(de,english)=>en()?english:de;
const say=(id,key)=>{$(id).textContent=texts[key][en()?1:0];};
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
function validFile(){return fileInput.files?.length===1&&fileInput.files[0].size<=core.MAX_SOURCE_BYTES;}
function controls(){create.disabled=!available||!validFile()||busy||walletState.status==='connecting';}
function clearReceipt(){
  if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null;}
  receipt=null;download.removeAttribute('href');receiptContent.hidden=true;$('receipt-empty').hidden=false;
  $('receipt-json').textContent='';document.body.classList.remove('receipt-ready');
}
function invalidate(key='changed'){
  version++;busy=false;clearReceipt();snapshotStatus=available?key:'unavailable';renderReceipt();say('snapshot-status',snapshotStatus);controls();
}
function renderReceipt(){
  $('receipt-title').textContent=receipt?(receipt.record.source.label||local('Dein Snapshot.','Your snapshot.')):local('Hier beginnt eine Spur.','A trace starts here.');
  if(!receipt)return;
  const record=receipt.record;
  $('source-digest').textContent=record.source.sha256;$('record-digest').textContent=receipt.recordSha256;
  $('source-bytes').textContent=String(record.source.byteLength);$('record-time').textContent=record.createdAt;
  $('record-wallet').textContent=record.wallet.account?record.wallet.account+' · '+record.wallet.chainId:local('Ohne Wallet','Without wallet');
}
function renderWallet(state,providers){
  walletState=state;lastProviders=providers;
  const binding=JSON.stringify([state.status,state.providerId,state.account,state.chainId]);
  if(previousBinding&&previousBinding!==binding)invalidate('changed');
  previousBinding=binding;
  const inventory=JSON.stringify(providers.map(p=>[p.id,p.name]));
  if(providerInventory!==inventory||!providerSelect.options.length){
    providerInventory=inventory;
    const first=document.createElement('option');first.value='';first.textContent=local('Wallet auswählen','Choose wallet');
    const options=providers.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o;});
    providerSelect.replaceChildren(first,...options);
  }
  providerSelect.options[0].textContent=local(providers.length?'Wallet auswählen':'Keine Wallet gefunden',providers.length?'Choose wallet':'No wallet found');
  providerSelect.value=state.providerId||'';providerSelect.disabled=providers.length===0;
  connect.disabled=!state.providerId||state.status==='connecting'||state.status==='connected';
  disconnect.hidden=!state.providerId;
  $('wallet-details').hidden=state.status!=='connected';
  $('wallet-account').textContent=state.account||'';$('wallet-chain').textContent=state.chainId||'';
  walletStatus=state.status==='error'?(state.error==='USER_REJECTED'?'rejected':'walletError'):state.status==='idle'?(providers.length?'choose':'noWallet'):state.status;
  say('wallet-status',walletStatus);controls();
}
wallet.subscribe(renderWallet);
providerSelect.addEventListener('change',()=>{if(providerSelect.value)wallet.select(providerSelect.value);else wallet.disconnect();});
connect.addEventListener('click',async()=>{try{await wallet.connect();}catch(error){if(error?.code==='STALE_REQUEST')return;/* stable state is rendered by the controller */}});
disconnect.addEventListener('click',()=>{wallet.disconnect();walletStatus='disconnected';say('wallet-status',walletStatus);});
refresh.addEventListener('click',()=>wallet.discover());
fileInput.addEventListener('change',()=>invalidate(!fileInput.files?.length?'empty':validFile()?'ready':'large'));
label.addEventListener('input',()=>invalidate('changed'));
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!available||!validFile()||busy||walletState.status==='connecting')return;
  invalidate('hashing');busy=true;controls();const generation=version;
  const file=fileInput.files[0],chosenLabel=label.value;
  // Explicit representation conversion for the canonical record; UI shows the provider's original address.
  const association=walletState.status==='connected'?{account:walletState.account.toLowerCase(),chainId:walletState.chainId.toLowerCase()}:{account:null,chainId:null};
  try{
    const bytes=await file.arrayBuffer();if(generation!==version)return;
    if(bytes.byteLength!==file.size||bytes.byteLength>core.MAX_SOURCE_BYTES)throw new Error('FILE_CHANGED');
    const sourceHash=hex(await crypto.subtle.digest('SHA-256',bytes));if(generation!==version)return;
    const nonce=hex(crypto.getRandomValues(new Uint8Array(32)));
    const record=core.prepare({source:{sha256:sourceHash,byteLength:bytes.byteLength,mediaType:file.type||'application/octet-stream',label:chosenLabel||null},wallet:association,nonce,createdAt:new Date().toISOString()});
    const canonical=core.serialize(record);
    const recordHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical)));if(generation!==version)return;
    receipt=core.receipt(record,recordHash);
    const json=JSON.stringify(receipt,null,2)+'\n';
    blobURL=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    download.href=blobURL;download.download='halveth-snapshot-'+recordHash.slice(0,12)+'.json';
    $('receipt-json').textContent=json;receiptContent.hidden=false;$('receipt-empty').hidden=true;
    document.body.classList.add('receipt-ready');renderReceipt();snapshotStatus='done';say('snapshot-status',snapshotStatus);
  }catch{if(generation===version){clearReceipt();snapshotStatus='failed';renderReceipt();say('snapshot-status',snapshotStatus);}}
  finally{if(generation===version){busy=false;controls();}}
});
window.addEventListener('halveth:language',()=>{const status=walletStatus;renderWallet(walletState,lastProviders);walletStatus=status;say('wallet-status',walletStatus);renderReceipt();say('snapshot-status',snapshotStatus);});
window.addEventListener('pagehide',()=>{invalidate('changed');wallet.disconnect();});
if(!available)snapshotStatus='unavailable';say('snapshot-status',snapshotStatus);controls();
// Discovery announces available providers only. Account access waits for the Connect button.
wallet.discover();
})();
