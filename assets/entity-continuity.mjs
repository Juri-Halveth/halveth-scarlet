import { validateSignature } from './entity-signatures.mjs';
export const CONTINUITY_SCHEMA='halveth.entity-continuity.v1';
export const MAX_BRANCHES=16, MAX_TRANSITIONS=128;
const clone=value=>JSON.parse(JSON.stringify(value));
export function createContinuity(signature) {
  const s=validateSignature(signature);
  return {schema:CONTINUITY_SCHEMA,entityId:s.entityId,active:'b0',next:1,branches:[{id:'b0',parent:null,step:0,state:clone(s),checkpoint:clone(s),history:[]}],events:[]};
}
// This is a bounded local state experiment. A restore appends history; it never erases it.
export function transition(previous, operation, payload) {
  if(!previous || previous.schema!==CONTINUITY_SCHEMA || !Array.isArray(previous.branches)) throw new TypeError('Invalid continuity');
  if(previous.events.length>=MAX_TRANSITIONS) throw new RangeError('Transition limit reached; export or restart');
  const next=clone(previous), branch=next.branches.find(b=>b.id===next.active);
  if(!branch) throw new TypeError('Missing active branch');
  let target=branch;
  if(operation==='FORK') {
    if(next.branches.length>=MAX_BRANCHES) throw new RangeError('Branch limit reached; export or restart');
    target={...clone(branch),id:`b${next.next++}`,parent:branch.id,history:[]};
    next.branches.push(target); next.active=target.id;
  } else if(operation==='SET') {
    const s=validateSignature(payload);if(s.entityId!==next.entityId) throw new TypeError('Entity identity mismatch');target.state=s;
  } else if(operation==='CHECKPOINT') target.checkpoint=clone(target.state);
  else if(operation==='RESTORE') target.state=clone(target.checkpoint);
  else if(operation==='SELECT') {
    target=next.branches.find(b=>b.id===payload);if(!target) throw new TypeError('Unknown branch');next.active=target.id;
  } else throw new TypeError('Unknown operation');
  target.step++;
  const event={sequence:next.events.length+1,operation,branch:target.id,modelStep:target.step};
  target.history.push(event.sequence);next.events.push(event);return next;
}
