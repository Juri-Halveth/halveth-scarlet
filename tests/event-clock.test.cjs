const test=require('node:test');
const assert=require('node:assert/strict');
const clock=require('../assets/event-clock.js');

test('Every Berlin three-hour slot has exactly one elapsed hour of countdown',()=>{
  const midnight=Date.parse('2026-09-11T22:00:00Z');
  for(let hour=0;hour<24;hour+=3){
    const target=midnight+hour*clock.HOUR;
    assert.equal(clock.at(target-clock.HOUR-1).prelude,false);
    const opening=clock.at(target-clock.HOUR);
    assert.equal(opening.prelude,true);
    assert.equal(opening.nextAt,target);
    assert.equal(opening.nextLabel,String(hour).padStart(2,'0')+':00');
    assert.equal(opening.countdown,'01:00:00');
    assert.equal(clock.at(target-1).countdown,'00:00:01');
    assert.equal(clock.at(target).remainingFinale,22000);
    assert.equal(clock.at(target+21999).active,true);
    assert.equal(clock.at(target+22000).active,false);
  }
});
test('Midnight carries the next calendar date in the event ID',()=>{
  assert.equal(clock.at(Date.parse('2026-09-12T21:30:00Z')).nextId,'2026-09-13T00:00[Europe/Berlin]');
});
test('Spring clock jump still gets one real hour before 03:00',()=>{
  const state=clock.at(Date.parse('2026-03-29T00:00:00Z'));
  assert.equal(state.nextAt,Date.parse('2026-03-29T01:00:00Z'));
  assert.equal(state.opensLabel,'01:00');
  assert.equal(state.nextLabel,'03:00');
  assert.equal(state.countdown,'01:00:00');
});
test('Autumn repeated hour does not duplicate the 03:00 event',()=>{
  const before=clock.at(Date.parse('2026-10-25T00:00:00Z'));
  assert.equal(before.prelude,false);
  const opening=clock.at(Date.parse('2026-10-25T01:00:00Z'));
  assert.equal(opening.nextAt,Date.parse('2026-10-25T02:00:00Z'));
  assert.equal(opening.countdown,'01:00:00');
  assert.equal(opening.nextId,before.nextId);
});
test('Invalid timestamps are rejected',()=>{
  for(const value of [NaN,Infinity,-Infinity,'2026-09-12'])assert.throws(()=>clock.at(value),TypeError);
});
