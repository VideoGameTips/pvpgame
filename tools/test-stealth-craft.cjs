const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='warning'&&/\[(bespoke|upgrade|model skin|mech|gimmick)\]/.test(m.text()))errors.push(m.text());});
    await page.goto(process.env.PVE_URL||'http://localhost:4179/',{waitUntil:'load'});
    await page.waitForFunction(()=>typeof myId!=='undefined'&&players[myId]&&window.PVE_STEALTH);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;requestPointerLockSafe=()=>{};});await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      activateMap('warehouse');const G=MAP_GROUPS.warehouse,cols=MAP_COLLIDERS.warehouse;
      const fail=m=>{throw Error(m);};
      if(!G.userData.authoredWarehouse||!G.userData.warehouseDetail)fail('No authored warehouse');
      const footprint=G.userData.footprint,area=footprint.rects.reduce((a,r)=>a+(r.x1-r.x0)*(r.z1-r.z0),0);
      if(area/(136*136)>.8)fail('Warehouse still square');
      const samples=r=>Array.from({length:25},(_,i)=>new THREE.Vector3(r.x0+(r.x1-r.x0)*(i%5)/4,1.65,r.z0+(r.z1-r.z0)*Math.floor(i/5)/4));
      const a=samples(MAP_SPAWNS.warehouse.ally),b=samples(MAP_SPAWNS.warehouse.enemy);
      for(const p of [...a,...b])if(!floorExistsAt(p.x,p.z)||cols.some(c=>c.containsPoint(p)))fail('Bad warehouse spawn');
      for(const p of a)for(const q of b){const dir=q.clone().sub(p),d=dir.length(),ray=new THREE.Ray(p,dir.normalize());
        if(!cols.some(c=>{const h=ray.intersectBox(c,new THREE.Vector3());return h&&h.distanceTo(p)<d;}))fail('Spawn sight line');}
      if(g_gimDbg.warehouse?.pts?.length!==4)fail('Crane has no valid authored targets');
      // A one-metre grid, expanded by body radius, catches visually clear but impassable aisles.
      const W=136,H=136,walk=new Uint8Array(W*H),index=(x,z)=>Math.floor(z+68)*W+Math.floor(x+68);
      for(let j=0;j<H;j++)for(let i=0;i<W;i++){
        const x=i-67.5,z=j-67.5;walk[j*W+i]=floorExistsAt(x,z)&&!cols.some(c=>c.max.y>.3&&c.min.y<2&&x>c.min.x-.45&&x<c.max.x+.45&&z>c.min.z-.45&&z<c.max.z+.45);
      }
      const queue=[index(0,59)],seen=new Set(queue);
      for(let k=0;k<queue.length;k++){
        const v=queue[k],x=v%W,z=Math.floor(v/W);
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const xx=x+dx,zz=z+dz,n=zz*W+xx;
          if(xx>=0&&xx<W&&zz>=0&&zz<H&&walk[n]&&!seen.has(n)){seen.add(n);queue.push(n);}
        }
      }
      for(const [x,z] of [[0,-59],[52,0],[-52,0],[0,8],[20,0],[-20,0]])if(!seen.has(index(x,z)))fail('Warehouse route blocked '+[x,z]);
      const nav=_botNavGrid();
      for(let j=0;j<nav.H;j++)for(let i=0;i<nav.W;i++)if(!floorExistsAt(nav.x0+(i+.5)*nav.cell,nav.z0+(j+.5)*nav.cell)&&!nav.blocked[j*nav.W+i])fail('Bot routes into cutaway');
      gameStarted=true;inLobby=false;isDead=false;match=null;countdownActive=false;
      for(const [x,s] of [[-16,1],[16,-1]]){
        camera.position.set(x,1.65,s*27);euler.set(0,s>0?0:Math.PI,0);camera.quaternion.setFromEuler(euler);window._crouchEye=1.65;playerYVel=0;slamState=null;keys.KeyW=true;
        let peak=0;try{for(let i=0;i<500;i++){updateMovement(1/60);peak=Math.max(peak,playerFeetY());if(s*camera.position.z<12)break;}}finally{keys.KeyW=false;}
        if(peak<4.5||s*camera.position.z>12)fail('Blocked office stairs '+JSON.stringify({x,s,peak,pos:camera.position.toArray()}));
      }
      const count=cols.length;activateMap('warehouse');if(count!==cols.length)fail('Duplicated map');
      activateMap('refinery');const fittings=MAP_GROUPS.refinery.userData.refineryPrecision;
      if(!fittings||fittings.tanks<2||fittings.columns<2)fail('Refinery fittings missing '+JSON.stringify(fittings));
      return {warehouseArea:area,spawnRaysBlocked:625,connectedCells:seen.size,stairs:2,craneTargets:4,refinery:fittings};
    }));
    console.log(await page.evaluate(()=>{
      const skins=MODEL_SKINS.filter(s=>s.series==='stealth');if(skins.length!==3)throw Error('Missing Stealth skins');
      const results=[];
      for(const skin of skins){
        const stats=WEAPONS.find(w=>w.id===skin.weapon),before=JSON.stringify(stats);setModelSkin(skin.weapon,skin.id);finishEquip();
        const g=weaponModels[WEAPONS.indexOf(stats)];if(!g._stealth||!g._rackReload||!g._mech?.mag)throw Error('Missing skin mechanics '+skin.id);
        let metal=0,optics=0,suppressors=0;
        g.traverse(o=>{if(o.userData.weaponOptic)optics++;if(o.userData.stealthSuppressor)suppressors++;
          const mats=Array.isArray(o.material)?o.material:[o.material];metal+=mats.filter(m=>m?.metalness>=.85).length;
        });
        if(metal<15||!optics||suppressors!==1)throw Error('Incomplete spy hardware '+skin.id);
        const events=RELOAD_PROPS[skin.weapon],timing=magazineRackTiming(g,stats,events),action=g._mech.knob||g._mech.slide;
        if(!timing||!action)throw Error('Missing Stealth rack '+skin.id);
        const home=action.home?.z??action.z0;
        updateGunMech(g,skin.weapon,timing.peak,events,3000);
        if(action.g.position.z-home<.03)throw Error('Stealth action does not rack '+skin.id);
        updateGunMech(g,skin.weapon,null,events,3000);
        if(Math.abs(action.g.position.z-home)>.0001)throw Error('Stealth action does not reset '+skin.id);
        g._flash.visible=true;g._tick(.016,1,false);if(g._stealth.spring.scale.z>=1)throw Error('Spring does not work');g._flash.visible=false;g._calm();
        if(g._stealth.spring.scale.z!==1||JSON.stringify(stats)!==before)throw Error('Skin changes stats or fails reset');
        results.push({skin:skin.id,metalMeshes:metal,optics,mechanical:true});
      }
      registerMap('stealth_laser_test');const K=_bkit('stealth_laser_test');K.ground(40,40,0x535e5f);K.box(0,0,-6,10,5,1,0x718181);activateMap('stealth_laser_test');
      currentWeaponIdx=WEAPONS.findIndex(w=>w.id==='pistol');currentWeapon=WEAPONS[currentWeaponIdx];activeSlot='secondary';
      weaponModels.forEach(m=>m.visible=false);const g=weaponModels[currentWeaponIdx];g.visible=true;g._inspectMode=false;
      camera.position.set(0,1.65,0);euler.set(0,0,0);camera.quaternion.setFromEuler(euler);gameStarted=true;inLobby=false;isDead=false;reloading=false;_equip=null;
      PVE_STEALTH.update(g,true);const laser=PVE_STEALTH.laser;
      if(!laser?.visible)throw Error('Laser invisible');const line=laser.children[0],end=new THREE.Vector3().fromBufferAttribute(line.geometry.attributes.position,1);
      if(end.z< -5.51||end.z> -5.3)throw Error('Laser passes wall '+end.z);
      for(let i=0;i<25;i++)PVE_STEALTH.update(g,true);if(PVE_STEALTH.laser!==laser)throw Error('Laser leaks rigs');
      g._inspectMode=true;PVE_STEALTH.update(g,true);if(laser.visible)throw Error('Laser persists in inspect');g._inspectMode=false;
      PVE_STEALTH.update(g,false);if(laser.visible)throw Error('Laser persists in alternate camera');
      currentWeapon=WEAPONS.find(w=>w.id==='srx');drawScope();
      const c=document.getElementById('scope-canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let red=0;
      for(let i=0;i<p.length;i+=4)if(p[i]>180&&p[i+1]<130&&p[i+2]<150)red++;
      if(red<100)throw Error('No spy reticle');
      return {skins:results,laserWallStop:end.z,spyReticlePixels:red};
    }));
    for(const v of [{name:'warehouse',w:1280,h:900,map:true},{name:'warehouse-mobile',w:390,h:844,map:true},
      {name:'refinery',w:1280,h:900,map:true,mapId:'refinery'},
      {name:'cipher',w:1280,h:800,weapon:'pistol'},{name:'ghostline',w:1280,h:800,weapon:'ak20'},{name:'longwatch',w:1280,h:800,weapon:'srx'},
      {name:'cipher-mobile',w:390,h:844,weapon:'pistol'}]){
      await page.setViewportSize({width:v.w,height:v.h});
      const out=await page.evaluate(v=>{
        const S=new THREE.Scene();S.background=new THREE.Color(0x243331);S.add(new THREE.HemisphereLight(0xe4f4f5,0x4f514a,1.9));
        const sun=new THREE.DirectionalLight(0xffedd2,2.8);sun.position.set(-2,4,5);S.add(sun);
        let c;
        if(v.map){
          activateMap(v.mapId||'warehouse');const g=MAP_GROUPS[v.mapId||'warehouse'].clone(true);g.visible=true;S.add(g);
          c=new THREE.PerspectiveCamera(48,v.w/v.h,.1,1000);c.position.set(115,130,150);c.lookAt(0,0,0);
          if(v.w<500){c.position.set(95,170,190);c.lookAt(0,0,0);}
          if(v.mapId==='refinery'){c.position.set(190,200,220);c.lookAt(0,0,0);}
        }else{
          const skin=MODEL_SKINS.find(s=>s.weapon===v.weapon&&s.series==='stealth'),g=skin._model.clone(true);
          g.visible=true;g.position.set(0,0,0);g.rotation.set(0,0,0);g.scale.setScalar(1);
          const hands=[];g.traverse(o=>{if(o.userData.vmHand)hands.push(o);});hands.forEach(o=>o.removeFromParent());S.add(g);
          const b=new THREE.Box3().setFromObject(g),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3());
          const dist=Math.max(size.length()*.95,size.length()/(v.w/v.h)*.72);
          c=new THREE.PerspectiveCamera(45,v.w/v.h,.001,20);c.position.copy(center).add(new THREE.Vector3(dist*.72,dist*.30,dist*.95));c.lookAt(center);
        }
        renderer.setSize(v.w,v.h);renderer.render(S,c);
        const gl=renderer.getContext(),p=new Uint8Array(v.w*v.h*4);gl.readPixels(0,0,v.w,v.h,gl.RGBA,gl.UNSIGNED_BYTE,p);
        const colors=new Set();for(let i=0;i<p.length;i+=400)colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);
        if(colors.size<25)throw Error('Blank render '+v.name);
        const image=renderer.domElement.toDataURL();let preview;
        if(v.map&&v.w>500){renderer.setSize(512,320);c.aspect=512/320;c.updateProjectionMatrix();renderer.render(S,c);preview=renderer.domElement.toDataURL('image/jpeg',.9);}
        return {image,preview,colors:colors.size};
      },v);
      fs.writeFileSync('/tmp/stealth-'+v.name+'.png',Buffer.from(out.image.split(',')[1],'base64'));console.log(v.name,out.colors,'colors');
      if(out.preview&&process.env.UPDATE_PREVIEW)fs.writeFileSync(require('node:path').join(__dirname,'../map-previews/'+(v.mapId||'warehouse')+'.jpg'),Buffer.from(out.preview.split(',')[1],'base64'));
    }
    const play=await browser.newPage({viewport:{width:1280,height:800}});
    play.on('pageerror',e=>errors.push(e.message));
    await play.goto(process.env.PVE_URL||'http://localhost:4179/',{waitUntil:'load'});
    await play.waitForFunction(()=>typeof myId!=='undefined'&&players[myId]);await play.click('#play-btn');
    await play.waitForFunction(()=>inLobby);await play.evaluate(()=>{requestPointerLockSafe=()=>{};openModeMenu();selectMode('range');});
    await play.waitForFunction(()=>gameStarted&&match?.roundActive&&!countdownActive,{},{timeout:20000});
    await play.evaluate(()=>requestAnimationFrame=()=>0);await play.waitForTimeout(100);
    for(const [w,h] of [[1280,800],[390,844]]){
      await play.setViewportSize({width:w,height:h});
      const result=await play.evaluate(({w,h})=>{
        renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const stats=[];
        for(const skin of MODEL_SKINS.filter(s=>s.series==='stealth')){
          setModelSkin(skin.weapon,skin.id);finishEquip();const i=WEAPONS.findIndex(w=>w.id===skin.weapon);
          currentWeaponIdx=i;currentWeapon=WEAPONS[i];activeSlot=currentWeapon.slot;
          weaponModels.forEach(m=>m.visible=false);const g=weaponModels[i];g.visible=true;if(g._homePos)g.position.copy(g._homePos);g.rotation.set(0,0,0);
          weaponAmmo[i]={ammo:5,reserve:100};ammo=5;lastShot=0;equipReadyAt=0;reloading=false;_equip=null;
          const count=localBullets.length;tryShoot();if(localBullets.length<=count)throw Error('Stealth skin cannot fire '+skin.id);
          if(g._flash)g._flash.visible=false;localBullets.forEach(b=>b.mesh&&(b.mesh.visible=false));
          PVE_STEALTH.update(g,true);renderer.render(scene,camera);
          const size=renderer.getDrawingBufferSize(new THREE.Vector2()),gl=renderer.getContext(),a=new Uint8Array(size.x*size.y*4),b=new Uint8Array(a.length);
          gl.readPixels(0,0,size.x,size.y,gl.RGBA,gl.UNSIGNED_BYTE,a);g.visible=false;PVE_STEALTH.update(g,false);renderer.render(scene,camera);gl.readPixels(0,0,size.x,size.y,gl.RGBA,gl.UNSIGNED_BYTE,b);g.visible=true;
          let visible=0;for(let p=0;p<a.length;p+=4)if(Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])>12)visible++;
          if(visible<500)throw Error('Stealth skin not framed '+skin.id+' '+visible);
          PVE_STEALTH.update(g,true);renderer.render(scene,camera);stats.push({skin:skin.id,visible,image:renderer.domElement.toDataURL()});
        }return stats;
      },{w,h});
      for(const r of result){fs.writeFileSync('/tmp/'+r.skin+'-'+w+'.png',Buffer.from(r.image.split(',')[1],'base64'));delete r.image;console.log('In game',w,r);}
    }
    if(errors.length)throw Error(errors.join('\n'));console.log('PASS: authored warehouse, safe routes/stairs, Stealth mechanics/materials, wall-stopped laser, spy scope and desktop/mobile renders');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
