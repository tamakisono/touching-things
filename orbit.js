/* Softened gravity and a small tangential current: no pairwise particle work. */
(() => {
'use strict';
const canvas=document.querySelector('#stars'),ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),background=document.createElement('canvas'),bg=background.getContext('2d');
let motionScale=1;let w,h,stars=[],frame=0,last=0,time=0,keyboard=null;const wells=new Map();
let seed=108;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function resize(){
 const ow=w,oh=h;w=canvas.clientWidth;h=canvas.clientHeight;motionScale=Math.max(1,Math.min(2,Math.min(w/600,h/450)));const dpr=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 background.width=canvas.width;background.height=canvas.height;bg.setTransform(dpr,0,0,dpr,0,0);
 const glow=bg.createRadialGradient(w*.55,h*.5,0,w*.55,h*.5,Math.max(w,h)*.8);glow.addColorStop(0,'#101a30');glow.addColorStop(.6,'#080d19');glow.addColorStop(1,'#050810');bg.fillStyle=glow;bg.fillRect(0,0,w,h);
 seed=108;for(let i=0;i<220;i++){bg.fillStyle=`rgba(180,198,230,${.12+random()*.3})`;bg.beginPath();bg.arc(random()*w,random()*h,.3+random()*.5,0,Math.PI*2);bg.fill();}
 if(!stars.length){const n=Math.min(850,Math.max(350,Math.round(w*h/1400)));for(let i=0;i<n;i++){const angle=random()*Math.PI*2,speed=3+random()*9;stars.push({x:random()*w,y:random()*h,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:.65+random()*1.1,phase:random()*6.28,warm:random()<.18});}}else for(const s of stars){s.x=s.x/ow*w;s.y=s.y/oh*h;}
 wells.clear();keyboard=null;render(0);
}
function render(dt){
 ctx.drawImage(background,0,0,w,h);const gentle=reduced.matches?.3:1;
 for(const [id,p] of wells){if(!p.held)p.life-=dt;if(p.life<=0)wells.delete(id);}
 for(const s of stars){
  let ax=0,ay=0;for(const p of wells.values()){
   const dx=p.x-s.x,dy=p.y-s.y,d=Math.hypot(dx,dy)/motionScale,soft=Math.sqrt(d*d+2500)*motionScale,power=(p.held?1:Math.min(1,p.life/1.5))*(p.strong?1:.4),force=Math.min(180,250000/(d*d+6000))*power;
   ax+=(dx/soft-dy/soft*.38)*force*motionScale;ay+=(dy/soft+dx/soft*.38)*force*motionScale;
  }
  const ox=s.x,oy=s.y;
  s.vx=(s.vx+ax*dt*gentle)*Math.exp(-dt*.045);s.vy=(s.vy+ay*dt*gentle)*Math.exp(-dt*.045);
  const speed=Math.hypot(s.vx,s.vy);if(speed>170*motionScale){s.vx*=170*motionScale/speed;s.vy*=170*motionScale/speed;}
  s.x+=s.vx*dt*gentle;s.y+=s.vy*dt*gentle;
  if(s.x< -12)s.x=w+12;if(s.x>w+12)s.x=-12;if(s.y< -12)s.y=h+12;if(s.y>h+12)s.y=-12;
  const color=s.warm?'246,214,167':'196,215,250',alpha=.55+.25*(reduced.matches?0:Math.sin(time*.7+s.phase));
  if(!reduced.matches&&speed>12&&Math.abs(s.x-ox)<w*.5&&Math.abs(s.y-oy)<h*.5){ctx.beginPath();ctx.moveTo(s.x-s.vx*.14,s.y-s.vy*.14);ctx.lineTo(s.x,s.y);ctx.strokeStyle=`rgba(${color},${Math.min(.4,speed/260)})`;ctx.lineWidth=s.r*motionScale*.7;ctx.stroke();}
  ctx.fillStyle=`rgba(${color},.05)`;ctx.beginPath();ctx.arc(s.x,s.y,s.r*motionScale*4,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(${color},${alpha})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r*motionScale,0,Math.PI*2);ctx.fill();
 }
 for(const p of wells.values()){const alpha=(p.held?.25:Math.min(.25,p.life*.12));const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,38);g.addColorStop(0,`rgba(159,188,240,${alpha})`);g.addColorStop(1,'rgba(159,188,240,0)');ctx.fillStyle=g;ctx.fillRect(p.x-38,p.y-38,76,76);}
}
function tick(now){frame=0;if(document.hidden)return;const dt=Math.min(.033,(now-last)/1000);last=now;time+=dt;render(dt);frame=requestAnimationFrame(tick);}
function start(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
function attract(id,x,y,held,strong){document.body.classList.add('touched');if(!wells.has(id)&&wells.size>=5)return;wells.set(id,{x,y,held,strong,life:2.4});}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('selectstart',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);attract(e.pointerId,e.clientX,e.clientY,true,true);});
canvas.addEventListener('pointermove',e=>{const p=wells.get(e.pointerId);if(e.pointerType!=='mouse'&&!p?.held)return;attract(e.pointerId,e.clientX,e.clientY,!!p?.held,!!p?.held);});
for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture'])canvas.addEventListener(type,e=>{const p=wells.get(e.pointerId);if(p){p.held=false;p.life=2.4;}});
canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[-25,0],ArrowRight:[25,0],ArrowUp:[0,-25],ArrowDown:[0,25],Enter:[0,0],' ':[0,0]}[e.key];if(!delta)return;e.preventDefault();keyboard=keyboard||{x:w/2,y:h/2};keyboard.x=Math.max(0,Math.min(w,keyboard.x+delta[0]));keyboard.y=Math.max(0,Math.min(h,keyboard.y+delta[1]));attract('key',keyboard.x,keyboard.y,true,true);});
canvas.addEventListener('keyup',()=>{const p=wells.get('key');if(p)p.held=false;});canvas.addEventListener('blur',()=>{for(const p of wells.values())p.held=false;});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;wells.clear();start();});addEventListener('resize',resize);resize();start();
})();

