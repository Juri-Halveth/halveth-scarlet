// Rechenmodell, Stand 14.10.2026. Alle nicht quellenbelegten Parameter sind
// illustrative Szenarioannahmen, keine Bewilligung, Messung oder Prognose.
export const cohort = Object.freeze({ people: 30, months: 6, referencePerPerson: 30000, coordination: 180000 });

export const scenarios = Object.freeze({
  vorsichtig: Object.freeze({ title: 'Vorsichtig', localShare: .35, additionalDemand: .15, valueAddedShare: .40, displacement: .30, workDuring: 6, workAfter: 6, monthlyWage: 2800, jobGva: 5500, jobLocalShare: .50, jobDisplacement: .30 }),
  prueffall: Object.freeze({ title: 'Prüffall', localShare: .50, additionalDemand: .35, valueAddedShare: .50, displacement: .15, workDuring: 12, workAfter: 18, monthlyWage: 3000, jobGva: 6000, jobLocalShare: .70, jobDisplacement: .15 }),
  chancenfall: Object.freeze({ title: 'Chancenfall', localShare: .70, additionalDemand: .65, valueAddedShare: .60, displacement: .10, workDuring: 24, workAfter: 48, monthlyWage: 3300, jobGva: 7000, jobLocalShare: .75, jobDisplacement: .10 })
});

export const pension2026 = Object.freeze({ rate: .186, averageEarnings: 51944, currentPensionValue: 42.52 });

function validShare(value) { return Number.isFinite(value) && value >= 0 && value <= 1; }
export function calculate(scenario, options = {}) {
  if (!scenario || [scenario.localShare, scenario.additionalDemand, scenario.valueAddedShare, scenario.displacement, scenario.jobLocalShare, scenario.jobDisplacement].some(value => !validShare(value))) throw new RangeError('Anteile müssen zwischen 0 und 1 liegen');
  if (![scenario.workDuring, scenario.workAfter, scenario.monthlyWage, scenario.jobGva].every(value => Number.isFinite(value) && value >= 0)) throw new RangeError('Mengen und Beträge müssen nichtnegativ sein');
  if (scenario.workDuring > cohort.people * cohort.months || scenario.workAfter > cohort.people * cohort.months) throw new RangeError('Arbeitsmonate überschreiten die Beobachtungszeit');
  const exceptional = options.exceptional === true;
  const ordinaryPeople = exceptional ? cohort.people - 1 : cohort.people;
  const directOrdinary = ordinaryPeople * cohort.referencePerPerson;
  const budget = directOrdinary + (exceptional ? 2000000 : 0) + cohort.coordination;
  // Der große Einzelfall ersetzt genau einen 30.000-Euro-Referenzplatz.
  // Seine erste Million sind Brühler Rechnungsbeträge; 450.000 Euro Kaufpreis
  // einer bestehenden Wohnung werden als Vermögensübertragung isoliert.
  const exceptionalLocalInvoices = exceptional ? 1000000 : 0;
  const exceptionalExistingAsset = exceptional ? 450000 : 0;
  const localInvoices = directOrdinary * scenario.localShare + exceptionalLocalInvoices;
  const eligibleInvoices = directOrdinary * scenario.localShare + exceptionalLocalInvoices - exceptionalExistingAsset;
  const t6Gva = eligibleInvoices * scenario.additionalDemand * scenario.valueAddedShare * (1 - scenario.displacement);
  // Nur neue Arbeit NACH T+6; Arbeit in den ersten sechs Monaten wird nicht
  // noch einmal zu den bereits erfassten örtlichen Rechnungen addiert.
  const postGva = scenario.workAfter * scenario.jobGva * scenario.jobLocalShare * (1 - scenario.jobDisplacement);
  const grossWagesT6 = scenario.workDuring * scenario.monthlyWage;
  const grossWagesT12 = (scenario.workDuring + scenario.workAfter) * scenario.monthlyWage;
  return Object.freeze({ budget, directOrdinary, localInvoices, exceptionalExistingAsset, eligibleInvoices, t6Gva, postGva, t12Gva: t6Gva + postGva,
    workDuring: scenario.workDuring, workAfter: scenario.workAfter,
    pensionT6: grossWagesT6 * pension2026.rate, pensionT12: grossWagesT12 * pension2026.rate,
    earningPointsT12: grossWagesT12 / pension2026.averageEarnings,
    billionPilotCount: Math.ceil(1e9 / (t6Gva + postGva)) });
}
