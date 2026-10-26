/* Fittings follow the final industrial collision volumes, after layout stretching. */
(function(){
  'use strict';
  window.addRefineryPrecisionDetail=function(name){
    if(name!=='refinery')return;
    const G=MAP_GROUPS[name];if(!G||G.userData.refineryPrecision)return;
    const buf=_thBuf(),steel=0xa1b1ae,dark=0x334244;let tanks=0,columns=0;
    const append=(geo,x,y,z,color,rx=0)=>{
      geo.rotateX(rx);geo.translate(x,y,z);const g=geo.index?geo.toNonIndexed():geo;
      const p=g.attributes.position,n=g.attributes.normal,c=new THREE.Color(color);
      for(let i=0;i<p.count;i++){buf.p.push(p.getX(i),p.getY(i),p.getZ(i));buf.n.push(n.getX(i),n.getY(i),n.getZ(i));buf.c.push(c.r,c.g,c.b);}
      g.dispose();if(g!==geo)geo.dispose();
    };
    const box=(x,y,z,w,h,d,c)=>_thBox(buf,_TH_WORLD,x,y,z,w,h,d,c);
    const plate=(text,x,y,z)=>{
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
      const c=canvas.getContext('2d');c.fillStyle='#d9dfd6';c.fillRect(0,0,256,96);c.fillStyle='#24383b';
      c.font='bold 38px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,128,50);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.94),new THREE.MeshLambertMaterial({map:new THREE.CanvasTexture(canvas)}));
      m.position.set(x,y,z);m.userData.mapStatic=true;G.add(m);
    };
    G.updateWorldMatrix(true,true);
    const used=[];
    for(const collider of MAP_COLLIDERS[name]){
      const b=collider,size=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
      if(b.min.y>.1||Math.abs(c.x)>65||Math.abs(c.z)>65)continue;
      if(used.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<3))continue;
      if(tanks<4&&size.x>=10&&size.x<=22&&size.z>=10&&size.z<=22&&size.y>=3&&size.y<=8){
        used.push(c);tanks++;
        // Shallow access hatches do not create invisible ankle-height collision.
        const x=c.x+size.x*.23,z=c.z+size.z*.23,y=b.max.y;
        append(new THREE.CylinderGeometry(1.1,1.1,.08,32),x,y+.04,z,dark);
        append(new THREE.CylinderGeometry(.94,.94,.07,32),x,y+.115,z,steel);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;append(new THREE.CylinderGeometry(.055,.055,.04,6),x+Math.cos(a)*.8,y+.17,z+Math.sin(a)*.8,dark);
        }
        for(const s of [-1,1]){
          box(c.x,y-.18,c.z+s*size.z/2,size.x,.18,.06,dark);
          box(c.x,.25,c.z+s*size.z/2,size.x,.12,.06,dark);
        }
        plate('TK-'+String(tanks).padStart(2,'0'),c.x,2,c.z+size.z/2+.035);
      }else if(columns<6&&size.x>=3&&size.x<=7&&size.z>=3&&size.z<=7&&size.y>=9){
        used.push(c);columns++;
        for(const y of [1.1,Math.min(6,b.max.y*.45)]){
          box(c.x,y,c.z+size.z/2+.13,1.6,1.4,.25,dark);
          append(new THREE.CylinderGeometry(.5,.5,.24,24),c.x,y,c.z+size.z/2+.32,steel,Math.PI/2);
          append(new THREE.TorusGeometry(.5,.065,8,28),c.x,y,c.z+size.z/2+.48,0xa3483d);
          for(const s of [-1,1])box(c.x+s*.25,y,c.z+size.z/2+.48,.065,.8,.065,steel);
        }
        for(let y=1;y<b.max.y-1;y+=1.5)box(c.x+size.x/2+.03,y,c.z,.08,.12,size.z*.8,steel);
      }
    }
    _thMesh(G,buf,false);if(buf.p.length)G.children.at(-1).userData.mapStatic=true;
    G.userData.refineryPrecision={tanks,columns};
  };
})();
