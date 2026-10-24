/* Foundry's authored floor union is shared by the renderer, collision and bot navigation. */
(function () {
  'use strict';
  window.buildAuthoredFoundry = function () {
    const name = 'foundry', K = _bkBegin(name, 160, 152, 0x454b4b), G = MAP_GROUPS[name];
    G.userData.authoredFoundry = true;
    const C = { steel: 0x52616a, dark: 0x252c30, concrete: 0x777c79, rust: 0x98533d,
      yellow: 0xe8ba4b, trim: 0xabb7b6, floor: 0x505956, brick: 0x61483e };
    const solidBox=K.box;
    K.box=(x,y,z,w,h,d,c,rot)=>{
      const m=solidBox(x,y,z,w,h,d,c,rot);
      m.userData.mapSurface=[C.concrete,C.floor,C.brick].includes(c)?'concrete':'metal';
      m.castShadow=true;m.receiveShadow=true;
      return m;
    };
    const rects = [
      {x0:-38,x1:38,z0:-34,z1:34},
      {x0:-50,x1:38,z0:-76,z1:-30},
      {x0:-38,x1:50,z0:30,z1:76},
      {x0:34,x1:80,z0:-14,z1:52},
      {x0:-78,x1:-34,z0:-54,z1:14},
    ];
    const {cells,edges} = PVE_MAP_CRAFT.cellsFor(rects);
    // Retire the square sheet completely; off-map corners must not look walkable.
    for (const m of G.children.slice()) if (m.geometry?.type === 'PlaneGeometry') {
      G.remove(m); m.geometry.dispose(); m.material.dispose();
    }
    for (const r of cells) K.slab(r.x0,r.x1,r.z0,r.z1,0,2,C.floor);
    MAP_VOID[name] = {halfX:80,halfZ:76,rects:cells,killY:-12,far:40};
    MAP_BOT_BOUNDS[name] = {halfX:80,halfZ:76};
    G.userData.footprint = {kind:'casting works',rects:cells,edges,wings:4};
    const detail = _thBuf(), glow = _thBuf();
    const box = (x,y,z,w,h,d,c) => _thBox(detail,_TH_WORLD,x,y,z,w,h,d,c);
    const lit = (x,y,z,w,h,d,c) => _thBox(glow,_TH_WORLD,x,y,z,w,h,d,c);
    const sign = (text,x,y,z,w,h,side) => {
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#242c30';ctx.fillRect(0,0,512,128);
      ctx.fillStyle='#e8ba4b';ctx.fillRect(0,0,12,128);ctx.fillRect(500,0,12,128);
      ctx.font='bold 44px sans-serif';ctx.fillStyle='#e5e7de';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,455);
      const texture=new THREE.CanvasTexture(canvas);texture.anisotropy=4;
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map:texture}));
      mesh.position.set(x,y,z);mesh.rotation.y=side<0?Math.PI:0;mesh.userData.mapStatic=true;G.add(mesh);
    };
    const strut = (a,b,t,c) => {
      const v = new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),len=v.length();
      const geo=new THREE.BoxGeometry(t,len,t),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
      const g=geo.toNonIndexed(),p=g.attributes.position,n=g.attributes.normal,col=new THREE.Color(c);
      for(let i=0;i<p.count;i++){detail.p.push(p.getX(i),p.getY(i),p.getZ(i));detail.n.push(n.getX(i),n.getY(i),n.getZ(i));detail.c.push(col.r,col.g,col.b);}
      geo.dispose();g.dispose();
    };
    const stripes = (x,y,z,w) => {
      box(x,y,z,w,.55,.035,C.dark);
      for(let u=-w/2+.3;u<w/2-.1;u+=.7)box(x+u,y,z+.025,.3,.5,.035,C.yellow);
    };
    // Stepped retaining walls follow the real silhouette, with expansion joints and coping.
    for(const [x0,z0,x1,z1] of edges){
      const horizontal=z0===z1,L=Math.hypot(x1-x0,z1-z0),n=Math.ceil(L/8);
      for(let i=0;i<n;i++){
        const x=x0+(x1-x0)*(i+.5)/n,z=z0+(z1-z0)*(i+.5)/n,w=horizontal?L/n:1.2,d=horizontal?1.2:L/n;
        K.box(x,0,z,w,10,d,C.concrete);
        box(x,1.1,z,w+.08,2.2,d+.08,C.dark);
        box(x,10.1,z,w+.24,.2,d+.24,C.trim);
        box(x,5,z,horizontal?.14:1.28,9.8,horizontal?1.28:.14,C.steel);
      }
    }
    // Dogleg spawn exits: neither team can see directly into the other spawn.
    for(const s of [-1,1]){
      K.box(s*10,0,s*52,42,8,1.4,C.brick);
      box(s*10,8.15,s*52,43,.3,1.7,C.dark);
      for(let x=-18;x<=18;x+=3)box(s*10+x,3,s*52,1.9,.12,1.46,C.rust);
      K.box(s*37,0,s*62,12,3,8,C.steel);
      for(let z=58;z<69;z+=2)box(s*1,.025,s*z,1.2,.035,.55,C.yellow);
      K.poi('spawn exit',-s*20,s*52,0);
      sign(s>0?'SOUTH DISPATCH':'NORTH DISPATCH',s*10,5,s*52.73,10,1.6,s);
    }
    // Casting hall: side bays are roofed; a raised central monitor admits daylight.
    const doors=[K.door(-30,7,7.8),K.door(0,10,6),K.door(30,7,7.8)];
    K.room(-38,38,-34,34,0,10,C.brick,{n:doors,s:doors,w:[K.door(-20,7,6),K.door(0,8,6),K.door(20,7,6)],e:[K.door(-20,7,6),K.door(0,8,6),K.door(20,7,6)]},1);
    for(const x of [-30,30])K.slab(x-8,x+8,-34,34,10.4,.4,C.dark).userData.foundryRoof=true;
    K.slab(-20,20,-34,34,14,.3,C.steel).userData.foundryRoof=true;
    for(const z of [-30,-15,0,15,30]){
      for(const x of [-36.7,36.7]){
        K.box(x,0,z,.65,10,.65,C.steel);
        box(x,.2,z,1.4,.4,1.4,C.dark);
        strut([x,7.6,z],[Math.sign(x)*27,10,z],.22,C.trim);
      }
      box(0,10.6,z,75,.45,.4,C.steel);
      strut([-20,10.6,z],[0,13.6,z],.22,C.trim);
      strut([0,13.6,z],[20,10.6,z],.22,C.trim);
      for(const x of [-20,20]){box(x,12,z,.22,3,.22,C.trim);lit(x,11.7,z,.12,1.7,9,0x96c7d3);}
    }
    // Central furnace is real sight-line cover, not a decorative block on the perimeter.
    K.box(0,0,0,12,12,16,C.brick);
    K.box(0,12,0,15,1.4,19,C.dark);
    K.box(0,13.4,0,7,13,8,C.steel);
    for(const s of [-1,1]){
      box(0,3.3,s*8.08,9,5,.18,C.dark);
      lit(0,3.1,s*8.19,7.4,3.5,.04,0xff6a19);
      lit(0,2.4,s*8.22,5.8,1.5,.045,0xffce67);
      for(const x of [-3,-1.5,0,1.5,3])box(x,3.2,s*8.3,.18,4,.18,C.steel);
      box(0,1.1,s*8.5,10,.5,1,C.dark);
      stripes(0,6.5,s*8.25,10);
      for(let y=.5;y<12;y+=.65){
        box(0,y,s*8.025,11.9,.035,.04,0x382e29);
        for(let x=-5.5+(Math.round(y/.65)%2)*.8;x<6;x+=1.6)box(x,y+.3,s*8.03,.025,.6,.04,0x382e29);
      }
      K.lavaRect(s*10,0,2,19,45,0xff751a);
      for(const x of [s*8.7,s*11.3])K.box(x,0,0,.35,.55,20,C.dark);
      for(const z of [-10,10])K.box(s*10,0,z,3,.55,.35,C.dark);
    }
    // Opposing balconies have two approaches apiece, with landings clear of doors.
    for(const x of [-30,30]){
      K.slab(x-2.5,x+2.5,-28,28,4.6,.35,C.steel);
      for(const s of [-1,1])K.stairs(x,s*39.5,s>0?'N':'S',4.6,4,C.steel,0,1,4.6/12);
      for(const side of [-1,1]){
        const xx=x+side*2.4;
        box(xx,5.65,0,.12,.12,55,C.yellow);
        box(xx,5.1,0,.08,.08,55,C.trim);
        for(let z=-27;z<=27;z+=4.5)box(xx,5.12,z,.09,1.05,.09,C.trim);
      }
      for(const z of [-24,-8,8,24]){
        K.box(x,0,z,.55,4.25,.55,C.steel);
        lit(x,4.1,z,2,.07,.45,0xffc67c);
      }
      K.poi('casting balcony',x,0,4.6);
    }
    // Offset loading apron: ribbed shipping crates, stacked billets and a supported gantry crane.
    const cargo=(x,z,w,d,h,col)=>{
      K.box(x,0,z,w,h,d,col);
      box(x,h+.1,z,w+.15,.2,d+.15,C.dark);
      for(let u=-w/2+.35;u<w/2;u+=.7){box(x+u,h/2,z+d/2+.035,.085,h-.25,.08,C.trim);box(x+u,h/2,z-d/2-.035,.085,h-.25,.08,C.trim);}
      for(const s of [-1,1]){box(x+s*w*.22,h/2,z+d/2+.1,.08,h-.3,.08,C.dark);box(x+s*w*.22,h*.48,z+d/2+.18,.3,.08,.1,C.yellow);}
    };
    cargo(61,9,13,5,3.6,C.rust);cargo(64,36,12,5,3.6,C.steel);
    cargo(-61,-31,12,5,3.6,C.steel);cargo(-59,-5,10,5,2.4,C.rust);
    for(const x of [43,74])for(const z of [0,42]){
      K.box(x,0,z,.85,12,.85,C.yellow);box(x,.2,z,2,.4,2,C.dark);
      strut([x,8,z],[x,z===0?11:11,z+(z===0?3:-3)],.25,C.steel);
    }
    for(const x of [43,74])box(x,12,21,.8,.8,46,C.yellow);
    box(58.5,12.6,20,32,.9,1.1,C.yellow);box(58.5,11.8,20,3,1.1,3,C.dark);
    for(const x of [58.2,58.8])box(x,9.6,20,.07,4,.07,C.trim);
    box(58.5,7.5,20,1.6,.4,.5,C.dark);
    for(const [x,z] of [[49,26],[-48,-20],[-65,-44],[41,62],[-39,-63]]){
      K.box(x,0,z,7,1.6,3,C.dark);
      for(let row=0;row<3;row++)for(let i=0;i<6-row;i++)box(x+(i-(5-row)/2)*.85,1.9+row*.55,z,.75,.5,2.9,C.trim);
    }
    // Embedded rails, drains and slab joints stay non-colliding so detail never catches a foot.
    for(const x of [51.5,54.5])box(x,.027,18,.1,.05,60,C.trim);
    for(let z=-10;z<=46;z+=2)box(53,.018,z,4,.03,.22,C.dark);
    for(const [x,z,d] of [[-43,-20,48],[43,20,48],[-19,-57,24],[19,57,24]]){
      box(x,.018,z,.65,.03,d,C.dark);
      for(let u=-d/2;u<d/2;u+=.55)box(x,.042,z+u,.6,.025,.1,C.trim);
    }
    for(const r of cells)for(let z=r.z0+4;z<r.z1;z+=6)box((r.x0+r.x1)/2,.012,z,r.x1-r.x0,.02,.035,0x353f3e);
    for(const [x,z] of [[-17,-43],[17,43],[-42,-8],[43,8]]){
      box(x,.028,z,9,.035,.14,C.yellow);
      for(let u=-4;u<=4;u+=2)box(x+u,.028,z+1,.5,.035,1,C.yellow);
    }
    for(const s of [-1,1]){
      // Soot collects above furnace mouths; expansion panels and vents stay attached to the casing.
      box(0,9.5,s*8.045,8.6,2.7,.045,0x3b3330);
      for(const x of [-4.6,4.6])for(const y of [1,5.7,10.7])box(x,y,s*8.08,.14,.14,.09,C.trim);
      for(let z=-6;z<7;z+=1.2)box(s*6.04,8,z,.06,1.7,.18,C.dark);
      box(s*6.07,7,0,.08,.12,14,C.trim);
      sign('CASTING 01',0,9.5,s*8.08,8,2,s);
      const fire=new THREE.PointLight(0xff963b,1.8,24,2);fire.position.set(0,3,s*10);G.add(fire);
    }
    _thMesh(G,detail,false);G.children.at(-1).userData.mapStatic=true;
    _thMesh(G,glow,true);G.children.at(-1).userData.mapStatic=true;
    G.userData.foundryDetail={yards:2,balconies:2,stairs:4,furnace:true,crane:true};
    K.spawn({x0:-6,x1:22,z0:60,z1:68},{x0:-22,x1:6,z0:-68,z1:-60});
    G._skyColor=0x68777d;
  };
})();
