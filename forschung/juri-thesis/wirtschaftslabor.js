import { calculate, scenarios } from './wirtschaftslabor-model.mjs';

const euro = value => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat('de-DE').format(value);
const buttons = [...document.querySelectorAll('[data-scenario]')];
const exception = document.querySelector('#exceptional');
let selected = 'prueffall';

function render() {
  const s = scenarios[selected];
  const r = calculate(s, { exceptional: exception.checked });
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.scenario === selected));
  document.querySelector('#budget').textContent = euro(r.budget);
  document.querySelector('#invoices').textContent = euro(r.localInvoices);
  document.querySelector('#t6').textContent = euro(r.t6Gva);
  document.querySelector('#t12').textContent = euro(r.t12Gva);
  document.querySelector('#work').textContent = `${number(r.workDuring)} bis T+6 und ${number(r.workAfter)} weitere bis T+12 = ${number(r.workDuring + r.workAfter)} Arbeitsmonate`;
  document.querySelector('#pension').textContent = euro(r.pensionT12);
  document.querySelector('#pilots').textContent = number(r.billionPilotCount);
  document.querySelector('#assumptions').textContent = `Annahmen „${s.title}“: ${s.localShare * 100} % der gewöhnlichen Direktmittel werden vor Ort ausgegeben; davon ${s.additionalDemand * 100} % zusätzliche Nachfrage. Der Wertschöpfungsanteil beträgt ${s.valueAddedShare * 100} %, die Verdrängung ${s.displacement * 100} %. Nach T+6 kommen ${s.workAfter} neue Arbeitsmonate hinzu. Auch für sie zählen nur örtliche und nicht verdrängte Anteile.`;
  document.querySelector('#special').textContent = exception.checked
    ? `Großer Einzelfall: ${euro(2000000)} ersetzen einen Referenzplatz. Von der ersten Million Brühler Rechnungen sind ${euro(450000)} Kaufpreis einer bestehenden Wohnung; dieser Vermögensübergang geht nicht in die Wertschöpfungsrechnung ein. Eine weitere Million ist im Beispiel noch unverplant. Das Modell unterstellt keine Auszahlung vor Bewilligung.`
    : 'Der große Einzelfall ist ausgeschaltet. Die vier bereits erzählten Lebenswege behalten ihre eigenen, davon getrennten Beispielbudgets.';
}
for (const button of buttons) button.addEventListener('click', () => { selected = button.dataset.scenario; render(); });
exception.addEventListener('change', render);
render();
