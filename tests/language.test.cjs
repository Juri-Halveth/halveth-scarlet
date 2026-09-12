const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../assets/language.js'),'utf8');
function setup(query='',saved=null,browser='de-DE',blockedStorage=false){
  const assigned=[],writes=[],url='https://juri-halveth.github.io/halveth-scarlet/'+query;
  const document={documentElement:{lang:'de'},baseURI:url,readyState:'loading',addEventListener(){}};
  const window={location:{href:url,assign:u=>assigned.push(u)},HalvethEnglish:{Hallo:'Hello'}};
  vm.runInNewContext(script,{window,document,URL,navigator:{language:browser},localStorage:{getItem(){if(blockedStorage)throw Error('blocked');return saved;},setItem(k,v){if(blockedStorage)throw Error('blocked');writes.push([k,v]);}}});
  return {language:window.HalvethLanguage,document,assigned,writes};
}
test('Explicit English link wins over German device and remembered preference',()=>{
  const h=setup('?lang=en','de');assert.equal(h.language.get(),'en');assert.equal(h.document.documentElement.lang,'en');assert.equal(h.language.t('Hallo'),'Hello');
});
test('Language detection supports stored choices and English fallback without storage access',()=>{
  assert.equal(setup('','en').language.get(),'en');assert.equal(setup('',null,'fr-FR',true).language.get(),'en');assert.equal(setup('?lang=de','en','en-US').language.get(),'de');
});
test('Internal page links retain the chosen language and fragment; external sources and raw data retain their URLs',()=>{
  const h=setup('?lang=en');
  assert.equal(h.language.link('forschung/figuren-und-perspektiven/#ego'),'https://juri-halveth.github.io/halveth-scarlet/forschung/figuren-und-perspektiven/?lang=en#ego');
  assert.equal(h.language.link('https://www.reddit.com/user/Halveth-Juri/'),'https://www.reddit.com/user/Halveth-Juri/');
  assert.equal(h.language.link('assets/anchor-manifest.json'),'https://juri-halveth.github.io/halveth-scarlet/assets/anchor-manifest.json');
});
test('Language switching preserves other URL parameters and the article anchor',()=>{
  const h=setup('?v=release&lang=de#ego');h.language.set('en');
  assert.equal(h.assigned[0],'https://juri-halveth.github.io/halveth-scarlet/?v=release&lang=en#ego');assert.deepEqual(h.writes,[['halveth-language','en']]);
});
test('Every garden entity retains a complete English counterpart and stable identity',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/universe-data.js'),'utf8'),context);
  const entities=context.window.HalvethUniverse.entities;assert.equal(entities.length,64);assert.equal(new Set(entities.map(e=>e.id)).size,64);
  for(const e of entities)for(const key of ['role','kind','note','sourceLabel']){assert.equal(typeof e.en[key],'string',e.id+'.'+key);if(e[key])assert(e.en[key].length,e.id+'.'+key);}
});
