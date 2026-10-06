/* A persistent sand height field. Only touched pixels are shaded, on demand. */
(() => {
'use strict';
const canvas=document.querySelector('#sand'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)return;
let W=0,H=0,w,h,sx,sy,heights,grain,pixels,dirty=null,frame=0;
const pointers=new Map();let keyPoint=null;
function invalidate(x0,y0,x1,y1){
 const r={x0:Math.max(0,Math.floor(x0)),y0:Math.max(0,Math.floor(y0)),x1:Math.min(W-1,Math.ceil(x1)),y1:Math.min(H-1,Math.ceil(y1))};
 if(dirty){dirty.x0=Math.min(dirty.x0,r.x0);dirty.y0=Math.min(dirty.y0,r.y0);dirty.x1=Math.max(dirty.x1,r.x1);dirty.y1=Math.max(dirty.y1,r.y1);}else dirty=r;
 if(!frame)frame=requestAnimationFrame(render);
}
function resize(){
 const old=heights,ow=W,oh=H;w=canvas.clientWidth;h=canvas.clientHeight;
 const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(900000/(w*h)));
 W=Math.max(1,Math.round(w*ratio));H=Math.max(1,Math.round(h*ratio));sx=W/w;sy=H/h;canvas.width=W;canvas.height=H;
 heights=new Float32Array(W*H);grain=new Float32Array(W*H);pixels=ctx.createImageData(W,H);
 let seed=29;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;seed=(seed*1664525+1013904223)>>>0;grain[i]=((seed/4294967296)-.5)*15;if(old)heights[i]=old[Math.min(oh-1,Math.floor(y/H*oh))*ow+Math.min(ow-1,Math.floor(x/W*ow))];}
 pointers.clear();keyPoint=null;dirty=null;invalidate(0,0,W-1,H-1);
}
function render(){
 frame=0;if(!dirty)return;const r=dirty;dirty=null;const a=pixels.data;
 for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){
  const i=y*W+x,z=heights[i];
  const dx=(heights[y*W+Math.min(W-1,x+1)]-heights[y*W+Math.max(0,x-1)])*sx*.5;
  const dy=(heights[Math.min(H-1,y+1)*W+x]-heights[Math.max(0,y-1)*W+x])*sy*.5;
  const light=(-dx*.65-dy*.75)*29+z*.75;
  const dune=Math.sin(y/sy*.045+Math.sin(x/sx*.004)*2)*1.3;
  const shade=light+grain[i]+dune+7*(1-x/W)-7*y/H;
  a[i*4]=216+shade;a[i*4+1]=195+shade*.94;a[i*4+2]=159+shade*.82;a[i*4+3]=255;
 }
 ctx.putImageData(pixels,0,0,r.x0,r.y0,r.x1-r.x0+1,r.y1-r.y0+1);
}
function dab(px,py){
 const radius=18,x0=Math.max(0,Math.floor((px-radius*1.5)*sx)),x1=Math.min(W-1,Math.ceil((px+radius*1.5)*sx)),y0=Math.max(0,Math.floor((py-radius*1.5)*sy)),y1=Math.min(H-1,Math.ceil((py+radius*1.5)*sy));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const d=Math.hypot(x/sx-px,y/sy-py)/radius;if(d>1.5)continue;const i=y*W+x;
  const target=-7*Math.exp(-d*d*4)+2.1*Math.exp(-Math.pow((d-.96)/.23,2));
  if(target<0)heights[i]=Math.min(heights[i],target);else if(heights[i]>=0)heights[i]=Math.max(heights[i],target);
 }
 invalidate(x0-2,y0-2,x1+2,y1+2);
}
function stroke(from,to){
 document.body.classList.add('touched');const distance=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(distance/3));
 for(let i=1;i<=steps;i++)dab(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps);
}
function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);const p=point(e);pointers.set(e.pointerId,p);stroke(p,p);});
canvas.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'&&!pointers.has(e.pointerId))return;const p=point(e),prev=pointers.get(e.pointerId);if(prev)stroke(prev,p);pointers.set(e.pointerId,p);});
for(const type of ['pointerup','pointercancel','pointerleave','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
function clear(){heights.fill(0);pointers.clear();invalidate(0,0,W-1,H-1);}
document.querySelector('#clear').addEventListener('click',clear);
canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();clear();return;}const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12],' ':[0,0],Enter:[0,0]}[e.key];if(!delta)return;e.preventDefault();const prev=keyPoint||{x:w*.5,y:h*.55};keyPoint={x:Math.max(0,Math.min(w,prev.x+delta[0])),y:Math.max(0,Math.min(h,prev.y+delta[1]))};stroke(prev,keyPoint);});
document.addEventListener('visibilitychange',()=>pointers.clear());addEventListener('resize',resize);resize();
})();

