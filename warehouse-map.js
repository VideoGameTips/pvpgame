/* An open-air, staggered logistics compound with a central secure office. */
(function(){
  'use strict';
  window.buildAuthoredWarehouse=function(){
    const name='warehouse',K=_bkBegin(name,136,136,0x626969),G=MAP_GROUPS[name];
    G.userData.authoredWarehouse=true;
    const C={floor:0x626969,wall:0x818b89,dark:0x293638,steel:0x647d83,trim:0xb9c5be,yellow:0xe1bd58,wood:0x897453,red:0x97514a};
    const raw=K.box;
    K.box=(x,y,z,w,h,d,c,rot)=>{
      const m=raw(x,y,z,w,h,d,c,rot);m.userData.mapSurface=c===C.wall||c===C.floor?'concrete':c===C.wood?'wood':'metal';
      m.receiveShadow=true;m.castShadow=true;return m;
    };
    const floor=[{x0:-42,x1:42,z0:-40,z1:40},{x0:-54,x1:30,z0:-68,z1:-36},
      {x0:-30,x1:54,z0:36,z1:68},{x0:38,x1:68,z0:-12,z1:42},{x0:-68,x1:-38,z0:-42,z1:12}];
    const {cells,edges}=PVE_MAP_CRAFT.cellsFor(floor);
    for(const m of G.children.slice())if(m.geometry?.type==='PlaneGeometry'){G.remove(m);m.geometry.dispose();m.material.dispose();}
    for(const r of cells)K.slab(r.x0,r.x1,r.z0,r.z1,0,2,C.floor);
    MAP_VOID[name]={halfX:68,halfZ:68,rects:cells,killY:-12,far:40};MAP_BOT_BOUNDS[name]={halfX:68,halfZ:68};
    G.userData.footprint={kind:'secure logistics',rects:cells,edges,wings:4};
    const detail=_thBuf(),glow=_thBuf();
    const box=(x,y,z,w,h,d,c)=>_thBox(detail,_TH_WORLD,x,y,z,w,h,d,c);
    const lit=(x,y,z,w,h,d,c)=>_thBox(glow,_TH_WORLD,x,y,z,w,h,d,c);
    const sign=(text,x,y,z,w,side=1)=>{
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#233638';ctx.fillRect(0,0,512,128);ctx.fillStyle='#9fd9cf';ctx.fillRect(16,20,6,88);
      ctx.font='bold 39px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e2e6d8';ctx.fillText(text,266,66,450);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(canvas)}));
      m.position.set(x,y,z);m.rotation.y=side<0?Math.PI:0;m.userData.mapStatic=true;G.add(m);
    };
    // Tall wall sections follow the cut-in corners, leaving no invisible square floor.
    for(const [x0,z0,x1,z1] of edges){
      const along=z0===z1,n=Math.ceil(Math.hypot(x1-x0,z1-z0)/8),L=Math.hypot(x1-x0,z1-z0)/n;
      for(let i=0;i<n;i++){
        const x=x0+(x1-x0)*(i+.5)/n,z=z0+(z1-z0)*(i+.5)/n,w=along?L:1.2,d=along?1.2:L;
        K.box(x,0,z,w,10,d,C.wall);box(x,.7,z,w+.06,1.4,d+.06,C.dark);box(x,10.08,z,w+.2,.16,d+.2,C.trim);
        box(x,5,z,along?.16:1.3,10,along?1.3:.16,C.steel);
      }
    }
    // Spawn screens force a turn before entering the loading lanes.
    for(const s of [-1,1]){
      K.box(s*6,0,s*44,42,8,1.3,C.wall);box(s*6,8.08,s*44,42.4,.16,1.5,C.dark);
      sign(s>0?'DISPATCH SOUTH':'RECEIVING NORTH',s*6,5,s*44.67,12,s);
      for(let x=-12;x<=12;x+=6){box(s*6+x,2,s*44.68,2,.08,.03,C.yellow);}
      for(let z=51;z<=63;z+=3)box(-s*20,.018,s*z,.18,.025,1.8,C.yellow);
      K.poi('screen exit',-s*23,s*44,0);
    }
    // Secure records office: doors on every side, internal dogleg and usable roof.
    K.room(-10,10,-14,14,0,4.2,C.wall,{n:[K.door(-5,4,3.5)],s:[K.door(5,4,3.5)],
      w:[K.door(-7,4,3.5),K.door(7,4,3.5)],e:[K.door(-7,4,3.5),K.door(7,4,3.5)]},.7);
    K.wx(-9.3,9.3,0,.5,0,3.4,C.steel,[K.door(5,3.8,3.4)]);
    K.slab(-18,18,-14,14,4.6,.4,C.steel);
    for(const x of [-16,16]){
      K.stairs(x,x<0?25.5:-25.5,x<0?'N':'S',4.6,3.5,C.steel,0,1,4.6/12);
      for(const z of [-10,10])K.box(x,0,z,.55,4.2,.55,C.steel);
    }
    for(const z of [-13.7,13.7])K.wx(-18,18,z,.25,4.6,1.05,C.dark,[K.door(-16,4,3),K.door(16,4,3)]);
    for(const x of [-17.7,17.7])K.wz(-14,14,x,.25,4.6,1.05,C.dark);
    K.box(0,4.6,0,6,1.3,2.4,C.dark);K.poi('office roof',0,5,4.6);
    for(const s of [-1,1]){
      sign('RESTRICTED RECORDS',0,3.3,s*14.38,7,s);
      box(0,1.1,s*14.39,19,.08,.04,C.dark);
      lit(s*5,3.65,s*14.47,2.2,.08,.2,0xb9eddf);
    }
    // Screens, file cabinets and a desk sit against walls, not across the walking route.
    K.box(-6,0,-8,4,.9,1.7,C.wood);box(-6,1.35,-8.5,1.6,.9,.13,C.dark);
    lit(-6,1.35,-8.42,1.38,.7,.025,0x86bdb1);box(-6,1.03,-7.8,1.5,.06,.38,C.dark);
    for(const z of [5,8,11]){
      K.box(-8.1,0,z,1.7,2.5,2.1,C.steel);
      for(let y=.35;y<2.4;y+=.55){box(-7.23,y,z,.035,.025,1.9,C.dark);box(-7.19,y+.17,z,.06,.08,.5,C.trim);}
    }
    // Storage racks are backed cover, with attached shelf lips, cartons and numbered end caps.
    for(const x of [-28,28])for(const z of [-24,24]){
      K.box(x,0,z,6,4.4,12,C.dark);
      for(const dx of [-3,3])for(const dz of [-5.8,5.8])box(x+dx,2.2,z+dz,.18,4.4,.18,C.steel);
      for(const y of [.3,1.8,3.3]){
        box(x,y,z,6.3,.16,12.3,C.steel);
        for(const dz of [-4,0,4])for(const dx of [-1.5,1.5]){
          box(x+dx,y+.57,z+dz,2.6,1,3.5,C.wood);box(x+dx,y+.58,z+dz+1.77,.5,.3,.025,C.trim);
        }
      }
      for(const s of [-1,1]){box(x,2,z+s*6.16,5,.65,.03,C.yellow);for(let i=-2;i<=2;i++)box(x+i*.7,2,z+s*6.19,.3,.4,.02,C.dark);}
    }
    // Two offset service yards: cargo hardware and a parked forklift form purposeful cover.
    const cargo=(x,z,col)=>{
      K.box(x,0,z,12,3.4,5,col);box(x,3.5,z,12.2,.2,5.2,C.dark);
      for(let u=-5.6;u<5.8;u+=.65)for(const s of [-1,1])box(x+u,1.7,z+s*2.53,.07,3.2,.06,C.trim);
      for(const s of [-1,1]){box(x+s*3,1.7,z+2.6,.09,3,.08,C.dark);box(x+s*3,1.6,z+2.68,.4,.1,.08,C.yellow);}
    };
    cargo(53,17,C.steel);cargo(-53,-17,C.red);cargo(34,56,C.red);cargo(-34,-56,C.steel);
    const fx=52,fz=32;K.box(fx,0,fz,3,2.1,5,C.yellow);
    for(const dx of [-1.6,1.6])for(const dz of [-1.8,1.8]){
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.48,16),new THREE.MeshLambertMaterial({color:0x182225}));
      tire.rotation.z=Math.PI/2;tire.position.set(fx+dx,.75,fz+dz);G.add(tire);
    }
    for(const dx of [-1.2,1.2]){box(fx+dx,3.2,fz-.8,.15,2.3,.15,C.dark);box(fx+dx,2,fz-2.8,.2,4,.2,C.steel);box(fx+dx,.35,fz-4,.3,.18,3,C.steel);}
    box(fx,4.3,fz-.8,3,.18,2.7,C.yellow);box(fx,2.2,fz+.5,1.7,.3,1.5,C.dark);
    // Crane rails have real columns. No full roof: the sky stays open over the compound.
    for(const x of [-38,38])for(const z of [-30,0,30]){
      K.box(x,0,z,.7,9.4,.7,C.steel);box(x,.15,z,1.4,.3,1.4,C.dark);
      box(x,9.5,z,.9,.2,5,C.yellow);
    }
    for(const x of [-20,20])for(const z of [-34,34]){
      box(x,5,z,.12,10,.12,C.dark);box(x,10,z,3,.18,.6,C.dark);lit(x,9.87,z,2.5,.08,.42,0xffe2a2);
    }
    for(const x of [-20,20])for(let z=-36;z<=36;z+=6){box(x,.015,z,.12,.025,3,C.yellow);}
    for(const [x,z,d] of [[-42,-17,32],[42,17,32],[0,-56,16],[0,56,16]]){
      box(x,.018,z,.7,.035,d,C.dark);for(let u=-d/2;u<d/2;u+=.6)box(x,.04,z+u,.65,.02,.12,C.trim);
    }
    for(const r of cells)for(let z=r.z0+5;z<r.z1;z+=7)box((r.x0+r.x1)/2,.014,z,r.x1-r.x0,.022,.03,0x424f4f);
    // Attached security cameras swivel on brackets; they are not damage-dealing searchlights.
    const cameras=[];
    for(const s of [-1,1]){
      box(s*8,3.6,s*14.5,.2,.2,.7,C.dark);
      const head=new THREE.Group();head.position.set(s*8,3.6,s*14.85);
      const housing=new THREE.Mesh(new THREE.BoxGeometry(.6,.35,.9),new THREE.MeshLambertMaterial({color:C.trim}));head.add(housing);
      const lens=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.06,16),new THREE.MeshBasicMaterial({color:0x8ee5cf}));lens.rotation.x=Math.PI/2;lens.position.z=-.47;head.add(lens);
      G.add(head);cameras.push(head);
    }
    let t=0;MAP_MECH[name]={reset(){t=0;},update(dt){t+=dt;for(let i=0;i<cameras.length;i++)cameras[i].rotation.y=i*Math.PI+Math.sin(t*.45+i)*.55;}};
    _thMesh(G,detail,false);G.children.at(-1).userData.mapStatic=true;
    _thMesh(G,glow,true);G.children.at(-1).userData.mapStatic=true;
    K.spawn({x0:-10,x1:10,z0:56,z1:62},{x0:-10,x1:10,z0:-62,z1:-56});
    G.userData.warehouseDetail={racks:4,yards:2,cameras:2,office:true,stairs:2};G._skyColor=0x8fa9af;
  };
})();
