(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const API = globalThis.HalvethBoundary;
  const labels = {
    de: {
      skip:'Zum Versuch',pageNav:'Seitennavigation',language:'Sprache',back:'Zum Nexus',lab:'MODELL-LABOR 01',title:'Grenzbeobachter',subtitle:'Zwei Blickrichtungen. Ein gemeinsamer Verlauf.',lead:'25 Messorte, ein gleiches Budget: Eine Regel schaut regelmäßig weiter. Die andere richtet ihre nächsten Messungen an dem aus, was sie bereits gesehen hat.',synthetic:'Synthetisches Modell',offline:'Läuft in deinem Browser',finite:'Endlicher Versuch',liveComparison:'DER VERGLEICH',sameWorld:'Eine Welt. Zwei Messpläne.',showTruth:'Modellverlauf zeigen',truthNote:'Die zuschaltbare Referenzansicht gehört zur Darstellung. Die Beobachter erhalten nur ihre eigenen bisherigen Messungen.',fixedPolicy:'FESTER MESSPLAN',adaptivePolicy:'ANGEPASSTER MESSPLAN',regular:'Regelmäßig',adaptive:'Adaptiv',modelStep:'MODELLSCHRITT',regularCopy:'Durchquert die Messorte in einer festen Reihenfolge.',adaptiveCopy:'Verbindet weitere Erkundung mit dem Nachsehen an zuvor aktiven Orten.',lastSites:'Zuletzt gemessen',legend:'Legende',measuredEmpty:'Gemessen · inaktiv',measuredActive:'Gemessen · aktiv',unmeasured:'In diesem Schritt ungemessen',truthLegend:'Aktiv im Modell',yourExperiment:'DEIN VERSUCH',controlsTitle:'Den Blick verändern.',seed:'Startwert / Seed',seedHint:'Gleicher Startwert, gleicher Modellverlauf.',scenario:'Szenario',drift:'Wandernde Aktivität',scatter:'Verstreute Aktivität',scenarioHint:'Zwei unterschiedliche Arten der Veränderung.',budget:'Messungen pro Schritt',budgetHint:'Für beide Beobachter genau gleich.',steps:'Modellschritte',stepsHint:'Hier endet der Versuch automatisch.',oneStep:'Einzelschritt',reset:'Zurücksetzen',speed:'Wiedergabetakt',speedHint:'Ändert die Darstellung, nicht das Modellergebnis.',progressLabel:'Fortschritt des Modelllaufs',activeTime:'Aktive Laufdauer',export:'Versuch als JSON',settingsNote:'Ein angefangener Lauf behält seine Einstellungen. Zurücksetzen öffnet einen neuen Versuch. Bei einem ausgeblendeten Tab pausiert der Lauf.',resultsKicker:'BEOBACHTUNG & REFERENZ',resultsTitle:'Was ist angekommen?',referenceBadge:'Auswertung am synthetischen Modell',resultsIntro:'Ein Treffer bedeutet: Eine Probe traf den aktiven Ort eines Modellereignisses. Diese Zuordnung entsteht im nachgelagerten Vergleich mit der Referenz.',tableCaption:'Kennzahlen beider Beobachtungsregeln für den bisherigen Modellverlauf',metric:'Kennzahl',samples:'Messversuche',detected:'Modellereignisse getroffen',missed:'Beendete Ereignisse verpasst',pending:'Aktive Ereignisse noch ungetroffen',recall:'Anteil getroffener Ereignisse',latency:'Mittlere Trefferlatenz (Schritte)',blind:'Größte Messlücke (Schritte)',coverage:'Mindestens einmal gemessene Orte',metricNote:'Latenz = erster Treffer minus Ereignisbeginn; sie bezieht sich nur auf Treffer. „—“ bedeutet: noch keine Grundlage für diesen Wert. Die Messlücke zählt ungemessene Schritte je Ort einschließlich der Ränder des bisherigen Laufs.',methodKicker:'DER VERTRAG',methodTitle:'Neugier mit sichtbaren Regeln.',fairTitle:'Gleiche Ausgangslage',fairCopy:'Beide Regeln arbeiten am gleichen Modell mit gleichem Budget. Eine adaptive Regel kann je nach Szenario auch schlechter abschneiden.',boundaryTitle:'Eine erklärte Modellgrenze',boundaryCopy:'Die Regeln erhalten vergangene eigene Proben. Der vollständige Modellverlauf gehört zum Erzeuger und zur Auswertung. Alle Rollen laufen in derselben Anwendung.',receiptTitle:'Ein Lauf zum Mitnehmen',receiptCopy:'Der JSON-Export enthält Konfiguration, Modellverlauf, Entscheidungen und Messungen. Sein Hash prüft die Konsistenz der exportierten Daten; Herkunft und Außenwahrheit sind eigene Fragen.',footerModel:'Eine Simulation zum Weiterfragen.',rights:'Rechte & Quellen',ready:'Bereit',running:'Läuft',paused:'Pausiert',completed:'Abgeschlossen',start:'Starten',resume:'Fortsetzen',pause:'Pausieren',readyMessage:'Bereit für deinen ersten Modellschritt.',startedMessage:'Beide Beobachter messen am selben synthetischen Verlauf.',pausedMessage:'Pausiert. Der Modellstand bleibt erhalten.',hiddenMessage:'Tab ausgeblendet: Der Versuch wurde pausiert.',resetMessage:'Neuer Versuch bereit. Du kannst die Einstellungen jetzt verändern.',completedMessage:'Der vereinbarte Modellhorizont ist erreicht. Die Ergebnisse und der Export sind bereit.',stepMessage:'Ein Modellschritt wurde ausgeführt.',exportedMessage:'Der JSON-Download wurde ausgelöst. Der Hash bindet die exportierten Modelldaten.',errorMessage:'Der Versuch konnte nicht ausgeführt werden: ',invalidSeed:'Startwert muss eine ganze Zahl von 0 bis 4294967295 sein.',invalidBudget:'Messbudget muss eine ganze Zahl von 1 bis 25 sein.',invalidSteps:'Wähle 80, 160 oder 320 Modellschritte.',invalidScenario:'Wähle eines der beiden Szenarien.',modelSteps:'Modellschritte',denominator:'Bisher begonnene Modellereignisse: ',canvasDescription:'25 Messorte; letzte Proben: ',none:'noch keine',active:'aktiv',inactive:'inaktiv',shaUnavailable:'SHA-256 ist in diesem Browserkontext nicht verfügbar. Der Export wurde nicht als hashgeprüft ausgegeben.'
    },
    en: {
      skip:'Go to the experiment',pageNav:'Page navigation',language:'Language',back:'Back to the Nexus',lab:'MODEL LAB 01',title:'Boundary observers',subtitle:'Two ways of looking. One shared world.',lead:'25 observation sites, the same budget: One rule moves on regularly. The other uses what it has already seen to choose where to look next.',synthetic:'Synthetic model',offline:'Runs in your browser',finite:'Bounded experiment',liveComparison:'THE COMPARISON',sameWorld:'One world. Two sampling plans.',showTruth:'Show model trace',truthNote:'The optional reference view is for the display. Observers only receive their own past measurements.',fixedPolicy:'FIXED SAMPLING PLAN',adaptivePolicy:'ADAPTIVE SAMPLING PLAN',regular:'Regular',adaptive:'Adaptive',modelStep:'MODEL STEP',regularCopy:'Moves through the observation sites in a fixed order.',adaptiveCopy:'Combines further exploration with revisiting previously active sites.',lastSites:'Last sampled',legend:'Legend',measuredEmpty:'Sampled · inactive',measuredActive:'Sampled · active',unmeasured:'Not sampled this step',truthLegend:'Active in the model',yourExperiment:'YOUR EXPERIMENT',controlsTitle:'Change where you look.',seed:'Initial value / seed',seedHint:'Same seed, same model trace.',scenario:'Scenario',drift:'Drifting activity',scatter:'Scattered activity',scenarioHint:'Two different patterns of change.',budget:'Samples per step',budgetHint:'Exactly the same for both observers.',steps:'Model steps',stepsHint:'The experiment stops here automatically.',oneStep:'Single step',reset:'Reset',speed:'Playback interval',speedHint:'Changes the display speed, not the model result.',progressLabel:'Model run progress',activeTime:'Active run duration',export:'Export run as JSON',settingsNote:'A started run keeps its settings. Reset opens a new experiment. The run pauses when the tab is hidden.',resultsKicker:'OBSERVATION & REFERENCE',resultsTitle:'What came through?',referenceBadge:'Evaluated against the synthetic model',resultsIntro:'A hit means that a sample reached an active site of a model event. This association is made afterwards by comparing with the reference.',tableCaption:'Metrics for both observation rules over the model trace so far',metric:'Metric',samples:'Sampling attempts',detected:'Model events hit',missed:'Ended events missed',pending:'Active events not yet hit',recall:'Share of events hit',latency:'Mean hit latency (steps)',blind:'Longest sampling gap (steps)',coverage:'Sites sampled at least once',metricNote:'Latency = first hit minus event start; it includes hits only. “—” means there is no basis for this value yet. The sampling gap counts unsampled steps per site, including the edges of the run so far.',methodKicker:'THE CONTRACT',methodTitle:'Curiosity with visible rules.',fairTitle:'An equal starting point',fairCopy:'Both rules work on the same model with the same budget. Depending on the scenario, the adaptive rule may perform worse.',boundaryTitle:'An explicit model boundary',boundaryCopy:'Rules receive their own past samples. The full model trace belongs to the generator and evaluator. All roles run in the same application.',receiptTitle:'A run to take with you',receiptCopy:'The JSON export includes configuration, model trace, decisions and measurements. Its hash checks the consistency of the exported data; provenance and real-world truth are separate questions.',footerModel:'A simulation for further questions.',rights:'Rights & sources',ready:'Ready',running:'Running',paused:'Paused',completed:'Complete',start:'Start',resume:'Resume',pause:'Pause',readyMessage:'Ready for your first model step.',startedMessage:'Both observers sample the same synthetic trace.',pausedMessage:'Paused. The model state is preserved.',hiddenMessage:'Tab hidden: the experiment has been paused.',resetMessage:'New experiment ready. You can now change the settings.',completedMessage:'The agreed model horizon has been reached. Results and export are ready.',stepMessage:'One model step has been completed.',exportedMessage:'The JSON download was initiated. The hash binds the exported model data.',errorMessage:'The experiment could not run: ',invalidSeed:'The seed must be an integer from 0 to 4294967295.',invalidBudget:'The sampling budget must be an integer from 1 to 25.',invalidSteps:'Choose 80, 160 or 320 model steps.',invalidScenario:'Choose one of the two scenarios.',modelSteps:'model steps',denominator:'Model events begun so far: ',canvasDescription:'25 observation sites; latest samples: ',none:'none yet',active:'active',inactive:'inactive',shaUnavailable:'SHA-256 is unavailable in this browser context. The export was not presented as hash-verified.'
    }
  };
  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'de';
  let experiment = null, running = false, timer = null, activeStarted = null, elapsedActiveMs = 0, statusKey = 'readyMessage', statusError = '', exporting = false;
  const configIds = ['seed','scenario','budget','steps'];
  const t = key => labels[language][key] || key;
  const number = (value, digits = 0) => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);
  function say(key,error='') {statusKey=key;statusError=error;$('status').textContent=t(key)+error;$('status').dataset.error=String(Boolean(error));}
  function setLanguage(next) {
    if(next!=='de'&&next!=='en')return;
    language=next;document.documentElement.lang=next;
    for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
    for(const node of document.querySelectorAll('[data-i18n-aria]'))node.setAttribute('aria-label',t(node.dataset.i18nAria));
    for(const node of document.querySelectorAll('[data-set-lang]'))node.setAttribute('aria-pressed',String(node.dataset.setLang===next));
    document.title=t('title')+' · HALVETH';
    document.querySelector('meta[name="description"]').content=t('lead');
    document.querySelector('meta[property="og:title"]').content=t('title')+' · HALVETH';
    document.querySelector('meta[property="og:description"]').content=t('subtitle');
    try{const u=new URL(location.href);u.searchParams.set('lang',next);history.replaceState(history.state,'',u.href);}catch(_error){}
    say(statusKey,statusError);if(experiment)render();
    window.dispatchEvent(new CustomEvent('halveth:language',{detail:{language:next}}));
  }
  globalThis.HalvethLanguage=Object.freeze({get:()=>language,set:setLanguage});
  for(const node of document.querySelectorAll('[data-set-lang]'))node.addEventListener('click',()=>setLanguage(node.dataset.setLang));

  function config() {
    const seed=Number($('seed').value),budget=Number($('budget').value),steps=Number($('steps').value),scenario=$('scenario').value;
    if($('seed').value.trim()===''||!Number.isInteger(seed)||seed<0||seed>4294967295)throw new Error(t('invalidSeed'));
    if($('budget').value.trim()===''||!Number.isInteger(budget)||budget<1||budget>25)throw new Error(t('invalidBudget'));
    if(![80,160,320].includes(steps))throw new Error(t('invalidSteps'));
    if(!['drift','scatter'].includes(scenario))throw new Error(t('invalidScenario'));
    return {seed,points:25,steps,budget,scenario};
  }
  function activeMs(){return elapsedActiveMs+(activeStarted===null?0:performance.now()-activeStarted);}
  function pause(key='pausedMessage') {
    clearTimeout(timer);timer=null;
    if(activeStarted!==null){elapsedActiveMs+=performance.now()-activeStarted;activeStarted=null;}
    running=false;if(experiment)render();say(key);
  }
  function reset() {
    const next=config();
    clearTimeout(timer);timer=null;running=false;activeStarted=null;elapsedActiveMs=0;
    experiment=API.createExperiment(next);render();say('resetMessage');
  }
  function advance(single=false) {
    const started=performance.now();
    experiment.step();
    if(single)elapsedActiveMs+=performance.now()-started;
    if(experiment.tick>=experiment.view().config.steps){pause('completedMessage');return;}
    render();if(single)say('stepMessage');
  }
  function scheduledStep() {
    if(!running)return;
    if(document.hidden){pause('hiddenMessage');return;}
    try{advance();if(running)timer=setTimeout(scheduledStep,Number($('speed').value));}
    catch(error){pause();say('errorMessage',error.message);}
  }
  function start() {
    if(running){pause();return;}
    if(experiment.tick===0)experiment=API.createExperiment(config());
    if(experiment.tick>=experiment.view().config.steps)return;
    if(document.hidden){say('hiddenMessage');return;}
    running=true;activeStarted=performance.now();say('startedMessage');scheduledStep();
  }
  function safely(fn){try{fn();}catch(error){say('errorMessage',error.message);}}

  function draw(name,view) {
    const canvas=$(name+'-canvas'),ctx=canvas.getContext('2d');if(!ctx)return;
    const rect=canvas.getBoundingClientRect(),size=Math.max(180,rect.width),ratio=Math.min(2,devicePixelRatio||1);
    const width=Math.round(size*ratio);if(canvas.width!==width||canvas.height!==width){canvas.width=width;canvas.height=width;}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);
    const c=size/2,r=size*.335,accent=name==='regular'?'#72e8d2':'#f6c080';
    const frame=view.last,sites=frame?frame[name].sites:[],values=frame?frame[name].values:[];
    const sample=new Map(sites.map((site,i)=>[site,values[i]]));
    const showTruth=$('show-truth').checked;
    ctx.lineWidth=1;
    for(const scale of [.79,1,1.22]){ctx.beginPath();ctx.strokeStyle=scale===1?'rgba(155,190,194,.19)':'rgba(155,190,194,.055)';ctx.arc(c,c,r*scale,0,Math.PI*2);ctx.stroke();}
    for(let i=0;i<100;i++){const a=-Math.PI/2+i*Math.PI*2/100;const isMajor=i%4===0;ctx.strokeStyle=isMajor?'rgba(170,200,200,.2)':'rgba(170,200,200,.055)';ctx.beginPath();ctx.moveTo(c+Math.cos(a)*r*.79,c+Math.sin(a)*r*.79);ctx.lineTo(c+Math.cos(a)*r*(isMajor?.82:.805),c+Math.sin(a)*r*(isMajor?.82:.805));ctx.stroke();}
    for(let i=0;i<25;i++){
      const a=-Math.PI/2+i*Math.PI*2/25,x=c+Math.cos(a)*r,y=c+Math.sin(a)*r;
      if(sample.has(i)){
        ctx.strokeStyle=name==='regular'?'rgba(114,232,210,.15)':'rgba(246,192,128,.15)';ctx.beginPath();ctx.moveTo(c+Math.cos(a)*r*.87,c+Math.sin(a)*r*.87);ctx.lineTo(x,y);ctx.stroke();
        ctx.strokeStyle=accent;ctx.lineWidth=1.8;ctx.fillStyle=sample.get(i)?accent:'#101e27';ctx.beginPath();ctx.arc(x,y,size*.0145,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.lineWidth=1;
        if(sample.get(i)){ctx.fillStyle='#0d2225';ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.fill();}
      }else{ctx.fillStyle='#637881';ctx.beginPath();ctx.arc(x,y,size*.006,0,Math.PI*2);ctx.fill();}
      if(showTruth&&view.truth[i]){const tx=c+Math.cos(a)*r*1.10,ty=c+Math.sin(a)*r*1.10,s=size*.010;ctx.strokeStyle='#f2e7c9';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(tx,ty-s);ctx.lineTo(tx+s,ty);ctx.lineTo(tx,ty+s);ctx.lineTo(tx-s,ty);ctx.closePath();ctx.stroke();}
      ctx.fillStyle=sample.has(i)?'#dce7e3':'#788e97';ctx.font='500 '+Math.max(8,size*.023)+'px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i).padStart(2,'0'),c+Math.cos(a)*r*1.29,c+Math.sin(a)*r*1.29);
    }
    const sitesText=sites.length?sites.map((site,i)=>String(site).padStart(2,'0')+' '+(values[i]?t('active'):t('inactive'))).join(', '):t('none');
    canvas.setAttribute('aria-label',t(name)+': '+t('canvasDescription')+sitesText);
    $(name+'-sites').textContent=sites.length?sites.map(site=>String(site).padStart(2,'0')).join(' · '):'—';
  }
  function render() {
    const view=experiment.view(),summary=experiment.summary(),tick=experiment.tick,total=view.config.steps,complete=tick>=total;
    for(const node of document.querySelectorAll('.ring-tick'))node.textContent=number(tick);
    for(const node of document.querySelectorAll('.ring-total'))node.textContent='/ '+number(total);
    const state=complete?'completed':running?'running':tick?'paused':'ready';
    $('run-state').textContent=t(state);$('run-state').dataset.state=state;
    $('start-text').textContent=t(running?'pause':tick?'resume':'start');$('start-icon').textContent=running?'Ⅱ':'▶';$('start').disabled=complete||exporting;
    $('step').disabled=running||complete||exporting;$('reset').disabled=exporting;$('export').disabled=exporting;
    for(const id of configIds)$(id).disabled=tick>0||running||exporting;
    $('progress-text').textContent=number(tick)+' / '+number(total)+' '+t('modelSteps');
    const progress=document.querySelector('.progress-track');progress.setAttribute('aria-valuemax',String(total));progress.setAttribute('aria-valuenow',String(tick));
    $('progress-fill').style.width=(100*tick/total)+'%';$('active-time').textContent=number(activeMs()/1000,1)+' s';
    $('speed-value').textContent=number(Number($('speed').value))+' ms';
    for(const name of ['regular','adaptive']){
      const s=summary[name];
      $(name+'-samples').textContent=number(s.attempts===undefined?s.samples:s.attempts);
      $(name+'-detected').textContent=number(s.detectedEvents);$(name+'-missed').textContent=number(s.missedEndedEvents);$(name+'-pending').textContent=number(s.pendingEvents);
      $(name+'-recall').textContent=finiteNumber(s.recall)?number(s.recall*100,1)+' %':'—';
      $(name+'-latency').textContent=finiteNumber(s.meanLatency)?number(s.meanLatency,1):'—';
      $(name+'-blind').textContent=number(s.maxBlindTicks);
      $(name+'-coverage').textContent=s.siteCoverage?number(s.siteCoverage.visited)+' / '+number(s.siteCoverage.total):'—';
      draw(name,view);
    }
    $('denominator').textContent=t('denominator')+number(summary.occurredEvents);
    document.querySelector('.truth-legend').hidden=!$('show-truth').checked;
  }
  async function exportRun() {
    if(exporting)return;
    if(running)pause();
    exporting=true;render();
    try{
      if(!globalThis.crypto?.subtle)throw new Error(t('shaUnavailable'));
      const snapshot=experiment.snapshot(),serialized=API.canonical(snapshot);
      const bytes=new TextEncoder().encode(serialized),hash=await crypto.subtle.digest('SHA-256',bytes);
      const sha256=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
      const result={schema:'halveth.boundary-observers.export.v1',capturedAt:new Date().toISOString(),elapsedActiveMs:Math.round(activeMs()*1000)/1000,clock:{capture:'LOCAL_DEVICE_WALL_CLOCK',duration:'BROWSER_MONOTONIC_PERFORMANCE_NOW',calibration:'UNKNOWN',modelTime:'DISCRETE_TICKS'},snapshot,integrity:{algorithm:'SHA-256',canonicalization:'HalvethBoundary.canonical@'+API.VERSION,scope:'snapshot',sha256,meaning:'SELF_CONSISTENCY_ONLY; NOT AUTHORSHIP, INDEPENDENT_TIME_OR_EXTERNAL_TRUTH'}};
      const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='HALVETH_BOUNDARY_'+snapshot.config.seed+'_'+experiment.tick+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);say('exportedMessage');
    }catch(error){say('errorMessage',error.message);}finally{exporting=false;render();}
  }
  $('start').addEventListener('click',()=>safely(start));
  $('step').addEventListener('click',()=>safely(()=>{if(experiment.tick===0)experiment=API.createExperiment(config());advance(true);}));
  $('reset').addEventListener('click',()=>safely(reset));
  $('export').addEventListener('click',exportRun);
  $('show-truth').addEventListener('change',()=>{if(experiment)render();});
  $('speed').addEventListener('input',()=>{$('speed-value').textContent=number(Number($('speed').value))+' ms';});
  for(const id of configIds)$(id).addEventListener('change',()=>safely(()=>{if(experiment.tick===0){experiment=API.createExperiment(config());render();say('readyMessage');}}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)pause('hiddenMessage');});
  window.addEventListener('pagehide',()=>{if(running)pause('hiddenMessage');});
  if('ResizeObserver' in globalThis){const observer=new ResizeObserver(()=>{if(experiment)for(const name of ['regular','adaptive'])draw(name,experiment.view());});for(const canvas of document.querySelectorAll('canvas'))observer.observe(canvas);}
  else window.addEventListener('resize',()=>{if(experiment)render();});
  try{
    if(!API||typeof API.createExperiment!=='function')throw new Error('MODEL_RUNTIME_UNAVAILABLE');
    experiment=API.createExperiment(config());setLanguage(language);render();say('readyMessage');
  }catch(error){setLanguage(language);say('errorMessage',error.message);for(const id of ['start','step','export'])$(id).disabled=true;}
})();
