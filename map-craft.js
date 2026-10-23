/* Authored outer districts share one floor definition with physics and AI. */
(function () {
  'use strict';
  // Side, centre along that side, width, depth. All dimensions are metres.
  const profiles = {
    urban: { kind: 'street', wings: [['E',-24,64,25],['W',30,48,20]] },
    forest: { kind: 'rock', wings: [['W',-25,58,23],['E',28,42,18],['N',18,44,16]] },
    desert: { kind: 'rock', wings: [['W',0,78,28],['S',24,46,18]] },
    volcano: { kind: 'basalt', wings: [['E',-18,54,24],['W',22,42,18],['N',0,36,15]] },
    tundra: { kind: 'rock', wings: [['E',22,62,24],['N',-20,48,18]] },
    airport: { kind: 'yard', wings: [['E',-24,86,30],['W',35,42,18]] },
    refinery: { kind: 'yard', wings: [['E',0,64,25],['W',-28,38,20],['S',20,42,16]] },
    cyber: { kind: 'tech', wings: [['E',-30,44,24],['W',30,44,24],['N',0,36,16]] },
    vietnam: { kind: 'rock', wings: [['W',-24,54,24],['E',30,64,20]] },
    chernobyl: { kind: 'yard', wings: [['W',0,88,26],['S',-24,40,20]] },
    overgrowth: { kind: 'rock', wings: [['E',-28,54,22],['W',22,64,26],['S',12,40,16]] },
    foundry: { kind: 'yard', wings: [['E',24,66,24],['W',-24,40,18]] },
    temple: { kind: 'stone', wings: [['W',0,44,22],['E',0,44,22],['N',0,44,22],['S',0,44,22]] },
    arena: { kind: 'stone', wings: [['W',0,66,24],['E',0,66,24]] },
    big_arena: { kind: 'yard', wings: [['E',-32,78,28],['W',32,78,28],['N',0,48,18]] },
    super_arena: { kind: 'tech', wings: [['E',-38,86,30],['W',38,86,30],['S',0,58,20]] },
    biosphere: { kind: 'stone', wings: [['E',0,70,24],['N',24,40,18],['W',-22,46,20]] },
    glassworks: { kind: 'yard', wings: [['E',28,64,26],['W',-28,42,18]] },
  };
  function cellsFor(rects) {
    const xs=[...new Set(rects.flatMap(r=>[r.x0,r.x1]))].sort((a,b)=>a-b);
    const zs=[...new Set(rects.flatMap(r=>[r.z0,r.z1]))].sort((a,b)=>a-b);
    const cells=[],edges=[];
    const inside=(x,z)=>rects.some(r=>x>r.x0 && x<r.x1 && z>r.z0 && z<r.z1);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],x=(x0+x1)/2,z=(z0+z1)/2;
      if(!inside(x,z))continue;cells.push({x0,x1,z0,z1});
      if(!inside(x,z0-.01))edges.push([x0,z0,x1,z0]);
      if(!inside(x,z1+.01))edges.push([x0,z1,x1,z1]);
      if(!inside(x0-.01,z))edges.push([x0,z0,x0,z1]);
      if(!inside(x1+.01,z))edges.push([x1,z0,x1,z1]);
    }
    return {cells,edges};
  }
  function geometryInto(buffer,geometry,matrix,color) {
    const source=geometry,g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(matrix);
    const p=g.attributes.position,n=g.attributes.normal,c=new THREE.Color(color);
    for(let i=0;i<p.count;i++){buffer.p.push(p.getX(i),p.getY(i),p.getZ(i));buffer.n.push(n.getX(i),n.getY(i),n.getZ(i));buffer.c.push(c.r,c.g,c.b);}
    g.dispose();if(g!==source)source.dispose();
  }
  function beam(buffer,a,b,width,color) {
    const length=a.distanceTo(b),geometry=new THREE.BoxGeometry(width,length,width);
    const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
    const matrix=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),rotation,new THREE.Vector3(1,1,1));geometry.applyMatrix4(matrix);
    geometryInto(buffer,geometry,new THREE.Matrix4(),color);
  }
  function stairs(name,x,z,dir,rise,width,color,y0=0,depth=1.1,stepH=.4) {
    const original=Math.max(2,Math.round(rise/stepH)),sub=Math.max(1,Math.ceil(rise/original/.19)),n=original*sub;
    const tread=depth/sub,sh=rise/n,dx=dir==='E'?1:dir==='W'?-1:0,dz=dir==='S'?1:dir==='N'?-1:0;
    const buf=_thBuf(),dark=_thShade(color,.56),edge=_thShade(color,1.24),group=MAP_GROUPS[name];
    const at=(u,h,v)=>new THREE.Vector3(x+dx*u-dz*v,y0+h,z+dz*u+dx*v);
    const box=(u,h,v,w,H,d,c)=>{const p=at(u,h,v);_thBox(buf,_TH_WORLD,p.x,p.y,p.z,dx?d:w,H,dx?w:d,c);};
    for(let i=0;i<n;i++){
      const u=-depth/2+tread*(i+.5),top=(i+1)*sh,p=at(u,top/2,0);
      box(u,top/2,0,width,top,tread,color);
      box(u-tread/2+.025,top-.018,0,width,.036,.05,edge);
      MAP_COLLIDERS[name].push(new THREE.Box3(new THREE.Vector3(p.x-(dx?tread:width)/2,y0,p.z-(dx?width:tread)/2),new THREE.Vector3(p.x+(dx?tread:width)/2,y0+top,p.z+(dx?width:tread)/2)));
    }
    const start=-depth/2,end=(original-.5)*depth;
    for(const side of [-1,1]){
      const v=side*(width/2+.055);
      beam(buf,at(start,.08,v),at(end,rise-.08,v),.14,dark);
      if(width<2.3 || rise<1)continue;
      beam(buf,at(start,.95,v),at(end,rise+.95,v),.075,dark);
      const posts=Math.max(2,Math.ceil((end-start)/2));
      for(let i=0;i<=posts;i++){
        const u=start+(end-start)*i/posts,h=rise*i/posts;
        beam(buf,at(u,h+.04,v),at(u,h+.95,v),.065,dark);
      }
    }
    _thMesh(group,buf,false);const m=group.children.at(-1);m.userData.mapStatic=true;m.userData.craftedStairs=true;m.receiveShadow=true;
    (group.userData.stairFlights ||= []).push({x,z,dir,rise,width,y0,run:original*depth,steps:n,riser:sh,tread});
    return {run:original*depth,n:original};
  }
  function build(name) {
    const cfg=profiles[name],group=MAP_GROUPS[name],old=MAP_BOUNDS[name],voidInfo=MAP_VOID[name];
    if(!cfg || !group || group.userData.footprint || !old || !voidInfo || voidInfo.rects)return;
    const base={x0:-old.halfX,x1:old.halfX,z0:-old.halfZ,z1:old.halfZ},rects=[base],wings=[];
    for(const [side,centre,width,depth] of cfg.wings){
      const alongX=side==='N'||side==='S',sign=side==='N'||side==='W'?-1:1;
      const limit=alongX?old.halfX:old.halfZ,mid=Math.max(-limit+width/2+6,Math.min(limit-width/2-6,centre));
      let r;
      if(alongX){const edge=sign*old.halfZ;r={x0:mid-width/2,x1:mid+width/2,z0:Math.min(edge,edge+sign*depth),z1:Math.max(edge,edge+sign*depth)};}
      else{const edge=sign*old.halfX;r={z0:mid-width/2,z1:mid+width/2,x0:Math.min(edge,edge+sign*depth),x1:Math.max(edge,edge+sign*depth)};}
      rects.push(r);wings.push({side,r,depth});
    }
    const {cells,edges}=cellsFor(rects),theme=MAP_THEMES[name],palette=OUTSKIRTS[name].pal;
    const buf=_thBuf(),trim=_thBuf(),natural=['rock','basalt'].includes(cfg.kind),wall=cfg.kind==='basalt'?0x252329:natural?palette.rock:palette.conc;
    const box=(b,x,y,z,w,h,d,c)=>_thBox(b,_TH_WORLD,x,y,z,w,h,d,c);
    // Only the additional yards need new floor: the original centre stays intact.
    for(const {r} of wings){
      box(buf,(r.x0+r.x1)/2,-2.02,(r.z0+r.z1)/2,r.x1-r.x0,4,r.z1-r.z0,theme.g);
      const cx=(r.x0+r.x1)/2,cz=(r.z0+r.z1)/2,alongX=r.x1-r.x0>r.z1-r.z0;
      const free=(x,z)=>!MAP_COLLIDERS[name].some(c=>c.max.y>.2&&c.min.y<4&&c.min.x<x+2.5&&c.max.x>x-2.5&&c.min.z<z+2.5&&c.max.z>z-2.5);
      for(const s of [-1,1]){
        const x=cx+(alongX?s*(r.x1-r.x0)*.27:0),z=cz+(alongX?0:s*(r.z1-r.z0)*.27);
        if(!free(x,z))continue;
        const h=natural?3.4:2.2,w=natural?3.5:4.2,d=natural?3:2.2;
        const cover=addMapBox(name,x,h/2,z,w,h,d,natural?palette.rock:palette.dark);
        if(natural){
          cover.visible=false;
          const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,h/2,z),new THREE.Quaternion(),new THREE.Vector3(w/2.2,1,d/2.2));
          geometryInto(buf,new THREE.CylinderGeometry(.76,1.1,h,6),matrix,palette.rock);
        }else{
          box(trim,x,h+.08,z,w+.14,.16,d+.14,palette.acc);
          for(const q of [-1,1])box(trim,x+q*(w/2-.14),h/2,z,.12,h,d+.025,palette.conc);
          for(let u=-w/2+.35;u<w/2-.2;u+=.4)box(trim,x+u,h/2,z+d/2+.025,.045,h-.22,.055,_thShade(palette.dark,1.3));
          box(trim,x,h/2,z+d/2+.06,.035,h-.18,.055,palette.conc);
          box(trim,x+.18,h*.52,z+d/2+.1,.06,.32,.08,palette.acc);
          for(const q of [-1,1])box(trim,x+q*w*.3,.14,z+d/2+.04,.5,.22,.04,0x15191c);
        }
      }
      if(natural){
        const rnd=_thRng(name+':ground:'+cx+':'+cz);
        for(let i=0;i<12;i++){
          const x=r.x0+1+rnd()*(r.x1-r.x0-2),z=r.z0+1+rnd()*(r.z1-r.z0-2);
          const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,.018,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rnd()*Math.PI),new THREE.Vector3(1+rnd()*1.6,1,.6+rnd()));
          geometryInto(trim,new THREE.CylinderGeometry(.9,1,.025,7),matrix,_thShade(theme.g,.68+rnd()*.18));
        }
      }else{
        for(let x=r.x0+2;x<r.x1-1;x+=4)box(trim,x,.014,cz,.025,.016,r.z1-r.z0-.5,_thShade(theme.g,.66));
        for(let z=r.z0+2;z<r.z1-1;z+=4)box(trim,cx,.014,z,r.x1-r.x0-.5,.016,.025,_thShade(theme.g,.66));
      }
    }
    // Retire the old straight tape at the original square edge.
    for(const m of group.children.slice()){
      if(!m.isMesh || !m.geometry?.parameters)continue;
      const p=m.geometry.parameters;
      if((p.height<=.07 && Math.max(p.width||0,p.depth||0)>old.halfX) || (p.width===.3&&p.height===1.5&&p.depth===.3)){
        if(Math.abs(m.position.x)>old.halfX-3 || Math.abs(m.position.z)>old.halfZ-3){group.remove(m);m.geometry.dispose();}
      }
    }
    for(const [x0,z0,x1,z1] of edges){
      const length=Math.hypot(x1-x0,z1-z0),horizontal=z0===z1,sections=Math.max(1,Math.ceil(length/7));
      for(let i=0;i<sections;i++){
        const t=(i+.5)/sections,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t,L=length/sections;
        const h=natural?7+(i%3)*.7:6.8;
        // Kept as a few broad collision slabs rather than hundreds of trim boxes.
        const w=horizontal?L:1.2,d=horizontal?1.2:L;
        box(buf,x,h/2,z,w,h,d,wall);
        MAP_COLLIDERS[name].push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),new THREE.Vector3(x+w/2,h,z+d/2)));
        box(trim,x,h+.08,z,w+.14,.16,d+.14,_thShade(wall,natural?1.12:.76));
        if(!natural){box(trim,x,h/2,z,horizontal?.24:1.45,h,horizontal?1.45:.24,palette.dark);box(trim,x,.2,z,w+.08,.4,d+.08,_thShade(wall,.72));}
      }
    }
    _thMesh(group,buf,false);group.children.at(-1).userData.mapStatic=true;
    _thMesh(group,trim,false);group.children.at(-1).userData.mapStatic=true;
    dress(name);
    const halfX=Math.max(...rects.flatMap(r=>[Math.abs(r.x0),Math.abs(r.x1)])),halfZ=Math.max(...rects.flatMap(r=>[Math.abs(r.z0),Math.abs(r.z1)]));
    MAP_VOID[name]={...voidInfo,halfX,halfZ,rects:cells};setMapBounds(name,halfX*2,halfZ*2);
    group.userData.footprint={kind:cfg.kind,rects:cells,edges,wings:rects.length-1};
  }
  function dress(name) {
    const group=MAP_GROUPS[name],theme=MAP_THEMES[name],buf=_thBuf();let fixtures=0,fascias=0;
    group.updateWorldMatrix(true,true);
    for(const mesh of group.children.slice()){
      if(!mesh.isMesh || !mesh.userData.thDims || mesh.userData.mapStructure || mesh.userData.craftedStairs)continue;
      const b=new THREE.Box3().setFromObject(mesh),size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
      if(['wall','cover'].includes(mesh.userData.thCls) && fixtures<18 && b.min.y<1 && size.y>=3 && size.y<12 && Math.min(size.x,size.z)<1.8 && Math.max(size.x,size.z)>7){
        const alongX=size.x>size.z,thin=alongX?size.z:size.x,long=alongX?size.x:size.z,side=Math.sign(alongX?c.z:c.x)||1;
        const at=(u,y,v,w,h,d,col)=>_thBox(buf,_TH_WORLD,c.x+(alongX?u:side*(thin/2+v)),y,c.z+(alongX?side*(thin/2+v):u),alongX?w:d,h,alongX?d:w,col);
        const pipeU=long/2-.4,y=b.min.y+Math.min(size.y*.66,3.2),dark=_thShade(theme.w,.64);
        at(pipeU,b.min.y+size.y/2,.07,.09,size.y,.12,dark);
        for(let yy=b.min.y+.5;yy<b.max.y-.2;yy+=1.2)at(pipeU,yy,.09,.2,.065,.15,0x919796);
        at(-pipeU,y,.11,.64,.82,.2,0x717c7d);
        at(-pipeU,y,.23,.49,.66,.035,0x394447);
        for(let q=-2;q<=2;q++)at(-pipeU,y+q*.09,.255,.4,.025,.035,0x929d9d);
        at(0,b.max.y-.07,.04,long,.14,.12,_thShade(theme.w,1.15));fixtures++;
      }
      if(['deck','roof'].includes(mesh.userData.thCls) && fascias<24 && size.y<1 && b.min.y>1.8 && Math.max(size.x,size.z)>4){
        const col=_thShade(theme.d,.62),y=b.min.y+.02;
        for(const s of [-1,1]){
          _thBox(buf,_TH_WORLD,c.x,y,c.z+s*(size.z/2-.03),size.x,.18,.12,col);
          _thBox(buf,_TH_WORLD,c.x+s*(size.x/2-.03),y,c.z,.12,.18,size.z,col);
        }fascias++;
      }
    }
    if(buf.p.length){_thMesh(group,buf,false);const mesh=group.children.at(-1);mesh.userData.mapStatic=true;mesh.raycast=()=>{};}
    group.userData.craftDetails={fixtures,fascias};
  }
  window.PVE_MAP_CRAFT={build,stairs,profiles,cellsFor};
})();
