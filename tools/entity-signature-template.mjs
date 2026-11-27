import { signatureFor,signaturePoint,FAMILIES,AXES } from '../assets/entity-signatures.mjs';
export function signaturePanel(entity) {
  const s=signatureFor(entity),family=FAMILIES[s.family];
  const bi=(de,en)=>`<span data-lang="de">${de}</span><span data-lang="en">${en}</span>`;
  const paths=[0,1,2].map(strand=>{
    const points=Array.from({length:97},(_,i)=>{const [x,y,z]=signaturePoint(s,i/96,strand);return `${(180+x*49+z*13).toFixed(2)},${(105-y*47+z*10).toFixed(2)}`;}).join(' ');
    return `<polyline points="${points}"/>`;
  }).join('');
  return `<section class="profile-signature" aria-label="Signatur / Signature" data-signature-for="${entity.id}"><div class="signature-preview" style="--signature-color:${family.color}"><svg viewBox="0 0 360 210" role="img" aria-label="${family.en} · ${entity.id}"><g fill="none" stroke="currentColor" stroke-width="1.1">${paths}</g><circle cx="180" cy="105" r="6" fill="currentColor"/></svg><small>${bi(family.de,family.en)}</small></div><div><p class="eyebrow">1001 / ${bi('FORM & VERHALTEN','FORM & BEHAVIOR')}</p><h2>${bi('Ein Name. Offene Möglichkeiten.','One name. Open possibilities.')}</h2><p>${bi(family.deIdea,family.enIdea)}</p><dl class="signature-coordinates">${AXES.map(a=>`<div><dt>${bi(a.de,a.en)}</dt><dd>${s.values[a.id].toFixed(2)}</dd></div>`).join('')}</dl><p class="muted">${bi('Frei gestaltete Modellkoordinaten. Stärken und offene Anschlüsse lassen sich im 3D-Raum verändern und vergleichen.','Authored model coordinates. Strengths and open connections can be changed and compared in the 3D space.')}</p><a class="signature-open" href="../?lang=de#${entity.id}" data-en-href="../?lang=en#${entity.id}">${bi('Diese Form in 3D verändern','Change this form in 3D')} ↗</a></div></section>`;
}
