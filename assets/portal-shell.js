(function(){
  'use strict';

  const script=document.currentScript;
  if(!script||document.querySelector('.portal-shell'))return;
  const base=new URL('../',script.src);
  const image=(name)=>new URL('assets/'+name,base).href;
  const images={
    gate:image('portal-cosmic-gate.webp'),
    machine:image('portal-machine.webp'),
    nexus:image('portal-nexus.webp'),
    scarlet:image('portal-scarlet-room.webp')
  };

  const routes=[
    {id:'home',path:'./',index:'00',image:'gate',accent:'#ffc66e',de:'Nexus',en:'Nexus',deNote:'Erde, Herz und alle Wege',enNote:'Earth, heart and every route'},
    {id:'room',path:'room/',index:'01',image:'scarlet',accent:'#ff345f',de:'Raum der Spuren',en:'Room of traces',deNote:'Freiwillige Gedanken und Quellen',enNote:'Voluntary thoughts and sources'},
    {id:'snapshot',path:'snapshot/',index:'02',image:'machine',accent:'#8deeff',de:'Snapshot-Studio',en:'Snapshot studio',deNote:'Lokale Belege zum Mitnehmen',enNote:'Local receipts to take with you'},
    {id:'figures',path:'forschung/figuren-und-perspektiven/',index:'03',image:'scarlet',accent:'#ff7899',de:'Figuren & Perspektiven',en:'Characters & perspectives',deNote:'Motive, Verantwortung, Alternativen',enNote:'Motives, responsibility, alternatives'},
    {id:'forms',path:'forschung/formen-und-verbindungen/',index:'04',image:'nexus',accent:'#79f5ce',de:'Formen & Verbindungen',en:'Forms & connections',deNote:'Ähnlichkeit prüfen, Ebenen trennen',enNote:'Test similarities, separate layers'},
    {id:'flow',path:'forschung/transaktionsfluss/',index:'05',image:'machine',accent:'#ffc66e',de:'Transaktionsfluss',en:'Transaction flow',deNote:'Werte, Struktur und Beleggrenzen',enNote:'Values, structure and evidence limits'},
    {id:'q',path:'forschung/q-notizen/',index:'06',image:'nexus',accent:'#a795ff',de:'Q-Notizen',en:'Q notebook',deNote:'Große Fragen, gebundene Quellen',enNote:'Big questions, bound sources'},
    {id:'day',path:'forschung/tagesstand-2026-09-13/',index:'07',image:'gate',accent:'#90cfff',de:'Tagesstand',en:'Daily record',deNote:'Ein nachvollziehbarer Arbeitsstand',enNote:'A traceable working record'},
    {id:'team',path:'./#team',index:'08',image:'nexus',accent:'#ff7ac8',de:'Die Konstellation',en:'The constellation',deNote:'66 öffentliche Karten: Perspektiven, Figuren, Projekte und Quellen',enNote:'66 public cards: perspectives, characters, projects and sources'},
    {id:'collage',path:'collage/',index:'09',image:'gate',accent:'#ff9a71',de:'Choice Atelier',en:'Choice Atelier',deNote:'Mode, Collage und eigene Wahl',enNote:'Fashion, collage and your own choice'}
  ];

  const normalized=(url)=>decodeURI(url.pathname).replace(/index\.html$/i,'').replace(/\/+$/,'/')||'/';
  const here=normalized(location);
  const current=routes.find(route=>route.id!=='team'&&normalized(new URL(route.path,base))===here)||routes[0];
  const language=()=>{
    const query=new URLSearchParams(location.search).get('lang');
    if(query==='en'||query==='de')return query;
    return document.documentElement.lang.toLowerCase().startsWith('en')?'en':'de';
  };
  const routeURL=(route,lang)=>{
    const url=new URL(route.path,base);
    url.searchParams.set('lang',lang);
    return url.href;
  };

  document.body.classList.add('portal-ready','portal-route-'+current.id);
  document.body.dataset.portalRoute=current.id;
  document.documentElement.style.setProperty('--portal-image','url("'+images[current.image]+'")');
  document.documentElement.style.setProperty('--portal-accent',current.accent);

  const atmosphere=document.createElement('div');
  atmosphere.className='portal-atmosphere';
  atmosphere.setAttribute('aria-hidden','true');

  const main=document.querySelector('main')||document.querySelector('[role="main"]')||document.body.firstElementChild;
  if(main&&!main.id)main.id='portal-main';
  const existingSkip=document.querySelector('a.skip-link[href^="#"],a.skip[href^="#"]');
  const skip=existingSkip||document.createElement('a');
  skip.classList.add('portal-skip');
  if(!existingSkip)skip.href=main&&main.id?'#'+main.id:'#';

  const shell=document.createElement('header');
  shell.className='portal-shell';
  shell.innerHTML='<a class="portal-brand" data-portal-home><span class="portal-brand-mark" aria-hidden="true">∞</span><span class="portal-brand-copy"><strong>JURI / HALVETH</strong><small>SCARLET PORTAL</small></span></a><div class="portal-route-label" aria-live="polite"><span class="portal-route-index"></span><span class="portal-route-name"></span></div><div class="portal-actions"><a class="portal-quick-link" data-portal-quick="home">⌂</a><a class="portal-quick-link" data-portal-quick="room">♡</a><a class="portal-quick-link" data-portal-quick="snapshot">◇</a><button class="portal-motion-button" type="button" aria-pressed="false">Ⅱ</button><button class="portal-map-button" type="button" aria-haspopup="dialog" aria-expanded="false"><i aria-hidden="true">✦</i><span></span></button></div>';

  const map=document.createElement('dialog');
  map.className='portal-map';
  map.innerHTML='<div class="portal-map-inner"><header class="portal-map-header"><div><p class="portal-map-kicker"></p><h2></h2><p class="portal-map-intro"></p></div><button class="portal-map-close" type="button" aria-label="Close">×</button></header><nav class="portal-grid"></nav><footer class="portal-map-foot"><span class="portal-map-foot-left"></span><span>HALVETH / SCARLET / 2026</span></footer></div>';

  const quickIds=['home','room','snapshot'];
  const render=()=>{
    const lang=language();
    const english=lang==='en';
    skip.textContent=english?'Skip to content':'Zum Inhalt springen';
    shell.querySelector('[data-portal-home]').href=routeURL(routes[0],lang);
    shell.querySelector('.portal-route-index').textContent='PORTAL '+current.index;
    shell.querySelector('.portal-route-name').textContent=current[lang];
    shell.querySelector('.portal-map-button span').textContent=english?'All rooms':'Alle Räume';
    shell.querySelector('.portal-map-button').setAttribute('aria-label',english?'Open the portal map':'Portalplan öffnen');
    for(const id of quickIds){
      const link=shell.querySelector('[data-portal-quick="'+id+'"]');
      const route=routes.find(item=>item.id===id);
      link.href=routeURL(route,lang);
      link.setAttribute('aria-label',route[lang]);
      if(route.id===current.id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    map.setAttribute('aria-label',english?'Scarlet portal map':'Scarlet-Portalplan');
    map.querySelector('.portal-map-close').setAttribute('aria-label',english?'Close portal map':'Portalplan schließen');
    map.querySelector('.portal-map-kicker').textContent=english?'THE CONNECTED UNIVERSE':'DAS VERBUNDENE UNIVERSUM';
    map.querySelector('h2').textContent=english?'Ten portals. One constellation.':'Zehn Portale. Eine Konstellation.';
    map.querySelector('.portal-map-intro').textContent=english?"I'm Juri. HALVETH is my open garden for big questions, traceable sources, and voluntary exploration together. I decide what I publish; you keep your choice. Project texts and fan interpretations are not personal messages or relationship claims. Public submissions can still contain personal data, so share only what you consciously want to make public. The whole public constellation travels with us.":'Ich bin Juri. HALVETH ist mein offener Garten für große Fragen, nachvollziehbare Quellen und freiwilliges gemeinsames Prüfen. Ich entscheide, was ich veröffentliche; du behältst deine Wahl. Projekttexte und Faninterpretationen sind keine persönlichen Nachrichten oder Beziehungsbehauptungen. Öffentlich eingereichte Angaben können trotzdem personenbezogen sein; teile nur, was du bewusst veröffentlichen willst. Die ganze öffentliche Konstellation reist mit.';
    map.querySelector('.portal-map-foot-left').textContent=english?'The em dash connects clauses without pretending to prove a cause.':'Der Gedankenstrich verbindet Satzteile, ohne eine Ursache vorzutäuschen.';
    const grid=map.querySelector('.portal-grid');
    grid.replaceChildren(...routes.map(route=>{
      const link=document.createElement('a');
      link.className='portal-node';
      link.dataset.portalRoute=route.id;
      link.href=routeURL(route,lang);
      link.style.setProperty('--node-image','url("'+images[route.image]+'")');
      link.style.setProperty('--node-accent',route.accent);
      if(route.id===current.id)link.setAttribute('aria-current','page');
      const number=document.createElement('span');number.className='portal-node-number';number.textContent='PORTAL '+route.index;
      const title=document.createElement('strong');title.textContent=route[lang];
      const note=document.createElement('small');note.textContent=route[lang+'Note'];
      link.append(number,title,note);
      return link;
    }));
  };

  const motionButton=shell.querySelector('.portal-motion-button');
  const setting=document.querySelector('#motion-setting');
  let storedMotion=null;
  try{storedMotion=localStorage.getItem('halveth-portal-motion');}catch(error){storedMotion=null;}
  let motionPaused=storedMotion==='paused';
  if(storedMotion===null)motionPaused=Boolean(setting&&setting.checked)||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const persistMotion=()=>{try{localStorage.setItem('halveth-portal-motion',motionPaused?'paused':'running');}catch(error){}};
  const applyMotion=()=>{
    const english=language()==='en';
    document.body.classList.toggle('portal-motion-paused',motionPaused);
    motionButton.setAttribute('aria-pressed',String(motionPaused));
    motionButton.setAttribute('aria-label',motionPaused?(english?'Resume motion':'Bewegung fortsetzen'):(english?'Pause motion':'Bewegung pausieren'));
    motionButton.textContent=motionPaused?'▶':'Ⅱ';
    if(setting&&setting.checked!==motionPaused){setting.checked=motionPaused;setting.dispatchEvent(new Event('change',{bubbles:true}));}
  };
  motionButton.addEventListener('click',()=>{motionPaused=!motionPaused;persistMotion();applyMotion();});
  if(setting)setting.addEventListener('change',()=>{
    const next=Boolean(setting.checked);
    if(next===motionPaused)return;
    motionPaused=next;persistMotion();applyMotion();
  });
  const button=shell.querySelector('.portal-map-button');
  const close=map.querySelector('.portal-map-close');
  const openMap=()=>{
    render();
    button.setAttribute('aria-expanded','true');
    if(typeof map.showModal==='function')map.showModal();else map.setAttribute('open','');
    close.focus();
  };
  const closeMap=()=>{
    button.setAttribute('aria-expanded','false');
    if(typeof map.close==='function'&&map.open)map.close();else map.removeAttribute('open');
    button.focus();
  };
  button.addEventListener('click',openMap);
  close.addEventListener('click',closeMap);
  map.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
  map.addEventListener('click',event=>{if(event.target===map)closeMap();});

  const observer=new MutationObserver(()=>{render();applyMotion();});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-set-lang]'))setTimeout(()=>{render();applyMotion();},0);
  },true);

  render();
  applyMotion();
  document.body.prepend(skip,atmosphere);
  document.body.append(shell,map);
})();
