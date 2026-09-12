(()=>{'use strict';
const L=window.HalvethLanguage||{t:value=>value,get:()=>'de',link:path=>path};
const overlay=document.createElement('dialog');
overlay.id='reddit-tunnel';
overlay.className='reddit-tunnel';
overlay.setAttribute('aria-labelledby','reddit-tunnel-title');
const rings=document.createElement('div');rings.className='tunnel-rings';rings.setAttribute('aria-hidden','true');
for(let i=0;i<5;i++)rings.append(document.createElement('i'));
const heading=document.createElement('h2');heading.id='reddit-tunnel-title';
const target=document.createElement('a');target.textContent='HALVETH · Reddit ↗';target.rel='noreferrer';
const cancel=document.createElement('button');cancel.type='button';cancel.textContent=L.t('Hier bleiben');cancel.autofocus=true;
overlay.append(rings,heading,target,cancel);document.body.append(overlay);
let pending=null;
function reset(){if(pending!==null)clearTimeout(pending);pending=null;if(overlay.open)overlay.close();}
overlay.addEventListener('cancel',reset);
overlay.addEventListener('close',()=>{if(overlay.open)return;if(pending!==null)clearTimeout(pending);pending=null;});
cancel.addEventListener('click',reset);
target.addEventListener('click',reset);
window.addEventListener('pageshow',reset);
function validDestination(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.reddit.com','reddit.com'].includes(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function bind(link,label){
  const destination=validDestination(link.href);if(!destination)return;
  link.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.querySelector('.scene')?.dataset.motion==='paused')return;
    event.preventDefault();reset();heading.textContent=label;target.href=destination;overlay.showModal();
    pending=setTimeout(()=>{pending=null;window.location.assign(destination);},720);
  });
}
window.HalvethRedditTunnel=Object.freeze({bind,validDestination});
})();
