import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// This is a discussion model, not an admissions rule or an individual decision.
export const MIN_AGE = 18;
export const PIVOT_AGE = 65;
export const POINT_COUNT = 16;

export function ageWeight(age) {
  if (!Number.isInteger(age) || age < MIN_AGE) throw new RangeError('The model covers adults aged 18 or older.');
  const remaining = (PIVOT_AGE - Math.min(age, PIVOT_AGE)) / (PIVOT_AGE - MIN_AGE);
  return 1 + remaining ** 2;
}

export function chartPoints() {
  return Array.from({ length: POINT_COUNT }, (_, index) => {
    const age = Math.round(MIN_AGE + (PIVOT_AGE - MIN_AGE) * index / (POINT_COUNT - 1));
    return { age, weight: ageWeight(age) };
  });
}

export function svg() {
  const points = chartPoints();
  const x = age => 76 + (age - MIN_AGE) * 800 / (PIVOT_AGE - MIN_AGE);
  const y = weight => 312 - (weight - 1) * 202;
  // The quadratic Bézier exactly follows the quadratic age function in chart coordinates.
  const curve = `M${x(MIN_AGE).toFixed(1)} ${y(2).toFixed(1)} Q${((x(MIN_AGE) + x(PIVOT_AGE)) / 2).toFixed(1)} ${y(1).toFixed(1)} ${x(PIVOT_AGE).toFixed(1)} ${y(1).toFixed(1)}`;
  const dots = points.map((point, index) => `<g><circle cx="${x(point.age).toFixed(1)}" cy="${y(point.weight).toFixed(1)}" r="${index === 0 || index === 15 ? 8 : 5.5}" fill="#f5c965" stroke="#14314b" stroke-width="3"/><title>Alter ${point.age}: Gewicht ${point.weight.toFixed(3)}</title></g>`).join('');
  const ticks = [18, 30, 42, 50, 65].map(age => `<g><line x1="${x(age).toFixed(1)}" x2="${x(age).toFixed(1)}" y1="312" y2="320" stroke="#517082"/><text x="${x(age).toFixed(1)}" y="345" text-anchor="middle">${age}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="385" viewBox="0 0 960 385" role="img" aria-labelledby="title desc">
<title id="title">16-Punkte-Alterskurve als Diskussionsmodell</title>
<desc id="desc">Das relative Gewicht sinkt gekrümmt: von 2 bei 18 Jahren anfangs stärker, später langsamer bis 1 bei 65 Jahren. Die 16 markierten Alterswerte sind Stützpunkte, keine Ausschlüsse. Jedes Alter von 18 an bleibt im Modell enthalten; ab 65 gilt das positive Gewicht 1. Keine echte Bewerbungsentscheidung.</desc>
<rect width="960" height="385" rx="24" fill="#e7f1eb"/>
<path d="M76 110H876M76 211H876M76 312H876" stroke="#a5beb5" stroke-dasharray="5 7"/>
<path d="M76 100V312H888" fill="none" stroke="#27495a" stroke-width="2"/>
<text x="48" y="115" text-anchor="end">2,0</text><text x="48" y="216" text-anchor="end">1,5</text><text x="48" y="317" text-anchor="end">1,0</text>
<text x="76" y="62" fill="#14314b" font-size="20" font-weight="700">Jünger stärker gewichtet - alle Erwachsenen bleiben im Bild</text>
<path d="${curve}" fill="none" stroke="#146857" stroke-width="5" stroke-linecap="round"/>
${dots}${ticks}
<text x="876" y="370" text-anchor="end" fill="#405a68" font-size="14">Alter in Jahren · relative Modellgewichte</text>
</svg>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const directory = path.join(root, 'forschung', 'juri-thesis', 'assets');
  fs.writeFileSync(path.join(directory, 'alterskurve-16.svg'), svg(), 'utf8');
  fs.writeFileSync(path.join(directory, 'alterskurve-16.json'), JSON.stringify({
    schema: 'juri-thesis.age-discussion.v2',
    formula: '1 + ((65-min(age,65))/47)^2',
    points: chartPoints(),
    decisionStatus: 'DISCUSSION_ONLY'
  }, null, 2) + '\n', 'utf8');
  console.log(directory);
}
