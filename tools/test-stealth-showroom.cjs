const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const errors=[],url=process.env.PVE_URL||'http://localhost:4179/';
    const start=async(w,h,loginFirst=true)=>{
      const page=await browser.newPage({viewport:{width:w,height:h}});
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>typeof myId!=='undefined'&&players[myId]);
      await page.evaluate(()=>requestPointerLockSafe=()=>{});
      if(loginFirst){
        await page.click('#play-btn');await page.waitForFunction(()=>inLobby);
        await page.evaluate(()=>openModeMenu());await page.click('#stealth-open-btn');
      }else await page.click('#stealth-login-btn');
      await page.waitForSelector('#stealth-panel img');
      await page.waitForFunction(()=>document.querySelector('#stealth-panel img')?.naturalWidth>0);
      return page;
    };
    const page=await start(1280,800,false);
    const ids=['pistol_stealth_cipher','ak20_stealth_ghostline','srx_stealth_longwatch'];
    for(const id of ids){
      await page.click('[data-stealth-skin="'+id+'"]');
      await page.waitForFunction(()=>document.querySelector('#stealth-panel img')?.naturalWidth===640);
      const pixels=await page.evaluate(()=>{
        const img=document.querySelector('#stealth-panel img'),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const c=canvas.getContext('2d');c.drawImage(img,0,0);const data=c.getImageData(0,0,canvas.width,canvas.height).data;
        let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)n++;return n;
      });
      if(pixels<800)throw Error('Empty model preview '+id);
      await page.click('#stealth-panel .st-equip');
      if(await page.locator('#stealth-panel .st-state').innerText()!=='Equipped')throw Error('Equip status missing');
      console.log('Preview and equip',id,pixels,'visible pixels');
    }
    await page.click('[data-stealth-skin="pistol_stealth_cipher"]');
    const first=await page.locator('#stealth-panel img').getAttribute('src');
    await page.locator('#stealth-panel input').fill('70');await page.locator('#stealth-panel input').dispatchEvent('input');
    await page.waitForFunction(src=>document.querySelector('#stealth-panel img').src!==src,first);
    await page.screenshot({path:'/tmp/stealth-showroom-desktop.png'});
    await page.click('#stealth-panel .st-range');
    await page.waitForFunction(()=>match?.roundActive&&!countdownActive&&currentWeapon?.id==='pistol'&&activeSlot==='secondary',{},{timeout:25000});
    console.log(await page.evaluate(()=>({range:true,weapon:currentWeapon.id,skin:_activeModelSkin.pistol?.id,laser:!!weaponModels[currentWeaponIdx]._stealth})));
    await page.reload({waitUntil:'load'});await page.waitForFunction(()=>typeof equippedModelSkins!=='undefined');
    if(!await page.evaluate(()=>equippedModelSkins.pistol==='pistol_stealth_cipher'&&equippedModelSkins.ak20==='ak20_stealth_ghostline'))throw Error('Skins did not persist locally');
    const phone=await start(390,844);
    console.log(await phone.evaluate(()=>{
      const panel=document.querySelector('#stealth-panel'),r=panel.querySelector('.st-window').getBoundingClientRect();
      if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)throw Error('Mobile modal outside screen');
      if(panel.scrollWidth>innerWidth+1)throw Error('Mobile horizontal overflow');
      for(const b of panel.querySelectorAll('button'))if(b.scrollWidth>b.clientWidth+2)throw Error('Button text overflow '+b.textContent);
      return {mobile:true,width:r.width,height:r.height};
    }));
    await phone.screenshot({path:'/tmp/stealth-showroom-mobile.png'});
    await phone.keyboard.press('Escape');if(await phone.locator('#stealth-panel').isVisible())throw Error('Escape does not close collection');
    await phone.click('#weapon-skins-btn');await phone.click('#ws-stealth-open');
    if(!await phone.locator('#stealth-panel').isVisible())throw Error('Gun Skins collection shortcut broken');
    if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS: discoverable local collection, real model previews, rotation, all three equips, persistence, direct secondary range test and mobile layout');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
