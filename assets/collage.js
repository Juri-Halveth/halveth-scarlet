(()=>{
  'use strict';
  const core=window.ChoiceAtelierCore;
  if(!core)return;

  const canvas=document.querySelector('#atelier-canvas');
  const context=canvas?.getContext('2d');
  const fileInput=document.querySelector('#atelier-files');
  const status=document.querySelector('#atelier-status');
  const caption=document.querySelector('#atelier-caption');
  const download=document.querySelector('#atelier-download');
  const reset=document.querySelector('#atelier-reset');
  const localOnly=document.querySelector('#local-file-note');
  const magnetButton=document.querySelector('#copy-magnet');
  const magnetValue=document.querySelector('#magnet-value');
  if(!canvas||!context||!fileInput)return;

  const formats={square:[1200,1200],story:[1000,1500],wide:[1600,900]};
  const palettes={scarlet:['#260812','#a10f3b','#ffbf77'],garden:['#041915','#0f6759','#d9ffd8'],midnight:['#050713','#25205c','#ff79b8']};
  const state={images:[],preset:'portal',format:'story',palette:'scarlet',objectUrls:[]};
  let imageRequest=0;

  let lastStatus={de:'',en:''};
  function language(){return window.HalvethLanguage?.get?.()==='en'?'en':'de';}
  function say(de,en){lastStatus={de,en};status.textContent=lastStatus[language()];}

  function roundedRect(ctx,x,y,width,height,radius){
    const r=Math.min(radius,width/2,height/2);
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+width,y,x+width,y+height,r);ctx.arcTo(x+width,y+height,x,y+height,r);ctx.arcTo(x,y+height,x,y,r);ctx.arcTo(x,y,x+width,y,r);ctx.closePath();
  }

  function drawBackground(width,height){
    const colors=palettes[state.palette]||palettes.scarlet;
    const gradient=context.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,colors[0]);gradient.addColorStop(.62,colors[1]);gradient.addColorStop(1,colors[2]);
    context.fillStyle=gradient;context.fillRect(0,0,width,height);
    context.globalAlpha=.24;
    for(let i=0;i<72;i+=1){
      const x=(i*193)%width,y=(i*i*47)%height,r=1+(i%4);
      context.fillStyle=i%5===0?'#ffd598':'#ffffff';context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();
    }
    context.globalAlpha=1;
  }

  function drawImageCard(item,frame,index){
    const {x,y,width,height,rotation}=frame;
    const radius=Math.max(18,Math.min(width,height)*.055);
    context.save();context.translate(x+width/2,y+height/2);context.rotate(rotation*Math.PI/180);context.translate(-width/2,-height/2);
    context.shadowColor='rgba(0,0,0,.52)';context.shadowBlur=Math.max(22,width*.035);context.shadowOffsetY=Math.max(9,height*.018);
    roundedRect(context,0,0,width,height,radius);context.clip();
    const crop=core.coverCrop(item.image.naturalWidth||item.image.width,item.image.naturalHeight||item.image.height,width,height);
    context.drawImage(item.image,crop.sx,crop.sy,crop.sw,crop.sh,0,0,width,height);
    const wash=context.createLinearGradient(0,0,0,height);wash.addColorStop(.55,'rgba(3,4,10,0)');wash.addColorStop(1,'rgba(3,4,10,.45)');context.fillStyle=wash;context.fillRect(0,0,width,height);
    context.shadowColor='transparent';context.strokeStyle=index===0?'rgba(255,215,151,.92)':'rgba(221,255,241,.7)';context.lineWidth=Math.max(3,width*.008);roundedRect(context,2,2,width-4,height-4,radius);context.stroke();context.restore();
  }

  function render(){
    const [width,height]=formats[state.format]||formats.story;
    canvas.width=width;canvas.height=height;
    drawBackground(width,height);
    const frames=core.layoutFrames(state.images.length,state.preset,width,height);
    state.images.forEach((item,index)=>drawImageCard(item,frames[index],index));
    const text=core.normalizeCaption(caption?.value||'');
    context.save();
    const margin=Math.round(Math.min(width,height)*.05);
    context.textAlign='left';context.textBaseline='bottom';
    context.font=`600 ${Math.round(Math.min(width,height)*.026)}px system-ui, sans-serif`;
    context.letterSpacing='0.08em';context.fillStyle='rgba(255,255,255,.78)';context.fillText('CHOICE ATELIER',margin,height-margin*1.7);
    if(text){
      const maxWidth=width-margin*2;
      let fontSize=Math.round(Math.min(width,height)*.044);
      context.font=`500 ${fontSize}px Georgia, serif`;
      while(fontSize>22&&context.measureText(text).width>maxWidth){fontSize-=2;context.font=`500 ${fontSize}px Georgia, serif`;}
      context.fillStyle='#fff8ee';context.fillText(text,margin,height-margin,maxWidth);
    }
    context.restore();
  }

  function loadImage(src,name,objectUrl=false){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve({image,name,objectUrl});
      image.onerror=reject;
      image.src=src;
    });
  }

  function revokeObjectUrls(urls){for(const url of urls)URL.revokeObjectURL(url);}
  function clearObjectUrls(){revokeObjectUrls(state.objectUrls);state.objectUrls=[];}

  async function loadBuiltIns(){
    const request=++imageRequest;
    clearObjectUrls();
    say('Die Originalmotive werden geladen …','Loading the original artwork …');
    try{
      const images=await Promise.all([
        loadImage('../assets/choice-atelier-wide-v1.webp','Portal ensemble'),
        loadImage('../assets/choice-atelier-pin-v1.webp','Choice portrait')
      ]);
      if(request!==imageRequest)return;
      state.images=images;
      render();say('Bereit. Alles bleibt in diesem Browser.','Ready. Everything stays in this browser.');
    }catch{if(request===imageRequest)say('Die Beispielbilder konnten nicht geladen werden. Eigene Bilder funktionieren weiterhin.','The sample artwork could not be loaded. Your own images still work.');}
  }

  async function useFiles(files){
    const selected=[...files];
    if(selected.length>8){say('Wähle höchstens acht Bilder. Die Auswahl wurde nicht verändert.','Choose no more than eight images. The selection was not changed.');return;}
    if(!selected.length||selected.some(file=>!core.fileAllowed(file))){say('Alle Dateien müssen PNG, JPEG oder WebP mit höchstens 15 MiB sein. Die Auswahl wurde nicht verändert.','Every file must be PNG, JPEG or WebP no larger than 15 MiB. The selection was not changed.');return;}
    const request=++imageRequest;
    const urls=[];
    const pending=selected.map(file=>{const url=URL.createObjectURL(file);urls.push(url);return loadImage(url,file.name,true);});
    try{
      const images=await Promise.all(pending);
      if(request!==imageRequest){revokeObjectUrls(urls);return;}
      clearObjectUrls();state.objectUrls=urls;state.images=images;render();say(`${state.images.length} lokale Bilder angeordnet. Nichts wurde hochgeladen.`,`${state.images.length} local images arranged. Nothing was uploaded.`);
    }
    catch{revokeObjectUrls(urls);if(request===imageRequest)say('Mindestens ein Bild ließ sich nicht lesen.','At least one image could not be read.');}
  }

  fileInput.addEventListener('change',()=>useFiles(fileInput.files));
  caption?.addEventListener('input',render);
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{state.preset=button.dataset.preset;document.querySelectorAll('[data-preset]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
  document.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',()=>{state.format=button.dataset.format;document.querySelectorAll('[data-format]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
  document.querySelectorAll('[data-palette]').forEach(button=>button.addEventListener('click',()=>{state.palette=button.dataset.palette;document.querySelectorAll('[data-palette]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
  reset?.addEventListener('click',()=>{clearObjectUrls();fileInput.value='';loadBuiltIns();});
  download?.addEventListener('click',()=>canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='halveth-choice-atelier.png';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('PNG lokal gespeichert.','PNG saved locally.');},'image/png'));

  document.querySelectorAll('[data-choice-lane]').forEach(button=>button.addEventListener('click',()=>{
    button.dataset.choiceLane=core.cycleLane(button.dataset.choiceLane);
    const labels={de:{mine:'Meine Wahl',ask:'Erst fragen',no:'Nicht für mich'},en:{mine:'My choice',ask:'Ask first',no:'Not for me'}};
    const lang=language();button.querySelector('small').textContent=labels[lang][button.dataset.choiceLane];
  }));

  magnetButton?.addEventListener('click',async()=>{
    const value=magnetValue?.textContent?.trim();
    if(!value||!value.startsWith('magnet:?'))return;
    try{await navigator.clipboard.writeText(value);say('Magnet-Link kopiert. Die Metadaten starten selbst kein Seeding.','Magnet link copied. The metadata does not start seeding by itself.');}
    catch{const range=document.createRange();range.selectNodeContents(magnetValue);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);say('Der Link ist markiert und kann kopiert werden.','The link is selected and ready to copy.');}
  });

  function renderDynamicLanguage(){
    if(localOnly)localOnly.textContent=language()==='en'?'Local only · no upload · no tracking':'Nur lokal · kein Upload · kein Tracking';
    status.textContent=lastStatus[language()];
    const labels={de:{mine:'Meine Wahl',ask:'Erst fragen',no:'Nicht für mich'},en:{mine:'My choice',ask:'Ask first',no:'Not for me'}};
    document.querySelectorAll('[data-choice-lane]').forEach(button=>{const label=button.querySelector('small');if(label)label.textContent=labels[language()][button.dataset.choiceLane];});
  }
  window.addEventListener('halveth:language',renderDynamicLanguage);
  window.addEventListener('beforeunload',clearObjectUrls);
  renderDynamicLanguage();
  loadBuiltIns();
})();
