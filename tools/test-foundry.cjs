const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='warning' && m.text().includes('[upgrade]'))errors.push(m.text());});
    await page.goto(process.env.PVE_URL || 'http://localhost:4179/',{waitUntil:'load'});
    await page.waitForFunction(()=>typeof myId!=='undefined' && players[myId]);
    await page.evaluate(()=>{requestAnimationFrame=()=>0;requestPointerLockSafe=()=>{};});
    await page.waitForTimeout(100);
    console.log(await page.evaluate(()=>{
      activateMap('foundry');
      const G=MAP_GROUPS.foundry,F=G.userData.footprint,cols=MAP_COLLIDERS.foundry;
      const fail=m=>{throw Error(m);};
      const area=F.rects.reduce((a,r)=>a+(r.x1-r.x0)*(r.z1-r.z0),0);
      if(area/(160*152)>.75)fail('Footprint too rectangular');
      if(G.children.some(m=>m.geometry?.type==='PlaneGeometry' && m.geometry.parameters.width>=140))fail('Square floor survived');
      const sp=MAP_SPAWNS.foundry;
      const samples=r=>Array.from({length:25},(_,i)=>new THREE.Vector3(r.x0+(r.x1-r.x0)*(i%5)/4,1.65,r.z0+(r.z1-r.z0)*Math.floor(i/5)/4));
      const a=samples(sp.ally),b=samples(sp.enemy);
      for(const p of [...a,...b]){
        if(!floorExistsAt(p.x,p.z) || isBotOutOfBoundsXZ(p.x,p.z))fail('Spawn has no floor');
        if(cols.some(c=>c.containsPoint(p)))fail('Blocked spawn');
      }
      for(const p of a)for(const q of b){
        const dir=q.clone().sub(p),len=dir.length(),ray=new THREE.Ray(p,dir.normalize());
        if(!cols.some(c=>{const h=ray.intersectBox(c,new THREE.Vector3());return h && h.distanceTo(p)<len;}))fail('Spawn-to-spawn sight line');
      }
      // Ground routes use body-radius-expanded collision, not point-sized openings.
      const cell=1,x0=-80,z0=-76,W=160,H=152,walk=new Uint8Array(W*H);
      const hazards=MAP_GIMMICKS.foundry.damageZones;
      for(let j=0;j<H;j++)for(let i=0;i<W;i++){
        const x=x0+i+.5,z=z0+j+.5;
        walk[j*W+i]=floorExistsAt(x,z) && !cols.some(c=>c.max.y>.3 && c.min.y<2 && x>c.min.x-.45 && x<c.max.x+.45 && z>c.min.z-.45 && z<c.max.z+.45)
          && !hazards.some(h=>h.w ? _pointInRotRect(x,z,h,.5) : Math.hypot(x-h.x,z-h.z)<h.r+.5);
      }
      const index=(x,z)=>Math.floor(z-z0)*W+Math.floor(x-x0),start=index(0,64),seen=new Set([start]),queue=[start];
      for(let k=0;k<queue.length;k++){
        const v=queue[k],i=v%W,j=Math.floor(v/W);
        for(const [di,dj] of [[-1,0],[1,0],[0,-1],[0,1]]){
          const ii=i+di,jj=j+dj,n=jj*W+ii;
          if(ii>=0&&ii<W&&jj>=0&&jj<H&&walk[n]&&!seen.has(n)){seen.add(n);queue.push(n);}
        }
      }
      for(const [x,z,label] of [[0,-64,'opponent spawn'],[-60,-20,'scrap loop'],[57,23,'loading loop'],[-19,0,'left furnace lane'],[19,0,'right furnace lane'],[-30,0,'left balcony underpass'],[30,0,'right balcony underpass']]){
        if(!seen.has(index(x,z)))fail('Unreachable '+label);
      }
      const nav=_botNavGrid();let offFloor=0;
      for(let j=0;j<nav.H;j++)for(let i=0;i<nav.W;i++)if(!floorExistsAt(nav.x0+(i+.5)*nav.cell,nav.z0+(j+.5)*nav.cell)){
        if(!nav.blocked[j*nav.W+i])fail('Bot grid routes into cutaway');offFloor++;
      }
      if(G.userData.stairFlights.length!==4 || G.userData.stairFlights.some(s=>s.riser>.191))fail('Balcony stairs invalid');
      gameStarted=true;inLobby=false;isDead=false;match=null;
      for(const x of [-30,30])for(const s of [-1,1]){
        euler.set(0,s>0?0:Math.PI,0);camera.quaternion.setFromEuler(euler);
        camera.position.set(x,1.65,s*41);window._crouchEye=1.65;playerYVel=0;slamState=null;
        keys.KeyW=true;let peak=0;
        try{for(let frame=0;frame<450;frame++){
          updateMovement(1/60);peak=Math.max(peak,playerFeetY());
          if(s*camera.position.z<26)break;
        }}finally{keys.KeyW=false;}
        if(peak<4.5 || s*camera.position.z>26)fail('Controller blocked at balcony '+JSON.stringify({x,s,peak,pos:camera.position.toArray()}));
      }
      const count=cols.length;activateMap('foundry');if(cols.length!==count)fail('Duplicate upgrade');
      return {area,spawnSightLinesBlocked:a.length*b.length,connectedGroundCells:seen.size,offFloor,stairs:4,colliders:count};
    }));
    const views=[
      {name:'overhead',w:1280,h:900,pos:[140,180,150],target:[0,0,0],roofless:true},
      {name:'hall',w:1280,h:800,pos:[-18,2.2,28],target:[0,5,0]},
      {name:'loading',w:1280,h:800,pos:[44,2.5,47],target:[61,7,12]},
      {name:'mobile',w:390,h:844,pos:[-18,2.2,28],target:[0,5,0]},
      {name:'in-game',w:1280,h:800,pos:[-18,2.2,28],target:[0,5,0],real:true},
      {name:'preview',w:512,h:320,pos:[150,220,180],target:[0,0,0]},
    ];
    for(const view of views){
      await page.setViewportSize({width:view.w,height:view.h});
      const data=await page.evaluate(v=>{
        const S=new THREE.Scene();S.background=new THREE.Color(0x697a80);
        const G=MAP_GROUPS.foundry.clone(true);G.visible=true;S.add(G);
        if(v.roofless)for(const m of G.children.slice()){
          const b=new THREE.Box3().setFromObject(m);
          if(m.userData.foundryRoof || b.min.y>=9.9 && b.max.y-b.min.y<1)G.remove(m);
        }
        S.add(new THREE.HemisphereLight(0xd5edff,0x66574b,1.35));
        const sun=new THREE.DirectionalLight(0xffe3bc,1.7);sun.position.set(-45,100,35);S.add(sun);
        const camera=v.name==='preview'
          ? new THREE.OrthographicCamera(-128,128,80,-80,.1,1000)
          : new THREE.PerspectiveCamera(v.roofless?48:75,v.w/v.h,.1,1000);
        camera.position.set(...v.pos);camera.lookAt(...v.target);
        renderer.setSize(v.w,v.h);renderer.render(v.real?scene:S,camera);
        const gl=renderer.getContext(),p=new Uint8Array(v.w*v.h*4);gl.readPixels(0,0,v.w,v.h,gl.RGBA,gl.UNSIGNED_BYTE,p);
        const colors=new Set();for(let i=0;i<p.length;i+=400)colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);
        if(colors.size<30)throw Error('Blank render: '+v.name);
        return {url:renderer.domElement.toDataURL(),jpg:renderer.domElement.toDataURL('image/jpeg',.9),colors:colors.size};
      },view);
      fs.writeFileSync('/tmp/foundry-'+view.name+'.png',Buffer.from(data.url.split(',')[1],'base64'));
      if(view.name==='preview' && process.env.UPDATE_PREVIEW){
        fs.writeFileSync(require('node:path').join(__dirname,'../map-previews/foundry.jpg'),Buffer.from(data.jpg.split(',')[1],'base64'));
      }
      console.log(view.name,data.colors,'colors');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: Foundry footprint, spawn safety, routes, navigation, stairs, idempotency and desktop/mobile renders');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
