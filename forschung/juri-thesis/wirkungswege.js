import {cases, summarizeBudget} from './wirkungswege-model.mjs';

const euro = amount => new Intl.NumberFormat('de-DE', {style:'currency',currency:'EUR',maximumFractionDigits:0}).format(amount);
const fields = Object.fromEntries(['number','title','hook','before','action','outcome','budget','budget-note','ledger','ledger-total','ledger-note','human','measure'].map(name=>[name,document.getElementById('story-'+name)]));
const outcomeLabel = document.getElementById('outcome-label');
let currentPerson = 'initiator';
let currentOutcome = 'open';

function render() {
  const entry = cases[currentPerson];
  const budget = summarizeBudget(entry);
  fields.number.textContent = `${entry.number} / Vier Lebenswege`;
  fields.title.textContent = entry.title;
  fields.hook.textContent = entry.hook;
  fields.before.textContent = entry.before;
  fields.action.textContent = entry.action;
  fields.outcome.textContent = entry[currentOutcome];
  fields.budget.textContent = euro(entry.budget);
  fields['budget-note'].textContent = entry.budgetNote;
  fields.human.textContent = entry.human;
  fields.measure.textContent = entry.measure;
  fields['ledger-note'].textContent = entry.ledgerNote;
  fields['ledger-total'].textContent = `Im Modell zugeordnet: ${euro(budget.allocated)}${budget.localPayments ? ` · davon Brühler Zahlungen: ${euro(budget.localPayments)}` : ''}`;
  outcomeLabel.textContent = currentOutcome === 'open' ? 'wenn Wege aufgehen' : 'wenn es hakt';
  fields.ledger.replaceChildren(...entry.lines.map(line => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    const amount = document.createElement('strong');
    name.textContent = line.label;
    amount.textContent = euro(line.amount);
    item.append(name, amount);
    return item;
  }));
  document.querySelectorAll('[data-person]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.person === currentPerson)));
  document.querySelectorAll('[data-outcome]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.outcome === currentOutcome)));
}

document.querySelectorAll('[data-person]').forEach(button => button.addEventListener('click',()=>{currentPerson=button.dataset.person;render();}));
document.querySelectorAll('[data-outcome]').forEach(button => button.addEventListener('click',()=>{currentOutcome=button.dataset.outcome;render();}));
render();
