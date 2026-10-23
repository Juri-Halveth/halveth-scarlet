// Authored design coordinates, not measured personality or autonomous capabilities.
export const SIGNATURE_VERSION = 'halveth.entity-signature.v1';
export const AXES = Object.freeze([
  { id:'coherence', de:'Halt', en:'Coherence', deUse:'Struktur halten', enUse:'Hold structure' },
  { id:'motion', de:'Bewegung', en:'Motion', deUse:'Veränderung erkunden', enUse:'Explore change' },
  { id:'reach', de:'Reichweite', en:'Reach', deUse:'Verbindungen öffnen', enUse:'Open connections' },
  { id:'memory', de:'Erinnerung', en:'Memory', deUse:'Spuren erhalten', enUse:'Preserve traces' },
  { id:'branching', de:'Verzweigung', en:'Branching', deUse:'Alternativen erzeugen', enUse:'Generate alternatives' },
  { id:'exchange', de:'Austausch', en:'Exchange', deUse:'Perspektiven verbinden', enUse:'Connect perspectives' },
]);
export const FAMILIES = Object.freeze({
  membrane:{ de:'Membran', en:'Membrane', color:'#8df4d5', values:[.9,.3,.6,.8,.3,.7], deIdea:'Hält einen Innenraum und lässt ausgewählten Austausch zu.', enIdea:'Holds an interior while allowing selected exchange.' },
  vortex:{ de:'Wirbel', en:'Vortex', color:'#ff668e', values:[.4,.9,.7,.3,.8,.6], deIdea:'Bewegung öffnet neue Wege um einen gemeinsamen Kern.', enIdea:'Motion opens new paths around a shared core.' },
  helix:{ de:'Helix', en:'Helix', color:'#d2a1ff', values:[.7,.5,.4,.95,.6,.4], deIdea:'Eine Spur setzt sich fort, ohne jede Windung gleichzusetzen.', enIdea:'A trace continues without equating every turn.' },
  lattice:{ de:'Gitter', en:'Lattice', color:'#9abaff', values:[.95,.3,.5,.7,.4,.5], deIdea:'Lokale Regeln tragen eine größere, prüfbare Struktur.', enIdea:'Local rules support a larger inspectable structure.' },
  bridge:{ de:'Brücke', en:'Bridge', color:'#ffce86', values:[.6,.5,.9,.4,.4,.95], deIdea:'Zwei verschiedene Seiten behalten ihren eigenen Ursprung.', enIdea:'Two different sides retain their own origin.' },
  prism:{ de:'Prisma', en:'Prism', color:'#abe8fa', values:[.7,.4,.65,.6,.85,.7], deIdea:'Ein Eingang wird aus mehreren benannten Perspektiven sichtbar.', enIdea:'One input becomes visible from several named perspectives.' },
  seed:{ de:'Keim', en:'Seed', color:'#c5e89b', values:[.6,.6,.5,.7,.9,.5], deIdea:'Aus einer gebundenen Ausgangslage wachsen mögliche Fortsetzungen.', enIdea:'Possible continuations grow from a bound starting state.' },
  pulse:{ de:'Impuls', en:'Pulse', color:'#ff9a72', values:[.5,.9,.7,.4,.5,.75], deIdea:'Ein kleiner Zustandswechsel setzt einen sichtbaren Rhythmus.', enIdea:'A small state change establishes a visible rhythm.' },
});
const GROUPS = {
  membrane:'halveth mara widow sael koro guardians vision',
  vortex:'scarlet loki lucifer dormammu anti mita',
  helix:'timo verachel lila eve omi deadpool',
  lattice:'ultron jarvis ironman finn nara tess gitcoin portal-chess',
  bridge:'lucinet rachel rosa elyr peter juri yuri ali sera',
  prism:'aster context-prism brightcast-starlight pi-treffpunkte medusa mica strange',
  seed:'pflanze ego schwamm venara juno alyen vael patch leo lia jan sara niko rose sina mascha choice-atelier infinity k',
  pulse:'zuendkerze celsius thor mira mio schwarm',
};
const familyById = new Map(Object.entries(GROUPS).flatMap(([family, ids])=>ids.split(' ').map(id=>[id,family])));
function seed(id) { let h=2166136261; for(const c of id) h=Math.imul(h^c.codePointAt(0),16777619); return h>>>0; }
export function signatureFor(entity) {
  if(!entity || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.id)) throw new TypeError('Invalid entity ID');
  const family=familyById.get(entity.id) || 'seed', hash=seed(entity.id), base=FAMILIES[family];
  const values=Object.fromEntries(AXES.map((axis,i)=>[axis.id,Math.round(Math.max(.05,Math.min(.98,base.values[i]+(((hash>>>(i*4))&15)-7.5)/100))*100)/100]));
  return { schema:SIGNATURE_VERSION, entityId:entity.id, family, seed:hash, origin:'AUTHORED_DESIGN', values };
}
export function validateSignature(input) {
  if(!input || input.schema!==SIGNATURE_VERSION || !FAMILIES[input.family] || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.entityId) || !Number.isInteger(input.seed) || input.seed<0 || input.seed>0xffffffff) throw new TypeError('Invalid signature');
  if(!input.values || Object.keys(input.values).length!==AXES.length || AXES.some(a=>!Number.isFinite(input.values[a.id]) || input.values[a.id]<0 || input.values[a.id]>1)) throw new TypeError('Coordinates must be finite and within [0,1]');
  return { schema:SIGNATURE_VERSION,entityId:input.entityId,family:input.family,seed:input.seed,origin:'AUTHORED_DESIGN',values:{...input.values} };
}
export function withCoordinate(signature, axis, value) {
  if(!AXES.some(a=>a.id===axis)) throw new TypeError('Unknown axis');
  return validateSignature({...signature,values:{...signature.values,[axis]:value}});
}
export function withFamily(signature,family){return validateSignature({...signature,family});}
export function signatureInsights(raw) {
  const s=validateSignature(raw), ranked=[...AXES].sort((a,b)=>s.values[b.id]-s.values[a.id] || a.id.localeCompare(b.id));
  return { strengths:ranked.slice(0,2), openings:ranked.slice(-2).reverse() };
}
export function docking(aRaw,bRaw) {
  const a=validateSignature(aRaw), b=validateSignature(bRaw);
  if(a.entityId===b.entityId) throw new TypeError('Choose two distinct entities');
  const contributions=AXES.map(axis=>({axis:axis.id,aToB:a.values[axis.id]*(1-b.values[axis.id]),bToA:b.values[axis.id]*(1-a.values[axis.id])}));
  contributions.sort((x,y)=>Math.max(y.aToB,y.bToA)-Math.max(x.aToB,x.bToA) || x.axis.localeCompare(y.axis));
  return { a:a.entityId,b:b.entityId,contributions,metric:'a_i * (1 - b_i); b_i * (1 - a_i)',status:'DESIGN_COMPARISON' };
}
// The same coordinates drive both the browser geometry and static SVG projections.
export function signaturePoint(raw, t, strand=0) {
  const s=validateSignature(raw), v=s.values, phase=(s.seed%997)/997*Math.PI*2;
  const q=t*Math.PI*2, twist=2+Math.round(v.branching*5), shift=strand*Math.PI*2/3;
  let r=1.3+.32*Math.cos(twist*q+phase+shift), y=.65*Math.sin(3*q+shift);
  if(s.family==='helix') { r=.85+.25*Math.cos(q*3+shift);y=(t-.5)*3; }
  else if(s.family==='membrane') { r=1.2*Math.sin(q/2);y=1.3*Math.cos(q/2); }
  else if(s.family==='lattice') { r=1.2/(.8+.2*Math.abs(Math.cos(q*4)));y=.7*Math.sin(q*4+shift); }
  else if(s.family==='bridge') { r=1.1+.32*Math.sin(q*2+shift);y=.9*Math.sin(q+shift); }
  else if(s.family==='prism') { r=1.2+.23*Math.cos(q*3);y=.9*Math.sin(q*3+shift); }
  else if(s.family==='seed') { r=(.6+.7*Math.sin(q/2))*(1+.12*Math.cos(twist*q));y=1.25*Math.cos(q/2); }
  else if(s.family==='pulse') { r=1+.32*Math.sin(q*5+shift);y=.45*Math.sin(q*2+shift); }
  return [r*Math.cos(q+shift)*(1+v.reach*.55),y*(.65+v.memory*.8),r*Math.sin(q+shift)*(.45+v.exchange*.65)];
}
