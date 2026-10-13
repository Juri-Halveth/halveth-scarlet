const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const byId = id => document.getElementById(id);
const persons = byId('persons');
const payment = byId('payment');
const support = byId('support');

function updateExample() {
  const n = Number(persons.value);
  const monthly = Number(payment.value);
  const perPersonSupport = Number(support.value);
  const months = n * 2 * 6;
  const allowance = months * monthly;
  const subtotal = allowance + n * perPersonSupport + 250000;
  const total = subtotal + Math.round(subtotal / 10);
  byId('persons-value').textContent = String(n);
  byId('payment-value').textContent = money.format(monthly);
  byId('support-value').textContent = money.format(perPersonSupport);
  byId('months-value').textContent = String(months);
  byId('allowance-value').textContent = money.format(allowance);
  byId('total-value').textContent = money.format(total);
}
for (const input of [persons, payment, support]) input.addEventListener('input', updateExample);
updateExample();
