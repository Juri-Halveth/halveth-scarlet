import { AXES,FAMILIES,signatureFor,withCoordinate,withFamily,signatureInsights,docking } from './entity-signatures.mjs';
import { createContinuity,transition,MAX_BRANCHES } from './entity-continuity.mjs';

export function bindSignatureUI({entities,getLanguage,onChange}) {
  const $=id=>document.getElementById(id), sessions=new Map();let entity,session,partner='';
  const en=()=>getLanguage()==='en', t=(de,eng)=>en()?eng:de, current=()=>session.branches.find(b=>b.id===session.active).state;
  const status=value=>{$('signature-status').textContent=value;};
  const companion=()=>{
    if(!partner)return null;
    const saved=sessions.get(partner);
    return saved?saved.branches.find(b=>b.id===saved.active).state:signatureFor(entities.find(e=>e.id===partner));
  };
  function act(operation,payload) {
    try {session=transition(session,operation,payload);sessions.set(entity.id,session);render();return true;}
    catch(error){render();status(error.message);return false;}
  }
  function render(){
    const s=current(),family=FAMILIES[s.family],insights=signatureInsights(s);
    $('signature-family').textContent=en()?family.en:family.de;
    $('signature-family-choice').replaceChildren(...Object.entries(FAMILIES).map(([id,definition])=>{const o=document.createElement('option');o.value=id;o.textContent=en()?definition.en:definition.de;return o;}));$('signature-family-choice').value=s.family;
    $('signature-insights').replaceChildren();
    for(const [items,label] of [[insights.strengths,t('Trägt','Carries')],[insights.openings,t('Lädt ein','Invites')]]) {
      const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+' · ';p.append(b,items.map(a=>en()?a.enUse:a.deUse).join(' + '));$('signature-insights').append(p);
    }
    const idea=document.createElement('p');idea.className='signature-note';idea.textContent=en()?family.enIdea:family.deIdea;$('signature-insights').append(idea);
    for(const axis of AXES){const input=$('sig-'+axis.id);input.value=String(s.values[axis.id]*100);$('sig-value-'+axis.id).textContent=s.values[axis.id].toFixed(2);$('sig-label-'+axis.id).textContent=en()?axis.en:axis.de;}
    $('signature-branch').replaceChildren(...session.branches.map(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=`${b.id}${b.parent?' ← '+b.parent:' · '+t('Ursprung','origin')}`;return o;}));$('signature-branch').value=session.active;
    $('signature-history').textContent=`${session.branches.length}/${MAX_BRANCHES} ${t('Branches','branches')} · ${session.events.length} ${t('Ereignisse','events')} · ${t('Modellschritt','model step')} ${session.branches.find(b=>b.id===session.active).step}`;
    $('signature-fork').disabled=session.branches.length>=MAX_BRANCHES;
    const other=companion();
    $('signature-docking-result').textContent='';
    if(other){const comparison=docking(s,other),best=comparison.contributions[0],axis=AXES.find(a=>a.id===best.axis);$('signature-docking-result').textContent=`${t('Offener Anschluss','Open connection')}: ${en()?axis.en:axis.de}. ${entity.label} ↔ ${entities.find(e=>e.id===partner).label}. ${t('Vergleich der Entwurfswerte, keine gemessene Eignung.','A comparison of design coordinates, not measured suitability.')}`;}
    onChange(s,other);status('');
  }
  for(const axis of AXES){
    const row=document.createElement('label');row.htmlFor='sig-'+axis.id;
    const name=document.createElement('span');name.id='sig-label-'+axis.id;
    const value=document.createElement('output');value.id='sig-value-'+axis.id;value.htmlFor='sig-'+axis.id;
    const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='1';input.id='sig-'+axis.id;
    // Commit one transition on release; preview is continuous and does not flood the history.
    input.addEventListener('input',()=>{const s=withCoordinate(current(),axis.id,Number(input.value)/100);value.textContent=s.values[axis.id].toFixed(2);onChange(s,companion());});
    input.addEventListener('change',()=>act('SET',withCoordinate(current(),axis.id,Number(input.value)/100)));
    row.append(name,value,input);$('signature-parameters').append(row);
  }
  $('signature-reset').addEventListener('click',()=>act('SET',signatureFor(entity)));
  $('signature-family-choice').addEventListener('change',()=>act('SET',withFamily(current(),$('signature-family-choice').value)));
  $('signature-fork').addEventListener('click',()=>act('FORK'));
  $('signature-checkpoint').addEventListener('click',()=>act('CHECKPOINT'));
  $('signature-restore').addEventListener('click',()=>act('RESTORE'));
  $('signature-branch').addEventListener('change',()=>act('SELECT',$('signature-branch').value));
  $('signature-partner').addEventListener('change',()=>{partner=$('signature-partner').value;render();});
  $('signature-export').addEventListener('click',()=>{
    const payload={...session,exportedAt:new Date().toISOString(),scope:'LOCAL_DESIGN_MODEL',coordinates:AXES.map(({id,de,en})=>({id,de,en}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`halveth-${entity.id}-signature.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(t('JSON exportiert.','JSON exported.'));
  });
  return {select(next){entity=next;session=sessions.get(entity.id)||createContinuity(signatureFor(entity));sessions.set(entity.id,session);if(partner===entity.id)partner='';
    $('signature-partner').replaceChildren(...[{id:'',label:t('Allein betrachten','View alone')},...entities.filter(e=>e.id!==entity.id)].map(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.label;return o;}));$('signature-partner').value=partner;render();},refresh(){if(entity)this.select(entity);},current};
}
