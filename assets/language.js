/* Explicit language URLs outrank the visitor's remembered preference. */
(()=>{'use strict';
const supported=new Set(['de','en']);
const current=new URL(window.location.href);
let saved=null;try{saved=localStorage.getItem('halveth-language');}catch{}
const requested=current.searchParams.get('lang');
const language=supported.has(requested)?requested:supported.has(saved)?saved:(navigator.language||'').toLowerCase().startsWith('de')?'de':'en';
document.documentElement.lang=language;
function t(value){return language==='en'?(window.HalvethEnglish?.[value]??value):value;}
function link(path,lang=language){const u=new URL(path,document.baseURI);if(u.origin===current.origin&&(/\/$/.test(u.pathname)||/\.html$/.test(u.pathname))){u.searchParams.set('lang',lang);}return u.href;}
function set(lang){if(!supported.has(lang))return;try{localStorage.setItem('halveth-language',lang);}catch{}const u=new URL(window.location.href);u.searchParams.set('lang',lang);window.location.assign(u.href);}
window.HalvethLanguage=Object.freeze({get:()=>language,t,link,set});
function apply(){
  if(language==='en'){
    const walker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){if(!node.parentElement||node.parentElement.closest('script,style,code,pre,[data-lang="de"]'))continue;const raw=node.nodeValue,key=raw.trim(),out=t(key);if(out!==key)node.nodeValue=raw.replace(key,out);}
    for(const node of document.querySelectorAll('*')){
      if(node.closest('[data-lang="de"]'))continue;
      for(const attr of ['aria-label','aria-valuetext','placeholder','title','alt','data-caption','content']){
        if(attr==='content'&&!node.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]'))continue;
        if(node.hasAttribute(attr))node.setAttribute(attr,t(node.getAttribute(attr)));
        const explicit=node.getAttribute('data-en-'+attr);if(explicit!==null)node.setAttribute(attr,explicit);
      }
      if(node.hasAttribute('data-en'))node.textContent=node.getAttribute('data-en');
    }
  }
  for(const a of document.querySelectorAll('a[href]')){const raw=a.getAttribute('href');if(raw.startsWith('#')||a.hasAttribute('data-set-lang'))continue;a.href=link(raw);}
  for(const button of document.querySelectorAll('[data-set-lang]')){button.setAttribute('aria-pressed',String(button.dataset.setLang===language));button.addEventListener('click',()=>set(button.dataset.setLang));}
  window.dispatchEvent(new CustomEvent('halveth:language',{detail:{language}}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
