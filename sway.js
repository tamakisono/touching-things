/* Individually sprung grass blades, painted back to front. */
(() => {
'use strict';
const canvas=document.querySelector('#grass'),ctx=canvas.getContext('2d');
if(!ctx)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let w,h,blades=[],background,last=0,frame=0,time=0;
const undergrowth=document.createElement('canvas'),ground=undergrowth.getContext('2d');
const pointers=new Map();
let seed=41;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function resize(){
 w=canvas.clientWidth;h=canvas.clientHeight;
 const scale=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);ctx.setTransform(scale,0,0,scale,0,0);
 background=ctx.createLinearGradient(0,0,w,h);background.addColorStop(0,'#617849');background.addColorStop(.45,'#284c35');background.addColorStop(1,'#112b24');
 // Cache a dense, still undergrowth once per resize, at CSS-pixel resolution.
 undergrowth.width=Math.ceil(w);undergrowth.height=Math.ceil(h);
 ground.fillStyle=background;ground.fillRect(0,0,w,h);seed=173;
 for(let y=0;y<h+100;y+=8)for(let x=-30;x<w+30;x+=5){
  const bx=x+random()*12,by=y+random()*12,len=30+random()*65,tip=bx+(random()-.5)*35,half=2+random()*2;
  ground.beginPath();ground.moveTo(bx-half,by);ground.quadraticCurveTo(bx-half,by-len*.55,tip,by-len);ground.quadraticCurveTo(bx+half,by-len*.45,bx+half,by);ground.closePath();
  ground.fillStyle=`hsl(${85+random()*30} 30% ${17+random()*18}%)`;ground.fill();
 }
 seed=41;blades=[];
 const count=Math.min(4200,Math.max(1500,Math.round(w*h/220)));
 for(let i=0;i<count;i++){
  const y=random()*(h+170),depth=.35+.65*Math.min(1,y/h),x=random()*(w+100)-50;
  const light=random(),hue=78+random()*40;
  blades.push({x,y,len:(68+random()*114)*depth,width:(2.6+random()*5.2)*depth,lean:(random()-.5)*36,phase:random()*6.28,shade:`hsl(${hue} ${25+light*17}% ${20+light*27}%)`,edge:`hsla(${hue-8} 44% ${48+light*20}% / .45)`,bend:0,velocity:0});
 }
 blades.sort((a,b)=>a.y-b.y);pointers.clear();draw(0);
}
function draw(dt){
 ctx.drawImage(undergrowth,0,0,w,h);
 for(const b of blades){
  b.velocity+=(-b.bend*28-b.velocity*7)*dt;b.bend+=b.velocity*dt;
  const breeze=reduced.matches?0:(Math.sin(time*.8+b.x*.006+b.y*.004)+.45*Math.sin(time*1.3+b.phase))*b.len*.15;
  const bend=b.lean+breeze+b.bend,tx=b.x+bend,ty=b.y-b.len+Math.min(b.len*.5,Math.abs(b.bend)*.22);
  ctx.beginPath();ctx.moveTo(b.x-b.width/2,b.y);ctx.bezierCurveTo(b.x-b.width,b.y-b.len*.35,tx-b.width,ty+b.len*.23,tx,ty);ctx.bezierCurveTo(tx+b.width*.6,ty+b.len*.25,b.x+b.width,b.y-b.len*.32,b.x+b.width/2,b.y);ctx.closePath();ctx.fillStyle=b.shade;ctx.fill();
  ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.quadraticCurveTo(b.x+bend*.18,b.y-b.len*.52,tx,ty);ctx.strokeStyle=b.edge;ctx.lineWidth=.5;ctx.stroke();
 }
}
function tick(now){frame=0;if(document.hidden)return;const dt=Math.min(.033,(now-last)/1000);last=now;time+=dt;draw(dt);frame=requestAnimationFrame(tick);}
function start(){if(!frame&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
function brush(x,y,dx){
 document.body.classList.add('touched');const radius=Math.max(65,Math.min(w,h)*.15);
 for(const b of blades){const distance=Math.hypot(b.x-x,(b.y-b.len*.55)-y);if(distance<radius){const force=(1-distance/radius)**2;b.velocity+=Math.max(-220,Math.min(220,dx*16+(b.x-x)*2))*force;b.bend=Math.max(-b.len,Math.min(b.len,b.bend+dx*force*.35));}}
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});brush(e.clientX,e.clientY,8);});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'&&!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);brush(e.clientX,e.clientY,prev?e.clientX-prev.x:0);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();brush(w*.5,h*.6,e.key==='ArrowLeft'?-28:28);}});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;pointers.clear();start();});
addEventListener('resize',resize);resize();start();
})();

