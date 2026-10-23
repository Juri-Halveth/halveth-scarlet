import test from 'node:test';
import assert from 'node:assert/strict';
import { bindSignatureUI } from '../assets/entity-signature-ui.mjs';

function page() {
  const nodes=new Map();
  const element=()=>({value:'',textContent:'',listeners:{},children:[],
    set id(value){this._id=value;nodes.set(value,this);},get id(){return this._id;},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    addEventListener(type,listener){this.listeners[type]=listener;}
  });
  globalThis.document={createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}};
  const entities=[{id:'scarlet',label:'SCARLET'},{id:'mara',label:'MARA'}],frames=[];
  const ui=bindSignatureUI({entities,getLanguage:()=> 'en',onChange:(...args)=>frames.push(args)});
  const event=(id,type)=>nodes.get(id).listeners[type]();
  return {nodes,entities,frames,ui,event};
}

test('comparison uses the edited active branch of the partner and keeps both identities',()=>{
  const p=page();p.ui.select(p.entities[1]);
  p.nodes.get('sig-coherence').value='100';p.event('sig-coherence','change');
  p.event('signature-fork','click');
  p.nodes.get('sig-memory').value='0';p.event('sig-memory','change');
  assert.equal(p.ui.all().find(s=>s.entityId==='mara').values.memory,0,'the shared wave receives the edited branch');
  p.ui.select(p.entities[0]);p.nodes.get('signature-partner').value='mara';p.event('signature-partner','change');
  const [selected,partner]=p.frames.at(-1);
  assert.equal(selected.entityId,'scarlet');assert.equal(partner.entityId,'mara');
  assert.equal(partner.values.coherence,1);assert.equal(partner.values.memory,0);
  p.ui.select(p.entities[1]);assert.equal(p.frames.at(-1)[1],null,'self comparison is cleared');
});

test('a rejected edit restores the committed coordinates and tells the user why',()=>{
  const p=page();p.ui.select(p.entities[0]);
  const committed=p.ui.current().values.memory;
  for(let i=0;i<128;i++)p.event('signature-checkpoint','click');
  p.nodes.get('sig-memory').value='0';p.event('sig-memory','input');
  assert.equal(p.frames.at(-1)[0].values.memory,0,'preview is visible before commit');
  p.event('sig-memory','change');
  assert.equal(p.frames.at(-1)[0].values.memory,committed);
  assert.equal(p.ui.current().values.memory,committed);
  assert.match(p.nodes.get('signature-status').textContent,/limit/);
});
