const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.CODEX_NODE_PACKAGES,'playwright'));
const root=path.resolve(__dirname,'../..'),output=path.join(root,'.local-qa/ashbound-failure');
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
const server=http.createServer((req,res)=>{
  try{
    let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
});
const results=[];
async function main(){
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.ASHBOUND_LIVE_BASE ? new URL('forschung/morrowind-lernwelt/',process.env.ASHBOUND_LIVE_BASE).href : `http://127.0.0.1:${server.address().port}/forschung/morrowind-lernwelt/`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.ASHBOUND_CHROME,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  async function check(name,run,setup){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{if(setup)await setup(context,page);await run(page);assert.deepEqual(errors,[]);results.push({name,status:'PASS'});}
    catch(error){results.push({name,status:'FAIL',message:error.message,errors});throw error;}
    finally{await context.close();}
  }
  const ready=page=>page.waitForFunction(()=>document.body.dataset.ready==='true');
  try{
    await check('story transport failure and retry',async page=>{
      let fail=true;
      await page.route('**/story.*.json',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
      await page.goto(base+'?lang=de#story',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.body.dataset.ready==='error');
      assert.equal(await page.locator('#undo').isDisabled(),true);
      await page.locator('#language').click();assert.match(await page.locator('#story-content').textContent(),/could not be loaded/);
      await page.screenshot({path:path.join(output,'story-retry-mobile.png'),fullPage:true});
      fail=false;await page.locator('#story-retry').click();await ready(page);
      await page.locator('.choices button').first().click();assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);
    });
    await check('pending story controls',async page=>{
      let release;const gate=new Promise(resolve=>{release=resolve;});
      await page.route('**/story.*.json',async route=>{await gate;await route.continue();});
      try{
        await page.goto(base+'?lang=en#story',{waitUntil:'domcontentloaded'});
        await page.locator('[data-tab="journal"]').waitFor();
        assert.equal(await page.locator('#undo').isDisabled(),true);
        await page.locator('#undo').dispatchEvent('click');await page.locator('[data-tab="journal"]').click();
      }finally{release();}
      await ready(page);
    });
    await check('malformed story is retryable',async page=>{
      let fail=true;await page.route('**/story.en.json',route=>fail?route.fulfill({status:200,contentType:'application/json',body:'{}'}):route.continue());
      await page.goto(base+'?lang=de#story');await page.waitForFunction(()=>document.body.dataset.ready==='error');
      fail=false;await page.locator('#story-retry').click();await ready(page);await page.locator('#language').click();assert.equal(await page.locator('.choices button').count(),2);
    });
    await check('unreachable local save preserved',async page=>{
      await page.goto(base+'?lang=en#journal');await ready(page);
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[]);
      const original=await page.evaluate(()=>localStorage.getItem('test-original'));
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#recovery-export').click()]);
      const file=path.join(output,'rejected-original.json');await download.saveAs(file);assert.equal(fs.readFileSync(file,'utf8'),original);
      assert.ok(await page.evaluate(raw=>Object.keys(localStorage).some(k=>k.startsWith('ashbound-recovery-')&&localStorage.getItem(k)===raw),original));
      await page.locator('[data-tab="story"]').click();await page.locator('.choices button').first().click();
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ashbound-save-v1')).choices),[0]);
    },async context=>context.addInitScript(()=>{
      const raw=JSON.stringify({schema:'halveth.ashbound.save.v1',version:'1.0.0',choices:[2,2,2,2,2],region:'haven',party:['scarlet'],books:[]});
      localStorage.setItem('ashbound-save-v1',raw);localStorage.setItem('test-original',raw);
    }));
    await check('storage unavailable and WebGL absent',async page=>{
      await page.goto(base+'?lang=en');await ready(page);
      assert.match(await page.locator('#scene-status').textContent(),/unavailable/);assert.equal(await page.locator('#zoom-in').isDisabled(),true);
      await page.locator('#enter-story').click();await page.locator('.choices button').first().click();
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);
      assert.match(await page.locator('#toast').textContent(),/Storage is unavailable/);
    },async context=>context.addInitScript(()=>{
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:get.call(this,type,...args);};
      Storage.prototype.getItem=function(){throw new DOMException('disabled','SecurityError');};
      Storage.prototype.setItem=function(){throw new DOMException('disabled','SecurityError');};
    }));
    await check('failed recovery backup cannot overwrite original',async page=>{
      await page.goto(base+'?lang=en#journal');await ready(page);
      assert.match(await page.locator('#recovery-message').textContent(),/not being saved/);
      await page.locator('[data-tab="story"]').click();await page.locator('.choices button').first().click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('ashbound-save-v1')),'{broken');
    },async context=>context.addInitScript(()=>{
      localStorage.setItem('ashbound-save-v1','{broken');const set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(k.startsWith('ashbound-recovery-'))throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};
    }));
    await check('WebGL loss and restoration retain journey',async page=>{
      await page.goto(base+'?lang=en#story');await ready(page);await page.locator('.choices button').first().click();
      await page.locator('[data-tab="world"]').click();await page.waitForFunction(()=>AshboundDiagnostics.scene.frames>1);
      await page.evaluate(()=>{
        window.testPageMarker='same-document';
        window.testGlLoss=document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context');
        if(!window.testGlLoss)throw new Error('Context-loss test extension unavailable');
        window.testGlLoss.loseContext();
      });
      await page.waitForFunction(()=>!document.getElementById('scene-status').hidden);
      await page.locator('#language').click();assert.match(await page.locator('#scene-status').textContent(),/nicht verfuegbar/);
      await page.evaluate(()=>window.testGlLoss.restoreContext());
      await page.waitForFunction(()=>document.getElementById('scene-status').hidden);
      assert.equal(await page.evaluate(()=>window.testPageMarker),'same-document');
      assert.deepEqual(await page.evaluate(()=>AshboundDiagnostics.choices),[0]);assert.equal(await page.locator('#zoom-in').isDisabled(),false);
    });
    await check('animation restart has one pending frame',async page=>{
      await page.goto(base+'?lang=en#lab');await ready(page);
      const measured=await page.evaluate(()=>{
        const ids=new Set(),request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame;
        window.requestAnimationFrame=callback=>{const id=request(t=>{ids.delete(id);callback(t);});ids.add(id);return id;};
        window.cancelAnimationFrame=id=>{ids.delete(id);cancel(id);};
        document.querySelector('[data-mode="stop"]').click();
        for(let i=0;i<12;i++){document.getElementById('fall-run').click();document.querySelector('[data-mode="restore"]').click();}
        document.getElementById('fall-run').click();return ids.size;
      });
      assert.equal(measured,1);
      await page.locator('[data-tab="story"]').click();const before=await page.locator('#fall-status').textContent();
      await page.waitForTimeout(200);assert.equal(await page.locator('#fall-status').textContent(),before);
    });
  }finally{
    await browser.close();server.close();
    fs.writeFileSync(path.join(output,'FAILURE_QA.json'),JSON.stringify({recordedAt:new Date().toISOString(),base,results},null,2));
  }
  console.log(JSON.stringify({status:'PASS',cases:results.length,base,output}));
}
main().catch(error=>{server.close();console.error(error);process.exitCode=1;});
