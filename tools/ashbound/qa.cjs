const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const packages=process.env.CODEX_NODE_PACKAGES;
if(!packages)throw new Error('Set CODEX_NODE_PACKAGES to the bundled runtime dependency directory.');
const {chromium}=require(path.join(packages,'playwright'));
const sharp=require(path.join(packages,'sharp'));
const root=path.resolve(__dirname,'../..'),output=path.join(root,'.local-qa/ashbound');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.md':'text/plain','.ink':'text/plain'};
const server=http.createServer((req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/halveth-scarlet\//,'');let file=path.resolve(root,pathname||'index.html');
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400).end();}
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function noOverflow(page){
  const result=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
    clipped:[...document.querySelectorAll('button,.entity h3,.book strong,.section-heading h1')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+3).map(n=>n.textContent)}));
  assert.ok(result.scroll<=result.width+1,JSON.stringify(result));assert.deepEqual(result.clipped,[]);
}
async function pixels(bytes){const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});const colors=new Set();let sum=0,sum2=0;for(let i=0;i<data.length;i+=info.channels*47){let v=(data[i]+data[i+1]+data[i+2])/3;sum+=v;sum2+=v*v;colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);}const n=Math.ceil(data.length/(info.channels*47));return {colors:colors.size,variance:sum2/n-(sum/n)**2};}
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const local=`http://127.0.0.1:${server.address().port}/halveth-scarlet/`;
  const base=process.env.ASHBOUND_LIVE_BASE||local;
  const launch={headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']};
  if(process.env.ASHBOUND_CHROME)launch.executablePath=process.env.ASHBOUND_CHROME;
  const browser=await chromium.launch(launch),reports=[],homeEntries=[];
  try{
    for(const viewport of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:768,height:1024}]){
      const context=await browser.newContext({viewport,locale:'de-DE'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
      // Page readiness is app-bound; host browser integrations may keep requests open.
      await page.goto(base+'forschung/morrowind-lernwelt/?lang=de',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.body.dataset.ready==='true'&&window.AshboundDiagnostics?.scene?.frames>6,null,{timeout:20000});
      const prefix=`${viewport.width}x${viewport.height}`;
      await noOverflow(page);
      const a=await page.locator('#scene canvas').screenshot();const stats=await pixels(a);assert.ok(stats.colors>40&&stats.variance>35,JSON.stringify(stats));
      await sleep(600);const b=await page.locator('#scene canvas').screenshot();assert.notEqual(crypto.createHash('sha256').update(a).digest('hex'),crypto.createHash('sha256').update(b).digest('hex'));
      await page.screenshot({path:path.join(output,prefix+'-world.png'),fullPage:true});
      await page.locator('[data-region="gate"]').click();assert.equal(await page.evaluate(()=>AshboundDiagnostics.region),'gate');
      await page.locator('#enter-story').click();await page.locator('.choices button').first().click();
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);
      await page.locator('#language').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.dataset.ready==='true');
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);
      await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[]);
      for(let i=0;i<5;i++)await page.locator('.choices button').first().click();assert.equal(await page.locator('.choices button').count(),0);
      await noOverflow(page);await page.screenshot({path:path.join(output,prefix+'-story.png'),fullPage:true});
      await page.locator('[data-tab="council"]').click();assert.equal(await page.locator('.entity').count(),66);
      await page.locator('#entity-search').fill('Dormammu');assert.equal(await page.locator('.entity').count(),1);
      await page.locator('#party-strip button').first().click();await page.locator('.entity-actions button').click();
      assert.ok((await page.evaluate(()=>AshboundDiagnostics.party)).includes('dormammu'));
      await noOverflow(page);await page.locator('#entity-search').fill('');
      await page.screenshot({path:path.join(output,prefix+'-council.png'),fullPage:true});
      await page.locator('[data-tab="books"]').click();await page.locator('.book').nth(2).click();assert.ok(await page.locator('#book-dialog').isVisible());
      await page.locator('[data-close="book-dialog"]').click();assert.equal((await page.evaluate(()=>AshboundDiagnostics.books)).length,1);
      await page.locator('[data-tab="lab"]').click();await page.locator('[data-mode="stop"]').click();await page.locator('#fall-run').click();await sleep(400);
      assert.match(await page.locator('#fall-status').textContent(),/t = 0\./);
      await page.locator('#model-max').click();assert.match(await page.locator('#hit-results').textContent(),/100 \/ 100/);
      await page.locator('#probability').fill('0');await page.locator('#sample').click();assert.match(await page.locator('#hit-results').textContent(),/0 \/ 100/);
      await noOverflow(page);await page.screenshot({path:path.join(output,prefix+'-lab.png'),fullPage:true});
      await page.locator('[data-tab="journal"]').click();
      const before=await page.evaluate(()=>AshboundDiagnostics.choices);
      await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schema":"bad"}')});
      await page.waitForFunction(()=>!document.getElementById('toast').hidden);assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),before);
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
      await download.saveAs(path.join(output,prefix+'-save.json'));
      await page.locator('#import').setInputFiles(path.join(output,prefix+'-save.json'));await noOverflow(page);
      await page.locator('[data-tab="world"]').click();await page.waitForFunction(()=>AshboundDiagnostics.scene.frames>3&&AshboundDiagnostics.scene.width>0);
      assert.ok((await pixels(await page.locator('#scene canvas').screenshot())).colors>40);
      assert.deepEqual(errors,[]);reports.push({viewport,canvas:stats,diagnostics:await page.evaluate(()=>AshboundDiagnostics),errors});await context.close();
    }
    const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto(base+'forschung/morrowind-lernwelt/?lang=en');await page.waitForFunction(()=>document.body.dataset.ready==='true');
    await sleep(700);const first=await page.evaluate(()=>AshboundDiagnostics.scene.frames);await sleep(700);assert.equal(await page.evaluate(()=>AshboundDiagnostics.scene.frames),first);
    await page.locator('#zoom-in').click();await sleep(100);assert.ok(await page.evaluate(()=>AshboundDiagnostics.scene.frames)>first);await context.close();
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
      const context=await browser.newContext({viewport}),page=await context.newPage();
      await page.goto(base,{waitUntil:'domcontentloaded'});
      const entry=page.locator('#ashbound-entry');await entry.waitFor();
      const hit=await entry.evaluate(n=>{const r=n.getBoundingClientRect();return {url:n.href,visible:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n};});
      assert.ok(hit.visible,JSON.stringify({viewport,hit}));assert.match(hit.url,/forschung\/morrowind-lernwelt\//);
      await page.screenshot({path:path.join(output,`home-${viewport.width}.png`),fullPage:false});
      await entry.click();await page.waitForURL(/forschung\/morrowind-lernwelt/);
      await page.waitForFunction(()=>document.body.dataset.ready==='true');
      homeEntries.push({viewport,status:'PASS'});await context.close();
    }
    fs.writeFileSync(path.join(output,'QA.json'),JSON.stringify({base,recordedAt:new Date().toISOString(),renderer:'Chromium ANGLE software',reports,homeEntries,reducedMotion:'PASS'},null,2));
    console.log(JSON.stringify({status:'PASS',base,viewports:reports.length,output},null,2));
  }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
