(()=>{'use strict';
const language=()=>window.HalvethLanguage?.get()||document.documentElement.lang;
function bindFilter(inputId,selector,statusId,attribute){
  const input=document.getElementById(inputId),status=document.getElementById(statusId);
  if(!input||!status)return;
  const entries=[...document.querySelectorAll(selector)];
  const render=()=>{
    const query=input.value.trim().toLocaleLowerCase(language());let count=0;
    for(const entry of entries){
      const source=String(entry.dataset[attribute]||'');
      const labels=[...(entry.querySelectorAll?.('h2,[data-lang="de"],[data-lang="en"]')||[])].map(node=>window.HalvethHubLanguage?.searchable(node.textContent)||node.textContent);
      entry.hidden=![source,...labels].join(' ').toLocaleLowerCase(language()).includes(query);if(!entry.hidden)count++;
    }
    status.textContent=language()==='ru'?`${count} из ${entries.length} записей`:language()==='en'?`${count} of ${entries.length} entries`:`${count} von ${entries.length} Einträgen`;
  };
  input.addEventListener('input',render);window.addEventListener('halveth:language',render);render();
}
bindFilter('profile-search','.profile-grid > li','profile-results','search');
bindFilter('name-search','[data-name]','name-results','name');
})();
