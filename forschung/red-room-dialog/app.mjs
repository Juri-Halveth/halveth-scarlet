import { dialogueAt } from '../../assets/red-room-dialog-model.mjs';
import { frameAt } from '../../assets/red-room-swarm-model.mjs';

const $ = id => document.getElementById(id);
const buttons = [...document.querySelectorAll('[data-scenario]')];
let scenario = 'blocked';

function render() {
  const tick = Number($('tick').value);
  const dialogue = dialogueAt(scenario, tick);
  const frame = frameAt(scenario, tick);
  $('tick-output').textContent = tick ? `T+${tick}` : 'T0';
  $('people').textContent = frame.people.free;
  $('echoes').textContent = frame.data.publicEchoes;
  $('copies').textContent = frame.runtime.activeCopies;
  for (const speaker of dialogue.speakers) {
    const suffix = speaker.id.toLowerCase();
    $(`role-${suffix}`).textContent = speaker.role;
    $(`statement-${suffix}`).textContent = `„${speaker.statement}“`;
    $(`evidence-${suffix}`).textContent = speaker.evidence;
  }
  for (const key of ['common', 'distinction', 'unresolved', 'expression']) $(key).textContent = dialogue.zero[key];
  $('observation').textContent = dialogue.zero.modelObservation;
  const list = $('bridges');
  list.replaceChildren(...dialogue.bridges.map(value => {
    const li = document.createElement('li');
    li.textContent = value;
    return li;
  }));
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario));
}

for (const button of buttons) button.addEventListener('click', () => { scenario = button.dataset.scenario; render(); });
$('tick').addEventListener('input', render);
render();
