import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const excluded=['ba-uebergangsraum','brightcast-starlight','de-anker-hela','halveth-research','handschriftliche-konvergenzen','microvalue','q-notizen','red-room-dialog','tagesstand-2026-09-13','usdai-sabr-kontext'];
test('retired context routes and automatic news publication remain outside the current tree',()=>{
 for(const x of excluded)assert.equal(fs.existsSync(path.join(root,'forschung',x)),false,x);
 assert.equal(fs.existsSync(path.join(root,'.github/workflows/news.yml')),false);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.doesNotMatch(html,/assets\/home-news\.js/);assert.doesNotMatch(html,/assets\/events\.js/);
});
test('the separately restored civic pilot has a readable page and its original brief',()=>{
 assert.ok(fs.existsSync(path.join(root,'forschung/juri-thesis/konzept.html')));
 assert.ok(fs.existsSync(path.join(root,'forschung/juri-thesis/assets/JURI-THESIS-Pilotbrief.pdf')));
});
test('guide exposes nine distinct existing technical demos',()=>{
 const html=fs.readFileSync(path.join(root,'forschung/wegweiser/index.html'),'utf8');
 const links=[...html.matchAll(/href="\.\.\/([a-z][a-z0-9-]*)\/"/g)].map(m=>m[1]);
 assert.equal(links.length,9);assert.equal(new Set(links).size,9);
 for(const x of links)assert.ok(fs.existsSync(path.join(root,'forschung',x,'index.html')));
});
