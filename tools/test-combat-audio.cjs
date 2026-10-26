const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

function wav(channels,rate){
  const n=channels[0].length,b=Buffer.alloc(44+n*channels.length*2);
  b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(channels.length,22);b.writeUInt32LE(rate,24);
  b.writeUInt32LE(rate*channels.length*2,28);b.writeUInt16LE(channels.length*2,32);b.writeUInt16LE(16,34);
  b.write('data',36);b.writeUInt32LE(b.length-44,40);
  for(let i=0;i<n;i++)for(let c=0;c<channels.length;c++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[c][i]))*32767),44+(i*channels.length+c)*2);
  return b;
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.PVE_URL||'http://localhost:4179/',{waitUntil:'load'});
    await page.waitForFunction(()=>typeof weaponModels!=='undefined'&&weaponModels.length);
    await page.waitForFunction(()=>gunShotSample.buffer||gunShotSample.failed);
    const results=await page.evaluate(async()=>{
      const rate=24000,original=audioCtx,random=Math.random,mix=BULLET_AUDIO_MIX.muzzle;
      const energy=(data,a,b)=>{
        let sum=0;for(let i=Math.floor(a*rate);i<Math.floor(b*rate);i++)sum+=data[i]*data[i];
        return Math.sqrt(sum/((b-a)*rate));
      };
      const render=async(fn,seconds=1)=>{
        const ctx=new OfflineAudioContext(2,Math.ceil(rate*seconds),rate);audioCtx=ctx;
        _revBus.indoor=_revBus.outdoor=null;weaponSoundLastAt={};soundEventLastAt={};
        let seed=17;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
        fn(ctx);return ctx.startRendering();
      };
      const peak=buffer=>{
        let max=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c)){
          if(!Number.isFinite(v))throw Error('Non-finite audio');max=Math.max(max,Math.abs(v));
        }return max;
      };
      try{
        if(!gunShotSample.buffer || gunShotSample.failed)throw Error('Uploaded MP3 did not decode');
        if(gunShotSample.buffer.duration<2.9 || gunShotSample.buffer.duration>3.1)throw Error('Wrong uploaded recording');
        const old=await render(ctx=>{BULLET_AUDIO_MIX.muzzle=.2;playTone(ctx,.02,.12,gunBus(ctx,true),330,100,.02,'triangle');});
        const loud=await render(ctx=>{BULLET_AUDIO_MIX.muzzle=mix;playTone(ctx,.02,.12,gunBus(ctx,true),330,100,.02,'triangle');});
        const ratio=energy(loud.getChannelData(0),0,.4)/energy(old.getChannelData(0),0,.4);
        if(Math.abs(ratio-mix/.2)>.01)throw Error('Muzzle gain incorrect '+ratio);
        const pass=await render(ctx=>{
          const filters=[],create=ctx.createBiquadFilter.bind(ctx),source=ctx.createBufferSource.bind(ctx);
          ctx.createBiquadFilter=()=>{const f=create();filters.push(f);return f;};
          ctx.createBufferSource=()=>{const s=source();s.playbackRate.exponentialRampToValueAtTime=()=>{throw Error('Rubber-band pitch glide returned');};return s;};
          playBulletAir(ctx,.02,1,{near:true,speed:150,panStart:-.9,panEnd:.9});
          if(filters.some(f=>f.type==='bandpass'||f.Q.value>.71))throw Error('Resonant whistle returned');
        });
        const l=pass.getChannelData(0),r=pass.getChannelData(1);
        if(energy(l,.03,.08)<=energy(r,.03,.08)||energy(r,.18,.24)<=energy(l,.18,.24))throw Error('Whizz does not sweep across listener');
        if(energy(l,.32,.5)>.0001)throw Error('Whizz tail hangs');
        const outgoing=await render(ctx=>playBulletAir(ctx,.02,1));
        if(energy(outgoing.getChannelData(0),.26,.4)>.0001)throw Error('Outgoing rush too long');
        const report=await render(ctx=>playMuzzleBlast(ctx,.02,gunBus(ctx,true),'ak_metal',.24*SOUND_MIX));
        const whizzDominance=energy(outgoing.getChannelData(0),0,.3)/energy(report.getChannelData(0),0,.3);
        if(whizzDominance<1.5)throw Error('Muzzle still masks whizz '+whizzDominance);
        const hit=await render(()=>playSoundEvent('hitmarker',{volume:.8,impact:true,tier:'yellow',minGap:0}));
        const head=await render(()=>playSoundEvent('headshot',{volume:1.1,impact:true,tier:'blue',minGap:0}));
        if(peak(hit)<.05 || peak(head)<peak(hit))throw Error('Impacts silent or critical weaker');
        if(energy(hit.getChannelData(0),.12,.3)>.001)throw Error('Slap has a ringing tail');
        for(const [id,expected] of [['ak20',true],['pistol',true],['sg8',true],['rpg',false],['boombow',false],['storm_bloom',false],['flamethrower',false]]){
          if(usesBulletAir(id,WEAPONS.find(w=>w.id===id))!==expected)throw Error('Changed special projectile sound '+id);
        }
        const gunLevels={};
        for(const id of ['ak20','pistol','sg8','srx','minigun']){
          const b=await render(ctx=>{
            playWeaponSound(id,{minGap:0,baseWeapon:WEAPONS.find(w=>w.id===id)});
            if(ctx._gunShotSampleVoices?.length!==1 || ctx._gunShotSampleVoices[0].source.buffer!==gunShotSample.buffer)throw Error('Recording not used by '+id);
            if(ctx._bulletAirBus || ctx._bulletMuzzleBus)throw Error('Procedural shot layered over recording '+id);
          });
          const p=peak(b);if(p<.02||p>.95)throw Error('Gun silent or clipping '+id+': '+p);gunLevels[id]=p;
        }
        const burst=await render(ctx=>{
          for(let i=0;i<20;i++){
            const t=.02+i*.045;
            playMuzzleBlast(ctx,t,gunBus(ctx,true),'ak_metal',.24*SOUND_MIX);
            playBulletAir(ctx,t+.008,1.15);
            if(i%2===0)playTargetImpact(ctx,t+.025,.92,'yellow');
            if(i%4===0)playBulletAir(ctx,t+.015,.7,{near:true,panStart:-.8,panEnd:.8});
          }
        },2);
        if(peak(burst)>.95)throw Error('Clipping rapid fire '+peak(burst));
        const sampleBurst=await render(ctx=>{
          for(let i=0;i<30;i++)playGunShotSample(ctx,.02+i*.045,1.15,{kind:'ak_metal'});
          if(ctx._gunShotSampleVoices.length>16)throw Error('Unlimited sample overlap');
        },3.3);
        if(peak(sampleBurst)>.7)throw Error('Sample burst clips '+peak(sampleBurst));
        const sample=gunShotSample.buffer;
        try{
          gunShotSample.buffer=null;
          const fallback=await render(()=>playWeaponSound('pistol',{minGap:0}));
          if(peak(fallback)<.02)throw Error('Missing sample silences weapon');
        }finally{gunShotSample.buffer=sample;}
        await render(ctx=>{
          playWeaponSound('storm_bloom',{minGap:0});
          if(ctx._gunShotSampleBus)throw Error('Recording replaced special weapon voice');
        });
        const skinFx=_skinFxFor;
        try{
          _skinFxFor=()=>({sound:{kind:'beep',f1:800,f2:600,dur:.1,vol:.1}});
          await render(ctx=>{
            playWeaponSound('pistol',{minGap:0});
            if(ctx._gunShotSampleBus)throw Error('Recording replaced skin voice');
          });
        }finally{_skinFxFor=skinFx;}
        const event=playSoundEvent,number=spawnHitNumber,calls=[];
        try{
          playSoundEvent=(name,opts)=>calls.push({name,...opts});spawnHitNumber=()=>{};
          hitFeedback('audio-test',null,null,12,false,1,false,'pistol');
          hitFeedback('audio-test',null,null,24,true,1,false,'pistol');
          hitFeedback('audio-test',null,null,0,false,1,false,'pistol');
        }finally{playSoundEvent=event;spawnHitNumber=number;}
        if(calls.length!==2||calls.some(c=>!c.impact)||calls[1].name!=='headshot')throw Error('Combat feedback not wired to slap');
        requestAnimationFrame=()=>0;
        const walls=wallColliders.slice(),pos=camera.position.clone(),dead=isDead,near=registerNearMiss;let nearCalls=0;
        try{
          wallColliders.length=0;camera.position.set(0,1.65,0);isDead=false;registerNearMiss=()=>nearCalls++;
          spawnLocalBullet(new THREE.Vector3(-2,1.5,.7),new THREE.Vector3(1,0,0),'audio-pass-test',false,120,0xff6600,.04,'ak20',{botId:'audio-test',botTeam:'enemy'});
          updateBullets(.02);updateBullets(.001);
        }finally{registerNearMiss=near;wallColliders.length=0;wallColliders.push(...walls);camera.position.copy(pos);isDead=dead;}
        if(nearCalls!==1)throw Error('Whizz retriggered or missing '+nearCalls);
        const demo=await render(ctx=>{
          playWeaponSound('ak20',{minGap:0});
          playTargetImpact(ctx,.7,.92,'yellow');playTargetImpact(ctx,1.15,1.2,'blue',true);
          playBulletAir(ctx,1.65,1,{near:true,speed:150,panStart:-.95,panEnd:.95});
        },2.3);
        return {ratio,whizzDominance,gunLevels,sampleBurstPeak:peak(sampleBurst),sampleDecoded:true,slapPeak:peak(hit),headshotPeak:peak(head),burstPeak:peak(burst),nearMissOnce:true,rate,
          channels:[...Array(2)].map((_,i)=>Array.from(demo.getChannelData(i)))};
      }finally{audioCtx=original;Math.random=random;BULLET_AUDIO_MIX.muzzle=mix;_revBus.indoor=_revBus.outdoor=null;}
    });
    fs.writeFileSync('/tmp/combat-audio-preview.wav',wav(results.channels,results.rate));delete results.channels;
    console.log(results);if(errors.length)throw Error(errors.join('\n'));
    console.log('PASS: bright muzzle, dominant stereo whizz, short target slap, critical distinction, clean rapid fire, combat wiring and once-only near misses');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
