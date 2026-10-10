(function () {
  'use strict';
  const api=globalThis.HalvethWorkshop, $=id=>document.getElementById(id);
  const root=$('werkstatt'); if(!root||!api)return;
  const messages={
    de:{
      entry:'Neu · Übergangswerkstatt öffnen ↗', kicker:'QUELLE · SICHTWEISE · ÜBERGANG',title:'Wissen behalten. Veränderung prüfen.',
      intro:'Eine Aussage kann benannt bleiben, während ihre Ausführung getrennt behandelt wird. Hier kannst du das mit eigenen Texten und einem kleinen Warteschlangenmodell ausprobieren.',
      source:'Dein Quelltext',reading:'Wie ordnest du die ganze Aussage ein?',unknown:'Offen',affirmed:'Bejaht',negated:'Verneint',quoted:'Nur zitiert',
      readingNote:'Du wählst die Lesart selbst. Der genaue Wortlaut bleibt erhalten. Der Text wird als Daten behandelt.',viewsTitle:'Zwei Sichtweisen & ein vorgemerktes Ziel',
      viewA:'Sichtweise A',viewB:'Sichtweise B',targetKind:'Art des vorgemerkten Ziels',local:'Lokal',external:'Extern',address:'Bezeichnung / semantische Adresse',
      targetNote:'Das Ziel wird vorgemerkt. Eine Verbindung und die Identität eines gemeinsamen Ereignisses bleiben offen.',bind:'Quelle binden & Modell öffnen',
      mapLabel:'Vertrag des lokalen Entwurfs',sourceBound:'Quelle',sourceDesc:'Exakter Text · eigene Adresse · SHA-256',candidate:'Benannter Inhalt',
      candidateDesc:'Lesart erhalten · Ausführung separat gesperrt',views:'Beobachtungsrahmen',viewsDesc:'A und B separat · gleiche Eingabequelle',
      relations:'Verbindungen',relationsDesc:'Zwei vollständige Endpunkte pro Relation',mapNote:'Jeder Eintrag bekommt einen eigenen Platz. Die Begriffe Root, GitHub und Extern beschreiben hier vorgemerkte Ziele.',
      localDraft:'Lokaler Entwurf',sealed:'Quelltext bleibt Daten',modelKicker:'GESICHERTER START · GEPRÜFTE SCHRITTE',modelTitle:'Platz für den nächsten Schritt?',
      modelNote:'Eigenes Lehrmodell: Start bei 30 Einträgen, Annahmegrenze 80, Kapazität 100. Der Quelltext steuert dieses Modell nicht. Ein Schritt oberhalb der Grenze erhält den alten Stand.',
      loadLabel:'Belegung des Modells',incoming:'Neue Einträge',processed:'Davon abarbeiten',step:'Prüfen & Modellschritt ausführen',restore:'Startstand wiederherstellen',
      restoreNote:'Wiederherstellen fügt einen neuen Rückkehr-Eintrag hinzu. Die vorherigen Schritte bleiben im Verlauf. Maximal 128 Einträge je Entwurf.',
      historyLabel:'Bisherige Modellschritte',export:'Entwurf & Verlauf herunterladen',exportNote:'Der Download enthält deine Texte, Lesart, Sichtweisen, Zielangabe und den Modellverlauf. Speichere ihn für später. Die Seite überträgt diese Eingaben nicht.',
      receipt:'Datenvertrag ansehen',importTitle:'Gespeicherten Entwurf wieder öffnen',importLabel:'Export aus dieser Werkstatt · bis 256 KiB',
      limit:'Geprüft werden Textbindung, Datenstruktur und Modellschritte. Gerätezeiten, eingegebene Sichtweisen und externe Ziele sind Angaben. Ein Hash belegt die verglichenen Bytes.',
      ready:'Bereit. Binde zuerst deine Quelle.',bound:'Quelle gebunden. Zwei Sichtweisen und drei Relationen sind erhalten. Das Modell ist bereit.',
      changed:'Eingaben geändert. Binde diese Fassung neu, um damit weiterzuarbeiten.',applied:'Der geprüfte Modellschritt ist ausgeführt.',held:'Die Projektion überschreitet 80. Der alte Modellstand bleibt erhalten; der Versuch ist im Verlauf vermerkt.',
      restored:'Der Startstand 30 ist wiederhergestellt. Die vorherigen Schritte bleiben im Verlauf.',downloaded:'Download ausgelöst. Der Beleg enthält die genaue Fassung und ihren SHA-256-Hash.',
      imported:'Export geprüft und geöffnet. Quelle, Relationen und Modellverlauf stimmen mit dem Datenvertrag überein.',busy:'Textbindung und Modellverlauf werden geprüft …',
      invalid:'Bitte prüfe deine Eingaben: Texte müssen ausgefüllt sein; Modellzahlen sind ganze Zahlen von 0 bis 100.',
      importError:'Der Import passt nicht zu diesem Datenvertrag oder seinem Hash. Dein bisheriger Entwurf bleibt erhalten.',
      clockError:'Die Gerätezeit liegt vor dem letzten Eintrag. Der bestehende Verlauf bleibt erhalten.',limitError:'128 Einträge erreicht. Lade den Verlauf herunter und binde bei Bedarf einen neuen Entwurf.',
      cryptoError:'SHA-256 ist hier nicht verfügbar. Öffne die Seite über HTTPS oder localhost.',error:'Die Prüfung konnte nicht abgeschlossen werden. Der bisherige Stand bleibt erhalten.',
      appliedLabel:'Ausgeführt',heldLabel:'Stand erhalten',restoreLabel:'Wiederhergestellt',projection:'Projektion',records:'Einträge',readingPrefix:'Lesart: '
    },
    en:{
      entry:'New · Open transition workshop ↗',kicker:'SOURCE · VIEWPOINT · TRANSITION',title:'Keep the knowledge. Check the change.',
      intro:'An assertion can remain addressed while its execution is handled separately. Try this with your own text and a small queue model.',
      source:'Your source text',reading:'How do you classify the whole assertion?',unknown:'Open',affirmed:'Affirmed',negated:'Negated',quoted:'Quoted only',
      readingNote:'You choose the reading yourself. The exact wording is preserved. The text is handled as data.',viewsTitle:'Two viewpoints & a proposed target',
      viewA:'Viewpoint A',viewB:'Viewpoint B',targetKind:'Kind of proposed target',local:'Local',external:'External',address:'Label / semantic address',
      targetNote:'The target is recorded as a proposal. A connection and shared event identity remain unresolved.',bind:'Bind source & open model',
      mapLabel:'Local draft contract',sourceBound:'Source',sourceDesc:'Exact text · own address · SHA-256',candidate:'Addressed content',
      candidateDesc:'Reading preserved · execution separately sealed',views:'Observation frames',viewsDesc:'Separate A and B · same input source',
      relations:'Connections',relationsDesc:'Two complete endpoints per relation',mapNote:'Every entry has its own place. Root, GitHub and External describe proposed targets here.',
      localDraft:'Local draft',sealed:'Source text stays data',modelKicker:'SAVED START · CHECKED STEPS',modelTitle:'Room for the next step?',
      modelNote:'Teaching model: initial load 30, acceptance threshold 80, capacity 100. Source text does not control this model. A step above the threshold preserves the current state.',
      loadLabel:'Model load',incoming:'Incoming items',processed:'Items to process',step:'Check & execute model step',restore:'Restore initial state',
      restoreNote:'Restore appends a new recovery entry. Earlier steps remain in the history. Up to 128 entries per draft.',
      historyLabel:'Model step history',export:'Download draft & history',exportNote:'The download includes your text, reading, viewpoints, target and model history. Save it for later. The page does not transmit these inputs.',
      receipt:'Inspect data contract',importTitle:'Reopen a saved draft',importLabel:'Export from this workshop · up to 256 KiB',
      limit:'Checks cover text binding, data structure and model steps. Device times, entered viewpoints and external targets are declarations. A hash binds the compared bytes.',
      ready:'Ready. Bind your source first.',bound:'Source bound. Two viewpoints and three relations are preserved. The model is ready.',
      changed:'Inputs changed. Bind this version again to continue.',applied:'The checked model step has been executed.',held:'The projection exceeds 80. The model state is preserved; the attempt is recorded in the history.',
      restored:'The initial load of 30 is restored. Earlier steps remain in the history.',downloaded:'Download initiated. The receipt contains the exact version and its SHA-256 hash.',
      imported:'Export checked and opened. Source, relations and model history match the data contract.',busy:'Checking text binding and model history …',
      invalid:'Check your inputs: fill in all text fields; model numbers must be integers from 0 to 100.',
      importError:'The import does not match this contract or its hash. Your previous draft is preserved.',
      clockError:'Device time is earlier than the last entry. The existing history is preserved.',limitError:'128 entries reached. Download the history and bind a new draft if needed.',
      cryptoError:'SHA-256 is unavailable here. Open this page over HTTPS or localhost.',error:'The check could not finish. The previous state is preserved.',
      appliedLabel:'Executed',heldLabel:'State preserved',restoreLabel:'Restored',projection:'Projection',records:'entries',readingPrefix:'Reading: '
    }
  };
  const fields=['work-source','work-reading','work-near','work-far','work-kind','work-address'];
  const keys=['sourceText','reading','nearText','farText','targetKind','targetAddress'];
  let draft=null,busy=false,status='ready',isError=false;
  function english(){return globalThis.HalvethLanguage?.get()==='en';}
  const t=key=>messages[english()?'en':'de'][key];
  function say(key,error=false){status=key;isError=error;$('work-status').textContent=t(key);$('work-status').dataset.error=String(error);}
  function controls(){
    for(const node of root.querySelectorAll('button,input,select,textarea'))node.disabled=busy;
    for(const id of ['work-step','work-restore','work-export'])$(id).disabled=busy||!draft;
    if(draft?.simulation.records.length===api.MAX_RECORDS){$('work-step').disabled=true;$('work-restore').disabled=true;}
    root.setAttribute('aria-busy',String(busy));
  }
  function render(){
    $('work-result').hidden=!draft;
    if(draft){
      const readings={UNKNOWN:'unknown',AFFIRMED:'affirmed',NEGATED:'negated',QUOTED_ONLY:'quoted'};
      $('work-reading-state').textContent=t('readingPrefix')+t(readings[draft.candidate.selectedReading]);
      $('work-load').textContent=String(draft.simulation.load);$('work-meter').value=draft.simulation.load;
      $('work-meter').textContent=draft.simulation.load+' / 100';
      $('work-count').textContent=draft.simulation.records.length+' / '+api.MAX_RECORDS+' '+t('records');
      $('work-history').replaceChildren();
      for(const record of draft.simulation.records){
        const row=document.createElement('li'),label=document.createElement('strong'),values=document.createElement('span'),stamp=document.createElement('time');
        row.dataset.decision=record.decision;
        label.textContent=record.id.split('-').at(-1)+'. '+t(record.request.kind==='RESTORE'?'restoreLabel':record.decision==='HELD'?'heldLabel':'appliedLabel');
        values.textContent=record.before+' → '+record.after+' · '+t('projection')+' '+record.projected;
        stamp.dateTime=record.recordedAt;stamp.textContent=record.recordedAt;
        row.append(label,values,stamp);$('work-history').append(row);
      }
      $('work-json').textContent=JSON.stringify(draft,null,2);
    } else {$('work-json').textContent='';$('work-history').replaceChildren();}
    controls();
  }
  function language(){
    for(const node of document.querySelectorAll('[data-work-text]'))node.textContent=t(node.dataset.workText);
    for(const node of root.querySelectorAll('[data-work-aria]'))node.setAttribute('aria-label',t(node.dataset.workAria));
    say(status,isError);render();
  }
  function errorKey(error,importing){
    if(error?.message==='SHA256_UNAVAILABLE')return 'cryptoError';
    if(error?.message==='INVALID_WORKSHOP_CLOCK_ORDER')return 'clockError';
    if(error?.message==='INVALID_WORKSHOP_RECORD_LIMIT')return 'limitError';
    return importing?'importError':error?.message?.startsWith('INVALID_WORKSHOP_')?'invalid':'error';
  }
  async function action(callback,importing=false){
    if(busy)return;
    busy=true;controls();say('busy');
    try{await callback();}catch(error){say(errorKey(error,importing),true);}
    finally{busy=false;render();}
  }
  for(const id of fields)$(id).addEventListener('input',()=>{draft=null;say('changed');render();});
  $('work-bind').addEventListener('click',()=>action(async()=>{
    const input=Object.fromEntries(fields.map((id,index)=>[keys[index],$(id).value]));
    const next=await api.create(input,new Date().toISOString());draft=next;say('bound');
  }));
  function number(id){if(!/^(?:0|[1-9][0-9]{0,2})(?![\s\S])/.test($(id).value))throw new TypeError('INVALID_WORKSHOP_NUMBER');return Number($(id).value);}
  $('work-step').addEventListener('click',()=>action(async()=>{
    if(!draft)return;
    const next=await api.transition(draft,{kind:'STEP',incoming:number('work-incoming'),processed:number('work-processed')},new Date().toISOString());
    draft=next;say(next.simulation.records.at(-1).decision==='HELD'?'held':'applied');
  }));
  $('work-restore').addEventListener('click',()=>action(async()=>{
    if(!draft)return;
    draft=await api.transition(draft,{kind:'RESTORE',incoming:0,processed:0},new Date().toISOString());say('restored');
  }));
  $('work-export').addEventListener('click',()=>action(async()=>{
    if(!draft)return;
    const envelope=await api.exportRecord(draft);
    const blob=new Blob([JSON.stringify(envelope,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='halveth-workshop-'+envelope.sha256.slice(0,12)+'.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);say('downloaded');
  }));
  $('work-import').addEventListener('change',()=>action(async()=>{
    const file=$('work-import').files?.[0];if(!file){say(draft?'bound':'ready');return;}
    if(file.size>api.MAX_IMPORT_BYTES)throw new TypeError('INVALID_WORKSHOP_SIZE');
    const next=await api.importRecord(await file.text());
    for(let index=0;index<fields.length;index++)$(fields[index]).value=next.input[keys[index]];
    draft=next;say('imported');$('work-import').value='';
  },true));
  window.addEventListener('halveth:language',language);
  language();
})();
