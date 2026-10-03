/* Semi-Lagrangian smoke on a bounded grid, with buoyancy and pointer wind. */
(() => {
'use strict';
const canvas=document.querySelector('#smoke'), ctx=canvas.getContext('2d');
const pause=document.querySelector('#pause'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(!ctx)return;
const layer=document.createElement('canvas'), lc=layer.getContext('2d');
let W,H,N,u,v,d,nu,nv,nd,p,np,div,pixels,width,height,frame=0,last=0,time=0;
let paused=reduced.matches;
const pointers=new Map();
function resize(){
 width=canvas.clientWidth;height=canvas.clientHeight;
 W=Math.max(48,Math.round(130*width/Math.max(width,height))); H=Math.max(48,Math.round(130*height/Math.max(width,height)));N=W*H;
 [u,v,d,nu,nv,nd,p,np,div]=Array.from({length:9},()=>new Float32Array(N));
 layer.width=W;layer.height=H;pixels=lc.createImageData(W,H);
 const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 ctx.setTransform(ratio,0,0,ratio,0,0);pointers.clear();
 for(let i=0;i<160;i++)step(.025);
 render();
}
function sample(a,x,y){x=Math.max(.5,Math.min(W-1.5,x));y=Math.max(.5,Math.min(H-1.5,y));const X=Math.floor(x),Y=Math.floor(y),fx=x-X,fy=y-Y,i=Y*W+X;return (a[i]*(1-fx)+a[i+1]*fx)*(1-fy)+(a[i+W]*(1-fx)+a[i+W+1]*fx)*fy;}
function step(dt){
 time+=dt;
 // A narrow continuous source; small changes keep the plume alive.
 const sx=W*.5+Math.sin(time*.8)*W*.025;
 for(let y=H-7;y<H-1;y++)for(let x=1;x<W-1;x++){
  const a=Math.exp(-Math.pow((x-sx)/(W*.035),2));const i=y*W+x;
  d[i]=Math.min(3,d[i]+a*dt*8);v[i]-=a*dt*32;
 }
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=y*W+x;
  v[i]-=d[i]*dt*7;
  u[i]+=Math.sin(y*.18+time*1.2)*d[i]*dt*3;
  const bx=x-u[i]*dt,by=y-v[i]*dt;
  nu[i]=sample(u,bx,by)*.993;nv[i]=sample(v,bx,by)*.993;
 }
 [u,nu]=[nu,u];[v,nv]=[nv,v];p.fill(0);
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;div[i]=(u[i+1]-u[i-1]+v[i+W]-v[i-W])*.5;}
 for(let k=0;k<12;k++){
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;np[i]=(p[i-1]+p[i+1]+p[i-W]+p[i+W]-div[i])*.25;}
  [p,np]=[np,p];
 }
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=y*W+x;u[i]-=(p[i+1]-p[i-1])*.5;v[i]-=(p[i+W]-p[i-W])*.5;
  nd[i]=sample(d,x-u[i]*dt,y-v[i]*dt)*Math.exp(-dt*.18);
  if(y<10)nd[i]*=.94;
 }
 [d,nd]=[nd,d];
}
function render(){
 const a=pixels.data;
 for(let i=0;i<N;i++){const light=1-Math.exp(-d[i]*.85);a[i*4]=16+light*165;a[i*4+1]=17+light*172;a[i*4+2]=22+light*187;a[i*4+3]=255;}
 lc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(layer,0,0,width,height);
}
function tick(now){frame=0;if(paused||document.hidden)return;const dt=Math.min((now-last)/1000,.033);last=now;step(dt);render();frame=requestAnimationFrame(tick);}
function start(){if(!frame&&!paused&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
function wind(px,py,dx,dy){
 document.body.classList.add('touched');const gx=px/width*W,gy=py/height*H,r=Math.max(5,W*.09);
 for(let y=Math.max(1,Math.floor(gy-r*2));y<Math.min(H-1,gy+r*2);y++)for(let x=Math.max(1,Math.floor(gx-r*2));x<Math.min(W-1,gx+r*2);x++){
  const a=Math.exp(-((x-gx)**2+(y-gy)**2)/(r*r));const i=y*W+x;
  u[i]+=Math.max(-25,Math.min(25,dx/width*W*2))*a;v[i]+=Math.max(-25,Math.min(25,dy/height*H*2))*a;
 }
 if(paused){step(.025);render();}
}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});wind(e.clientX,e.clientY,35,-20);});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'&&!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);if(prev)wind(e.clientX,e.clientY,e.clientX-prev.x,e.clientY-prev.y);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
canvas.addEventListener('keydown',e=>{const deltas={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70],Enter:[60,-30],' ':[60,-30]};if(deltas[e.key]){e.preventDefault();wind(width*.5,height*.65,...deltas[e.key]);}});
function label(){pause.textContent=paused?'再生':'一時停止';pause.setAttribute('aria-pressed',String(paused));}
pause.addEventListener('click',()=>{paused=!paused;label();if(paused){cancelAnimationFrame(frame);frame=0;}else start();});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;pointers.clear();start();});
addEventListener('resize',resize);resize();label();start();
})();
