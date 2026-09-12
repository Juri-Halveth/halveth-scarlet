(()=>{
  'use strict';
  const core=window.HalvethRoomCore;
  const $=id=>document.getElementById(id);
  const en=()=>window.HalvethLanguage.get()==='en';
  const text=(de,english)=>en()?english:de;
  let gesture='skip',draft='',draftVersion=0,busy=false,loadedEntries=null;
  const statuses=new Map();
  function setStatus(id,message){statuses.set(id,message);$(id).textContent=message();}
  function enter(value){
    gesture=value;$('room-gate').hidden=true;$('room-content').hidden=false;
    $('room-content').focus({preventScroll:true});
  }
  document.querySelectorAll('[data-gesture]').forEach(button=>button.addEventListener('click',()=>enter(button.dataset.gesture)));
  $('gate-skip').addEventListener('click',()=>enter('skip'));
  $('github-comment').href=core.issueUrl+'#new_comment_field';
  const form=$('stamp-form');
  function invalidate(){
    draftVersion++;draft='';$('stamp-preview').value='';$('preview-panel').hidden=true;
    $('stamp-preview').hidden=true;setStatus('copy-status',()=> '');setStatus('form-status',()=> '');
  }
  form.addEventListener('input',invalidate);
  form.addEventListener('change',invalidate);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const version=++draftVersion;
    try{
      const values=Object.fromEntries(new FormData(form));
      const record=core.prepare({...values,gesture},new Date().toISOString());
      const bytes=new TextEncoder().encode(JSON.stringify(record));
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      if(version!==draftVersion)return;
      const digest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
      draft=core.format(record,digest);$('stamp-preview').value=draft;
      $('preview-panel').hidden=false;$('stamp-preview').hidden=false;
      setStatus('form-status',()=>text('Dein Entwurf ist bereit. Prüfe ihn, kopiere ihn und veröffentliche ihn auf GitHub.','Your draft is ready. Review it, copy it and publish it on GitHub.'));
      $('stamp-preview').focus();
    }catch(error){
      if(version!==draftVersion)return;
      draft='';$('preview-panel').hidden=true;
      setStatus('form-status',()=>error.message==='INVALID_SOURCE'?
        text('Bitte nutze eine vollständige HTTPS-Quellenadresse ohne Zugangsdaten.','Please use a complete HTTPS source URL without credentials.'):
        text('Der Entwurf konnte nicht erstellt werden. Prüfe die Felder und nutze eine aktuelle HTTPS-Browseransicht.','The draft could not be prepared. Check the fields and use a current HTTPS browser view.'));
    }
  });
  $('copy-stamp').addEventListener('click',async()=>{
    if(!draft)return;
    const copied=draft,version=draftVersion;
    try{await navigator.clipboard.writeText(copied);if(version!==draftVersion||copied!==draft)return;setStatus('copy-status',()=>text('Kopiert. Auf GitHub kannst du den Text prüfen und als Kommentar senden.','Copied. Review and submit the text as a comment on GitHub.'));}
    catch{if(version!==draftVersion||copied!==draft)return;$('stamp-preview').focus();$('stamp-preview').select();setStatus('copy-status',()=>text('Bitte den markierten Text mit Strg/Cmd+C kopieren.','Please copy the selected text with Ctrl/Cmd+C.'));}
  });
  function render(entries){
    const fragment=document.createDocumentFragment();
    for(const item of [...entries].reverse()){
      const article=document.createElement('article');article.className='trace-card';
      const heading=document.createElement('h3');heading.className='trace-author';heading.textContent='@'+item.author;
      const meta=document.createElement('p');meta.className='trace-meta';
      const time=document.createElement('time');time.dateTime=item.createdAt;
      time.textContent=new Intl.DateTimeFormat(en()?'en-GB':'de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.createdAt));
      meta.append(time);
      if(item.updatedAt!==item.createdAt)meta.append(document.createTextNode(text(' · bearbeitet',' · edited')));
      const body=document.createElement('p');body.className='trace-body';body.textContent=item.body;
      const link=document.createElement('a');link.className='trace-source';link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent=text('Original auf GitHub','Original on GitHub');
      article.append(heading,meta,body);
      if(item.shortened){const note=document.createElement('p');note.textContent=text('Vorschau gekürzt; der vollständige Text steht im Original.','Preview shortened; the complete text is available at the source.');article.append(note);}
      article.append(link);fragment.append(article);
    }
    $('trace-feed').replaceChildren(fragment);
  }
  window.addEventListener('halveth:language',()=>{
    for(const [id,message] of statuses)$(id).textContent=message();
    if(loadedEntries!==null)render(loadedEntries);
  });
  $('load-traces').addEventListener('click',async()=>{
    if(busy)return;busy=true;$('load-traces').disabled=true;
    setStatus('feed-status',()=>text('Öffentliche Kommentare werden von GitHub geladen …','Loading public comments from GitHub …'));
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch('https://api.github.com/repos/Juri-Halveth/halveth-scarlet/issues/1/comments?per_page=100&page=1',{
        method:'GET',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,
        headers:{Accept:'application/vnd.github+json'}});
      if(!response.ok)throw Error(response.status===429||(response.status===403&&response.headers.get('x-ratelimit-remaining')==='0')?'RATE_LIMIT':'HTTP');
      const entries=core.comments(await response.json());render(entries);loadedEntries=entries;
      const checkedAt=new Date();
      setStatus('feed-status',()=>{
        const checked=new Intl.DateTimeFormat(en()?'en-GB':'de-DE',{timeStyle:'short'}).format(checkedAt);
        return entries.length?
          (entries.length===1?
            text('1 öffentlicher Kommentar geladen · geprüft um '+checked+'.','1 public comment loaded · checked at '+checked+'.'):
            text(entries.length+' öffentliche Kommentare geladen · geprüft um '+checked+'.',entries.length+' public comments loaded · checked at '+checked+'.'))+
          (entries.length===100?text(' Erste 100 Einträge; weitere Beiträge findest du auf GitHub.',' First 100 entries; see GitHub for further comments.'):''):
          text('Noch keine Kommentare im Raum. Du kannst die erste Spur hinterlassen.','No comments in the room yet. You can leave the first trace.');
      });
    }catch(error){
      setStatus('feed-status',()=>error.message==='RATE_LIMIT'?
        text('GitHub begrenzt gerade die Abfragen. Du kannst den Raum direkt auf GitHub öffnen.','GitHub is limiting requests. You can open the room directly on GitHub.'):
        text('Kommentare konnten nicht aktualisiert werden. Vorhandene Karten zeigen den vorherigen Abruf; auf GitHub kannst du weiterlesen.','Comments could not be refreshed. Existing cards show the previous fetch; continue reading on GitHub.'));
    }finally{clearTimeout(timeout);busy=false;$('load-traces').disabled=false;}
  });
})();
