/* Explicit language URLs outrank the visitor's remembered preference. */
(()=>{'use strict';
const supported=new Set(['de','en']);
const current=new URL(window.location.href);
let saved=null;try{saved=localStorage.getItem('halveth-language');}catch{}
const requested=current.searchParams.get('lang');
let language=supported.has(requested)?requested:supported.has(saved)?saved:(navigator.language||'').toLowerCase().startsWith('de')?'de':'en';
const inPlace=document.documentElement.hasAttribute?.('data-language-in-place')===true;
const boundButtons=new WeakSet();
let translations=null;
document.documentElement.lang=language;
function t(value){return language==='en'?(window.HalvethEnglish?.[value]??value):value;}
function link(path,lang=language){const u=new URL(path,document.baseURI);if(u.origin===current.origin&&(/\/$/.test(u.pathname)||/\.html$/.test(u.pathname))){u.searchParams.set('lang',lang);}return u.href;}
function set(lang){
  if(!supported.has(lang))return;
  try{localStorage.setItem('halveth-language',lang);}catch{}
  const u=new URL(window.location.href);u.searchParams.set('lang',lang);
  if(!inPlace){window.location.assign(u.href);return;}
  window.history.replaceState(window.history.state,'',u.href);
  language=lang;document.documentElement.lang=language;apply();
}
window.HalvethLanguage=Object.freeze({get:()=>language,t,link,set});
function captureTranslations(){
  const updates=[],english=value=>window.HalvethEnglish?.[value]??value;
  const walker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(!node.parentElement||node.parentElement.closest('script,style,code,pre,textarea,[data-lang="de"],[data-en]'))continue;
    const original=node.nodeValue,key=original.trim(),out=english(key);
    if(out!==key)updates.push(()=>{node.nodeValue=language==='en'?original.replace(key,out):original;});
  }
  for(const node of document.querySelectorAll('*')){
    if(node.closest('[data-lang="de"]'))continue;
    for(const attr of ['aria-label','aria-valuetext','placeholder','title','alt','data-caption','content']){
      if(attr==='content'&&!node.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]'))continue;
      const original=node.getAttribute(attr),explicit=node.getAttribute('data-en-'+attr);
      const translated=explicit??(original===null?null:english(original));
      if(translated!==original)updates.push(()=>{
        const value=language==='en'?translated:original;
        if(value===null)node.removeAttribute(attr);else node.setAttribute(attr,value);
      });
    }
    if(node.hasAttribute('data-en')){
      const original=node.textContent,translated=node.getAttribute('data-en');
      updates.push(()=>{const value=language==='en'?translated:original;if(node.textContent!==value)node.textContent=value;});
    }
  }
  return updates;
}
function apply(){
  // Capture the original static page once; later user text and fetched comments stay outside translation.
  if(translations===null)translations=captureTranslations();
  for(const update of translations)update();
  for(const a of document.querySelectorAll('a[href]')){const raw=a.getAttribute('href');if(raw.startsWith('#')||a.hasAttribute('data-set-lang'))continue;a.href=link(raw);}
  for(const button of document.querySelectorAll('[data-set-lang]')){
    button.setAttribute('aria-pressed',String(button.dataset.setLang===language));
    if(!boundButtons.has(button)){button.addEventListener('click',()=>set(button.dataset.setLang));boundButtons.add(button);}
  }
  window.dispatchEvent(new CustomEvent('halveth:language',{detail:{language}}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
