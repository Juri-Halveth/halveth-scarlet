/* G^* Weltkeimwerk · finite local interface · LicenseRef-HALVETH-PIRL-2.0 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const original = new Map();
  document.querySelectorAll('[data-i18n]').forEach(el => original.set(el, el.textContent));
  const placeholders = new Map();
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => placeholders.set(el, el.placeholder));
  const en = {
    skip:'Go to workspace',back:'Back to Nexus',genesisWorkshop:'THE GENESIS WORKSHOP',title:'WORLD SEEDWORK',projectName:'Project epithet',
    lead:'A germ carries possibilities. A signal opens a candidate. Your decision turns it into a new model state — with a history that stays intact.',demo:'Unfold a cycle',demoNote:'8 inspectable steps · one local example',
    vocabulary:'Your vocabulary of signs',meaningG:'The total possibility space — here bound to the rules of this model version.',meaningStar:'Open possibilities — kept visible before a choice is made.',meaningHalo:'Halo: origin, anchor or priority in the selected context.',meaningTail:'Tail: transition and materialization. A sign carries its declared role.',vocabularyNote:'This vocabulary shapes the design. The software records local model data; biological and physical effects need their own evidence.',
    workspaceKicker:'ONE SHARED STATE',workspaceTitle:'From origin to possibility.',states:'states',events:'steps',openQuestions:'open questions',historyNote:'You are viewing a preserved earlier state. Actions are available at the present state.',goLive:'Return to now ↗',lineage:'LINEAGE & STATE',graph:'Graph',list:'List',emptyTitle:'The space is open.',emptyCopy:'Create your first germ or unfold the example cycle. A possibility becomes a record through an explicit action.',listEmpty:'The first states will appear here with their own addresses.',germ:'Germ',candidate:'Candidate',materialized:'Materialized',superseded:'Preserved previous version',
    timeline:'The timeline',timelineSlider:'Select a preserved model state',modelTime:'Model time',browserTime:'Browser duration at last action',selectedRecord:'SELECTED RECORD',inspectorTitle:'Every state has an origin.',inspectorEmpty:'Select a node or a list entry. Graph, provenance and actions follow the same selection.',materialize:'Materialize candidate',observe:'Append an observation',observationNote:'An observation refers to the selected state. It does not change its model world.',rawRecord:'Inspect record and provenance',
    workbenchKicker:'DELIBERATE STEPS',workbenchTitle:'An idea becomes a record.',localOnly:'Local session · no network request',seedTitle:'Plant a germ',seedCopy:'A start with no entity parent. Your supplied text remains its bound origin.',seedLabel:'Germ name',seedText:'Origin text',seedAction:'Create germ',seedPlaceholder:'A clearing',seedTextPlaceholder:'What should this first germ carry?',proposeTitle:'Propose a possibility',proposeCopy:'Parents, trigger and new text stay separate. A proposal starts as a candidate.',mode:'Genesis mode',modeChild:'Child with changed text',modeRevise:'Revision of the same entity',modeCompose:'Composition of 2–8 parents',modeClone:'Explicitly copy an identical instance',parents:'Select entity parents',noParents:'Create a germ first.',candidateText:'Candidate text',trigger:'Triggering reason',proposeAction:'Create candidate',
    continuityKicker:'KEEP OPEN & CARRY FORWARD',continuityTitle:'An ending can be a new beginning.',unknownTitle:'Keep a question open',unknownCopy:'The question belongs to the selected state. Its reason for reopening stays visible.',question:'Open question',reopenTrigger:'Revisit when …',unknownAction:'Create UNKNOWN',snapshotTitle:'Make a preserved state an anchor',snapshotCopy:'A snapshot preserves the current state. A new anchor gives it a new local origin role; its history stays intact.',snapshotAction:'Capture snapshot',worldNote:'A candidate, materialization, observation and new anchor are different events. The timeline shows which one actually occurred.',
    sessionKicker:'YOUR PRESERVED RUN',sessionTitle:'Take it with you. Verify. Continue.',sessionCopy:'Export and import keep the records together. An imported session replaces the current one only after verification; the previous session remains available here as a download.',export:'Export JSON',verify:'Verify ledger',import:'Import JSON',newSession:'New empty session',previousSessions:'Preserved previous sessions',downloadBackup:'Download backup ↓',sessionLimit:'Import up to 4 MiB. Browser session memory is temporary: download a run to preserve it after closing. Hash verification checks record consistency.',footer:'Possibilities stay open. Executed steps stay inspectable.',rights:'Rights & sources'
  };
  const strings = {
    ready:['Der Arbeitsraum ist bereit. Die erste Entscheidung gehört dir.','The workspace is ready. The first decision is yours.'],
    phases:{GERM:['Keim','Germ'],CANDIDATE:['Kandidat','Candidate'],MATERIALIZED:['Materialisiert','Materialized'],SUPERSEDED:['Erhaltene Vorversion','Preserved previous version']},
    modes:{INITIALIZE:['Initialisierung','Initialization'],DERIVE_CHILD:['Kind mit geändertem Text','Child with changed text'],REVISE:['Revision derselben Entität','Revision of the same entity'],COMPOSE:['Kombination','Composition'],CLONE_INSTANCE:['Identische Instanz','Identical instance']},
    commands:{SEED:['Keim','Germ'],PROPOSE:['Vorschlag','Proposal'],MATERIALIZE:['Materialisierung','Materialization'],OBSERVE:['Beobachtung','Observation'],OPEN_UNKNOWN:['Offene Frage','Open question'],REVISIT:['Wiederaufnahme','Revisit'],SNAPSHOT:['Snapshot','Snapshot'],REANCHOR:['Neuer Anker','New anchor']},
    outcomes:{SEED_REGISTERED:['Keim angelegt. Er ist als Ursprung erhalten und noch nicht materialisiert.','Germ created. It is preserved as an origin and has not been materialized.'],CANDIDATE_PROPOSED:['Kandidat angelegt. Die Modellwelt ändert sich erst durch Materialisierung.','Candidate created. The model world changes only through materialization.'],NO_CHANGE:['NO_CHANGE: Der Text ist exakt gleich. Der Versuch ist erhalten; es entstand kein neuer Zustand.','NO_CHANGE: The text is exactly equal. The attempt is preserved; no new state was created.'],MATERIALIZED:['Zustand materialisiert. Er ist jetzt die aktive Version seiner Entität.','State materialized. It is now the active version of its entity.'],OBSERVATION_RECORDED:['Beobachtung angefügt. Der beobachtete Modellzustand bleibt unverändert.','Observation appended. The observed model state remains unchanged.'],UNKNOWN_OPENED:['Frage und Wiederaufnahmegrund sind als offen erhalten.','The question and its reopening trigger are preserved as open.'],REVISIT_RECORDED:['Neue Angabe angefügt. Die Frage bleibt zur Prüfung offen.','New information appended. The question remains open for review.'],SNAPSHOT_CAPTURED:['Snapshot aufgenommen. Er bindet den Stand vor diesem Ereignis.','Snapshot captured. It binds the state preceding this event.'],LOCAL_ROOT_REGISTERED:['Neuer lokaler Anker gesetzt. Zustände und Abstammung bleiben erhalten.','New local anchor registered. States and lineage are preserved.']},
    errors:{TEXT_LIMIT_OR_EMPTY:['Ein Text ist leer oder überschreitet seine UTF-8-Bytegrenze. Bitte kürzen oder ausfüllen.','A text is empty or exceeds its UTF-8 byte limit. Please shorten or complete it.'],INVALID_PARENT_COUNT:['Wähle genau einen Elternzustand; eine Kombination benötigt 2 bis 8.','Select exactly one parent state; a composition needs 2 to 8.'],DUPLICATE_PARENT_ENTITY:['Eine Kombination benötigt unterschiedliche Elternentitäten. Zwei Versionen derselben Entität zählen einmal.','A composition needs distinct parent entities. Two versions of the same entity count once.'],REVISE_REQUIRES_CURRENT_MATERIALIZED_HEAD:['Eine Revision benötigt die aktuelle materialisierte Version ihrer Entität.','A revision needs the current materialized version of its entity.'],STALE_REVISION:['Die Elternversion dieser Revision ist nicht mehr aktuell. Lege einen Vorschlag vom heutigen Stand an.','This revision’s parent is no longer current. Propose a revision from the present state.'],CLONE_REQUIRES_IDENTICAL_TEXT:['Eine identische Instanz benötigt exakt den Text ihres Elternzustands.','An identical instance requires exactly its parent’s text.'],STATE_NOT_MATERIALIZED:['Materialisiere diesen Zustand vor seiner Beobachtung.','Materialize this state before observing it.'],CLOCK_MOVED_BACKWARDS:['Die Gerätezeit liegt vor dem letzten Record. Erhalte den Export und warte auf eine passende Zeitbasis.','The device clock precedes the latest record. Preserve the export and wait for a compatible time base.'],EVENT_LIMIT:['Die endliche Grenze von 128 Ereignissen ist erreicht. Exportiere den Lauf und beginne eine neue Sitzung.','The finite limit of 128 events has been reached. Export this run and begin a new session.'],STATE_LIMIT:['Die Grenze von 48 Zuständen ist erreicht. Der erhaltene Lauf kann exportiert werden.','The limit of 48 states has been reached. The preserved run can be exported.'],UNKNOWN_LIMIT:['Die Grenze von 64 offenen Fragen ist erreicht.','The limit of 64 open questions has been reached.'],EXPORT_LIMIT:['Der Lauf überschreitet die Grenze von 4 MiB. Die aktuelle Sitzung bleibt erhalten.','The run exceeds the 4 MiB limit. The current session is preserved.'],IMPORT_SIZE:['Die Datei überschreitet die Importgrenze von 4 MiB.','The file exceeds the 4 MiB import limit.'],BACKUP_LIMIT:['Zehn frühere Sitzungen sind erhalten. Lade sie herunter; ein weiterer Wechsel ist in diesem Tab gesperrt.','Ten previous sessions are preserved. Download them; another session replacement is blocked in this tab.'],SHA256_UNAVAILABLE:['Dieser Browser stellt SHA-256 hier nicht bereit. Öffne die Seite in einem aktuellen Browser.','This browser does not provide SHA-256 here. Open the page in a current browser.'],ILL_FORMED_UNICODE:['Der Text enthält eine ungültige Unicode-Sequenz. Die Eingabe wurde nicht übernommen.','The text contains an invalid Unicode sequence. The input was not accepted.']}
  };
  let language = new URL(location.href).searchParams.get('lang') === 'en' ? 'en' : 'de';
  const t = (de, english) => language === 'en' ? english : de;
  const pair = value => value ? value[language === 'en' ? 1 : 0] : '';
  let app, selectedId = null, historical = null, busy = false, graphMode = true;
  let selectedParents = new Set(), backups = [], lastMode = 'DERIVE_CHILD', nonCloneDraft = '';
  let beganAt = performance.now(), lastElapsed = 0, statusMessage = null, statusError = false;
  const revisitDrafts = new Map();
  const runId = () => 'GST_' + (crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '') : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2));
  const shortId = value => String(value || '—').split(':').at(-1);
  const excerpt = (value, max = 34) => { const points = Array.from(String(value)); return points.length > max ? points.slice(0, max - 1).join('') + '…' : String(value); };
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  function currentView() { return historical === null ? app.view() : app.view(historical); }
  function message(value, error = false) { statusMessage = value; statusError = error; $('status').textContent = typeof value === 'string' ? value : pair(value); $('status').dataset.error = String(error); }
  function errorMessage(error) { const code = error?.message || String(error); message(strings.errors[code] || [ 'Aktion nicht übernommen: ' + code, 'Action not accepted: ' + code ], true); }
  function setLanguage(requested, updateUrl = true) {
    language = requested === 'en' ? 'en' : 'de';
    document.documentElement.lang = language;
    for (const [el, de] of original) el.textContent = language === 'en' ? (en[el.dataset.i18n] || de) : de;
    for (const [el, de] of placeholders) el.placeholder = language === 'en' ? en[el.dataset.i18nPlaceholder] || de : de;
    document.querySelectorAll('[data-set-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.setLang === language)));
    document.querySelector('.hero-emblem img').alt = t('G^* mit Halo, offenem Stern und Übergangsschweif','G^* with halo, open star and transition tail');
    document.querySelector('.local-nav').setAttribute('aria-label', t('Seitennavigation','Page navigation'));
    document.querySelector('.language-switch').setAttribute('aria-label', t('Sprache','Language'));
    document.querySelector('.graph-panel').setAttribute('aria-label', t('Abstammungsgraph','Lineage graph'));
    document.querySelector('.view-switch').setAttribute('aria-label', t('Darstellung','View'));
    $('event-strip').setAttribute('aria-label', t('Ereignisse','Events'));
    document.title = language === 'en' ? 'G^* · WORLD SEEDWORK' : 'G^* · WELTKEIMWERK';
    if (updateUrl) { try { const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url); } catch (_) { /* file mode may restrict history; language still changes in place */ } }
    if (app) render();
    if (statusMessage) message(statusMessage, statusError);
    window.dispatchEvent(new CustomEvent('halveth:language', {detail:{language}}));
  }
  globalThis.HalvethLanguage = Object.freeze({get:() => language,set:requested => setLanguage(requested)});
  document.querySelectorAll('[data-set-lang]').forEach(el => el.addEventListener('click', () => setLanguage(el.dataset.setLang)));

  function selectState(id) { selectedId = id; render(); }
  function svg(tag, attrs = {}, text) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,String(value)); if (text !== undefined) el.textContent = text; return el; }
  function renderGraph(view) {
    const graph = $('world-graph'); graph.replaceChildren();
    graph.setAttribute('role', 'group'); graph.setAttribute('aria-label', t('Abstammung: ', 'Lineage: ') + view.states.length + t(' Zustände. Knoten sind per Tastatur auswählbar.',' states. Nodes can be selected with the keyboard.'));
    $('graph-empty').hidden = view.states.length !== 0;
    $('list-empty').hidden = view.states.length !== 0;
    const depth = new Map(), levels = new Map();
    for (const state of view.states) { const d = state.parents.length ? Math.max(...state.parents.map(p => depth.get(p.id) || 0)) + 1 : 0; depth.set(state.id,d); if (!levels.has(d)) levels.set(d,[]); levels.get(d).push(state); }
    const maxDepth = Math.max(0,...depth.values()), maxRows = Math.max(1,...Array.from(levels.values(),rows => rows.length));
    const width = Math.max(860,160 + (maxDepth + 1) * 215), height = Math.max(480,110 + maxRows * 110);
    graph.setAttribute('viewBox',`0 0 ${width} ${height}`);
    graph.setAttribute('width', String(width));
    graph.setAttribute('height', String(height));
    const locations = new Map();
    for (const [d,rows] of levels) for (let i=0;i<rows.length;i++) locations.set(rows[i].id,{x:maxDepth ? 130+d*(width-260)/maxDepth : width/2,y:(i+1)*height/(rows.length+1)});
    const links = svg('g',{'aria-hidden':'true'});
    for (const state of view.states) for (const parent of state.parents) {
      const a=locations.get(parent.id), b=locations.get(state.id); if(!a||!b) continue;
      const middle=(a.x+b.x)/2;
      links.append(svg('path',{d:`M ${a.x+14} ${a.y} C ${middle} ${a.y}, ${middle} ${b.y}, ${b.x-14} ${b.y}`,class:'graph-edge'+(selectedId===state.id||selectedId===parent.id?' selected':'')+(state.mode==='REVISE'?' revision':'')}));
    }
    graph.append(links);
    for (const state of view.states) {
      const p = locations.get(state.id), selected = state.id === selectedId;
      const group=svg('g',{class:'graph-node'+(selected?' selected':''),transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','aria-pressed':selected,'aria-label':`${state.label}, ${shortId(state.id)}, ${pair(strings.phases[state.phase])}, Γ${state.entityParentCount}`});
      group.append(svg('title',{},`${state.label} · ${shortId(state.id)}\n${state.text}`));
      group.append(svg('circle',{r:28,class:'focus-outline'}));
      if(selected) group.append(svg('circle',{r:23,fill:'none',stroke:'#dca762','stroke-opacity':'.45','stroke-width':'.8'}));
      const color=state.phase==='MATERIALIZED'?'#ed6956':state.phase==='CANDIDATE'?'#dca762':state.phase==='SUPERSEDED'?'#736653':'#f3ead7';
      if(state.phase==='CANDIDATE') group.append(svg('path',{d:'M 0 -12 L 12 0 L 0 12 L -12 0 Z',fill:'#20180f',stroke:color,'stroke-width':'1.5'}));
      else group.append(svg('circle',{r:state.phase==='MATERIALIZED'?11:8,fill:state.phase==='SUPERSEDED'?'#17120e':color,stroke:color,'stroke-width':'1.5','stroke-dasharray':state.phase==='SUPERSEDED'?'3 3':'none'}));
      group.append(svg('rect',{x:-91,y:29,width:182,height:44,rx:5,class:'node-label-bg',opacity:'.95'}));
      group.append(svg('text',{x:0,y:46,'text-anchor':'middle',class:'node-name'},excerpt(state.label,23)));
      group.append(svg('text',{x:0,y:62,'text-anchor':'middle',class:'node-id'},`${shortId(state.id)}  ·  Γ${state.entityParentCount}  ·  ${pair(strings.phases[state.phase])}`));
      group.addEventListener('click',()=>selectState(state.id));
      group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectState(state.id);}});
      graph.append(group);
    }
    const list=$('state-list'); list.replaceChildren();
    for(const state of view.states){const li=node('li'),button=node('button');button.type='button';button.setAttribute('aria-pressed',String(state.id===selectedId));button.append(node('span',state.label,'list-title'),node('span',`${shortId(state.id)} · ${shortId(state.entityId)} · Γ${state.entityParentCount}`,'list-id'),node('span',pair(strings.phases[state.phase]),'list-phase'));button.addEventListener('click',()=>selectState(state.id));li.append(button);list.append(li);}
    $('graph-surface').hidden=!graphMode; $('list-surface').hidden=graphMode;
    $('show-graph').setAttribute('aria-pressed',String(graphMode)); $('show-list').setAttribute('aria-pressed',String(!graphMode));
    const candidates=view.states.filter(s=>s.phase==='CANDIDATE').length;
    $('world-summary').textContent=t(`${candidates} Kandidaten · ${view.counts.activeEntities} aktive Entitäten · ${view.counts.materializations} Materialisierungen`,`${candidates} candidates · ${view.counts.activeEntities} active entities · ${view.counts.materializations} materializations`);
  }
  function renderTimeline(view) {
    const full=app.view(),range=$('timeline-range');range.min='0';range.max=String(Math.max(1,full.totalEvents));range.value=String(view.sequence);range.disabled=busy||full.totalEvents===0;
    $('timeline-position').textContent=`${view.sequence} / ${full.totalEvents}`;
    $('model-time').textContent=t('Schritt ','Step ')+view.sequence;
    $('browser-time').textContent=(lastElapsed/1000).toLocaleString(language,{minimumFractionDigits:1,maximumFractionDigits:1})+' s';
    const strip=$('event-strip');strip.replaceChildren();
    for(const event of full.events){const li=node('li'),button=node('button');button.type='button';button.className=event.sequence===view.sequence?'selected':'';button.setAttribute('aria-current',event.sequence===view.sequence?'step':'false');button.title=t('Lokale Aufzeichnung: ','Local recording: ')+event.recordedAt;button.append(node('b',String(event.sequence)),document.createTextNode(pair(strings.commands[event.command.type])));button.disabled=busy;button.addEventListener('click',()=>navigate(event.sequence));li.append(button);strip.append(li);}
    $('history-banner').hidden=!view.isHistorical;
  }
  function renderInspector(view) {
    const state=view.states.find(s=>s.id===selectedId);
    $('inspector-empty').hidden=!!state;$('inspector-content').hidden=!state;
    $('selected-phase').textContent=state?pair(strings.phases[state.phase]):'—';
    $('inspector-title').textContent=state?state.label:t('Jeder Zustand hat Herkunft.','Every state has an origin.');
    if(!state){$('record-json').textContent='{}';return;}
    $('selected-id').textContent=state.id;$('selected-text').textContent=state.text;
    const observations=view.observations.filter(o=>o.stateId===state.id);
    const rows=[
      [t('Entität · Zustand','Entity · state'),`${shortId(state.entityId)} · ${shortId(state.id)}`],
      [t('Entstehung · Entity-Parents','Genesis · entity parents'),`${pair(strings.modes[state.mode])} · Γ${state.entityParentCount}`],
      [t('Elternzustände','Parent states'),state.parents.length?state.parents.map(p=>shortId(p.id)).join(', '):t('Expliziter Start ohne Entity-Parent','Explicit start with no entity parent')],
      [t('Textrelation · exakter Unicode-Vergleich','Text relation · exact Unicode comparison'),state.textRelation],
      [t('Modellzeit · Entstehung / Materialisierung','Model time · creation / materialization'),`${state.bornAt} / ${state.materializedAt??'—'}`],
      [t('Lokale UTC-Aufzeichnung · nicht kalibriert','Local UTC recording · uncalibrated'),state.recordedAt],
      [t('Beobachtungen dieses Zustands','Observations of this state'),String(observations.length)],
      [t('Gebundener Record-Digest','Bound record digest'),state.digest]
    ];
    const facts=$('record-facts');facts.replaceChildren();for(const [key,value] of rows){const div=node('div');div.append(node('dt',key),node('dd',value));facts.append(div);}
    $('materialize').textContent=state.phase==='GERM'?t('Keim materialisieren','Materialize germ'):t('Kandidaten materialisieren','Materialize candidate');
    $('record-json').textContent=JSON.stringify({state,relations:view.relations.filter(r=>r.leftEndpoint.id===state.id||r.rightEndpoint.id===state.id),observations},null,2);
  }
  function availableParents(view) { return $('mode').value==='REVISE'?view.states.filter(s=>s.phase==='MATERIALIZED'):view.states; }
  function renderParents(view) {
    const mode=$('mode').value,rows=availableParents(view),valid=new Set(rows.map(s=>s.id));
    selectedParents=new Set([...selectedParents].filter(id=>valid.has(id)));
    if(mode!=='COMPOSE'&&selectedParents.size>1)selectedParents=new Set([[...selectedParents][0]]);
    if(selectedParents.size===0&&rows.length)selectedParents.add(rows.some(s=>s.id===selectedId)?selectedId:rows.at(-1).id);
    const picker=$('parent-picker');picker.replaceChildren();
    if(!rows.length)picker.append(node('span',mode==='REVISE'?t('Materialisiere zuerst eine Version.','Materialize a version first.'):t('Lege zuerst einen Keim an.','Create a germ first.')));
    for(const state of rows){const label=node('label'),input=node('input');input.type=mode==='COMPOSE'?'checkbox':'radio';input.name='parent-state';input.value=state.id;input.checked=selectedParents.has(state.id);input.disabled=busy||view.isHistorical;label.title=`${state.id}\n${state.text}`;label.append(input,node('span',`${shortId(state.id)} · ${state.label}`));input.addEventListener('change',()=>{if(mode==='COMPOSE'){if(input.checked)selectedParents.add(state.id);else selectedParents.delete(state.id);}else selectedParents=new Set([state.id]);renderParents(currentView());updateEnabled(currentView());});picker.append(label);}
    $('genesis-arity').textContent='Γ'+new Set([...selectedParents].map(id=>rows.find(s=>s.id===id)?.entityId).filter(Boolean)).size;
    const isClone=mode==='CLONE_INSTANCE';$('candidate-text').readOnly=isClone;
    if(isClone)$('candidate-text').value=rows.find(s=>s.id===[...selectedParents][0])?.text||'';
  }
  function renderUnknowns(view) {
    const list=$('unknown-list');list.replaceChildren();
    for(const unknown of view.unknowns){
      const card=node('article',undefined,'unknown-card'),header=node('header');header.append(node('span',`${shortId(unknown.id)} · ${shortId(unknown.stateId)}`),node('b',t('OFFEN','OPEN')));
      card.append(header,node('p',unknown.question),node('small',t('Wiederaufnahme: ','Revisit: ')+unknown.reopenTrigger));
      const revisits=view.revisits.filter(r=>r.unknownId===unknown.id);
      if(revisits.length){const details=node('details'),summary=node('summary',t(`${revisits.length} erhaltene Angaben · ungeprüft`,`${revisits.length} preserved statements · unverified`));details.append(summary);for(const record of revisits)details.append(node('p',`${record.sequence}: ${record.evidence}`));card.append(details);}
      const form=node('form'),label=node('label'),input=node('input'),button=node('button',t('Angabe anfügen · offen halten','Append information · keep open'),'button-secondary');input.id='revisit-'+shortId(unknown.id);input.required=true;input.maxLength=1000;input.value=revisitDrafts.get(unknown.id)||'';label.htmlFor=input.id;label.append(node('span',t('Neue Angabe zur Prüfung','New information for review')),input);button.type='submit';input.disabled=busy||view.isHistorical;button.disabled=busy||view.isHistorical;input.addEventListener('input',()=>revisitDrafts.set(unknown.id,input.value));form.append(label,button);form.addEventListener('submit',event=>{event.preventDefault();execute({type:'REVISIT',unknownId:unknown.id,evidence:input.value},()=>revisitDrafts.delete(unknown.id));});card.append(form);list.append(card);
    }
  }
  function renderSnapshots(view) {
    const list=$('snapshot-list');list.replaceChildren();
    for(const snapshot of view.snapshots){const card=node('article',undefined,'snapshot-card'),header=node('header');header.append(node('span',shortId(snapshot.id)),node('span',t('Schritt ','Step ')+snapshot.sequence));card.append(header,node('p',t(`Erhält Schritte 0–${snapshot.prefixLength} · ${snapshot.stateRefs.length} Zustände.`,`Preserves steps 0–${snapshot.prefixLength} · ${snapshot.stateRefs.length} states.`)));const anchored=view.roots.filter(r=>r.anchorRef.id===snapshot.id),button=node('button',t('Als neuen lokalen Anker setzen','Set as a new local anchor'),'button-secondary');button.type='button';button.disabled=busy||view.isHistorical;button.addEventListener('click',()=>execute({type:'REANCHOR',snapshotId:snapshot.id}));card.append(button);if(anchored.length)card.append(node('p',t('Anker: ','Anchors: ')+anchored.map(r=>shortId(r.id)).join(', ')));list.append(card);}
  }
  function renderBackups() {
    $('backup-panel').hidden=!backups.length;const selected=$('backup-select').value;$('backup-select').replaceChildren();backups.forEach((backup,index)=>{const option=node('option',`${index+1} · ${backup.runId} · ${backup.events.length} ${t('Schritte','steps')}`);option.value=String(index);$('backup-select').append(option);});if(selected&&Number(selected)<backups.length)$('backup-select').value=selected;
  }
  function updateEnabled(view) {
    const locked=busy||view.isHistorical,state=view.states.find(s=>s.id===selectedId);
    for(const formId of ['seed-form','propose-form','unknown-form'])$(formId).querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=locked);
    $('propose-button').disabled=locked||!availableParents(view).length;
    $('unknown-form').querySelector('button').disabled=locked||!state;
    $('materialize').disabled=locked||!state||!['GERM','CANDIDATE'].includes(state.phase);
    $('observe').disabled=locked||!state||state.materializedAt===null;
    $('snapshot').disabled=locked;
    $('demo').disabled=locked||app.view().totalEvents!==0;
    for(const id of ['export','verify','import','new-session','download-backup'])$(id).disabled=busy;
    $('go-live').disabled=busy;
  }
  function render() {
    const view=currentView();if(!view.states.some(s=>s.id===selectedId))selectedId=view.states.at(-1)?.id||null;
    $('count-states').textContent=view.counts.states;$('count-events').textContent=view.sequence;$('count-unknowns').textContent=view.counts.unknowns;
    renderGraph(view);renderTimeline(view);renderInspector(view);renderParents(view);renderUnknowns(view);renderSnapshots(view);renderBackups();updateEnabled(view);
  }
  function navigate(sequence) { if(busy)return;historical=sequence===app.view().totalEvents?null:sequence;render(); }
  async function execute(command, onSuccess) {
    if(busy||historical!==null)return;
    busy=true;render();
    try {const result=await app.dispatch(command);const state=result.event.records.find(r=>r.kind==='STATE');if(state)selectedId=state.id;if(onSuccess)onSuccess();lastElapsed=performance.now()-beganAt;message(strings.outcomes[result.outcome]||[result.outcome,result.outcome]);}
    catch(error){errorMessage(error);}finally{busy=false;render();}
  }
  function download(envelope, suffix='') { const blob=new Blob([GStar.canonical(envelope)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=envelope.runId+suffix+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function preserveCurrent() { if(backups.length>=10)throw new Error('BACKUP_LIMIT');backups.push(app.export()); }
  function resetView() {selectedId=null;historical=null;selectedParents.clear();revisitDrafts.clear();beganAt=performance.now();lastElapsed=0;}
  async function importFile(file) {
    if(busy||!file)return;busy=true;render();
    try {
      if(file.size>GStar.LIMITS.maxExportBytes)throw new Error('IMPORT_SIZE');
      const envelope=JSON.parse(await file.text());
      await GStar.verify(envelope);const replacement=await GStar.restore(envelope);
      preserveCurrent();app=replacement;resetView();message([`Import geprüft: ${app.view().counts.events} Ereignisse. Die vorherige Sitzung ist als Download erhalten.`,`Import verified: ${app.view().counts.events} events. The previous session is preserved as a download.`]);
    }catch(error){errorMessage(error);}finally{busy=false;$('import').value='';render();}
  }
  async function demo() {
    if(busy||historical!==null||app.view().totalEvents)return;
    busy=true;render();
    try {
      const perform=async command=>{const result=await app.dispatch(command);const state=result.event.records.find(r=>r.kind==='STATE');if(state)selectedId=state.id;return state||result.event.records[0];};
      const a=await perform({type:'SEED',label:t('Lichtung','Clearing'),text:t('Eine offene Lichtung empfängt das Morgenlicht.','An open clearing receives the morning light.')});
      const b=await perform({type:'SEED',label:t('Wasserlauf','Watercourse'),text:t('Ein kleiner Wasserlauf durchzieht die Landschaft.','A small watercourse crosses the landscape.')});
      const c=await perform({type:'PROPOSE',parents:[a.id,b.id],mode:'COMPOSE',text:t('Ein Wasserlauf begrenzt eine sonnige Lichtung. Zwei Ursprünge bleiben in ihrer gemeinsamen Landschaft erhalten.','A watercourse borders a sunlit clearing. Two origins remain preserved in their shared landscape.'),trigger:t('Zwei Keime zu einem benannten Modellzustand verbinden.','Connect two germs into one named model state.')});
      await perform({type:'MATERIALIZE',stateId:c.id});
      const d=await perform({type:'PROPOSE',parents:[c.id],mode:'DERIVE_CHILD',text:t('Ein Steg verbindet die Ufer an der Lichtung. Die vorherige Landschaft bleibt als Elternzustand erhalten.','A footbridge connects the banks beside the clearing. The earlier landscape is preserved as a parent state.'),trigger:t('Eine neue Möglichkeit aus der bestehenden Landschaft ableiten.','Derive a new possibility from the existing landscape.')});
      await perform({type:'MATERIALIZE',stateId:d.id});
      const snapshot=await perform({type:'SNAPSHOT'});
      await perform({type:'REANCHOR',snapshotId:snapshot.id});
      lastElapsed=performance.now()-beganAt;
      message(['Acht Schritte sind erhalten: vier Zustände, zwei aktive Entitäten und ein neuer lokaler Anker. Beobachtung und offene Fragen kannst du jetzt selbst ergänzen.','Eight steps are preserved: four states, two active entities and a new local anchor. You can now append observations and open questions yourself.']);
    }catch(error){errorMessage(error);}finally{busy=false;render();}
  }
  if(!globalThis.GStar){message(['Der Ledger-Kern konnte nicht geladen werden. Bitte lade die vollständigen lokalen Dateien.','The ledger core could not be loaded. Please load all local files.'],true);document.querySelectorAll('main button,main input,main textarea,main select').forEach(el=>el.disabled=true);return;}
  app=GStar.create({runId:runId()});
  $('seed-form').addEventListener('submit',event=>{event.preventDefault();execute({type:'SEED',label:$('seed-label').value,text:$('seed-text').value},()=>{$('seed-form').reset();});});
  $('propose-form').addEventListener('submit',event=>{event.preventDefault();execute({type:'PROPOSE',parents:[...selectedParents],mode:$('mode').value,text:$('candidate-text').value,trigger:$('trigger').value});});
  $('unknown-form').addEventListener('submit',event=>{event.preventDefault();if(selectedId)execute({type:'OPEN_UNKNOWN',stateId:selectedId,question:$('unknown-question').value,reopenTrigger:$('reopen-trigger').value},()=>{$('unknown-form').reset();});});
  $('mode').addEventListener('change',()=>{const next=$('mode').value;if(next==='CLONE_INSTANCE')nonCloneDraft=$('candidate-text').value;if(lastMode==='CLONE_INSTANCE'&&next!=='CLONE_INSTANCE')$('candidate-text').value=nonCloneDraft;lastMode=next;renderParents(currentView());updateEnabled(currentView());});
  $('materialize').addEventListener('click',()=>{if(selectedId)execute({type:'MATERIALIZE',stateId:selectedId});});
  $('observe').addEventListener('click',()=>{if(selectedId)execute({type:'OBSERVE',stateId:selectedId});});
  $('snapshot').addEventListener('click',()=>execute({type:'SNAPSHOT'}));
  $('demo').addEventListener('click',demo);
  $('timeline-range').addEventListener('input',event=>navigate(Number(event.target.value)));
  $('go-live').addEventListener('click',()=>{historical=null;render();});
  $('show-graph').addEventListener('click',()=>{graphMode=true;render();});
  $('show-list').addEventListener('click',()=>{graphMode=false;render();});
  $('export').addEventListener('click',()=>{download(app.export());lastElapsed=performance.now()-beganAt;message(['JSON-Download ausgelöst. Er enthält den aktuellen vollständigen Lauf.','JSON download initiated. It contains the complete current run.']);renderTimeline(currentView());});
  $('download-backup').addEventListener('click',()=>{const backup=backups[Number($('backup-select').value)];if(backup)download(backup,'_preserved');});
  $('import').addEventListener('change',event=>importFile(event.target.files[0]));
  $('new-session').addEventListener('click',()=>{if(busy)return;try{const replacement=GStar.create({runId:runId()});preserveCurrent();app=replacement;resetView();message(['Neue leere Sitzung geöffnet. Die vorherige ist als Download erhalten.','New empty session opened. The previous session is preserved as a download.']);render();}catch(error){errorMessage(error);}});
  $('verify').addEventListener('click',async()=>{if(busy)return;busy=true;render();try{const result=await GStar.verify(app.export());lastElapsed=performance.now()-beganAt;message([`Replay geprüft: ${result.events} Ereignisse und ${result.states} Zustände stimmen exakt überein. Das prüft die lokale Recordkonsistenz.`,`Replay verified: ${result.events} events and ${result.states} states match exactly. This checks local record consistency.`]);}catch(error){errorMessage(error);}finally{busy=false;render();}});
  window.addEventListener('popstate',()=>setLanguage(new URL(location.href).searchParams.get('lang'),false));
  window.addEventListener('beforeunload',event=>{if(app.view().totalEvents||backups.some(b=>b.events.length)){event.preventDefault();event.returnValue='';}});
  message(strings.ready);setLanguage(language);
})();
