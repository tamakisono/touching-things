/* Photograph refraction: expanding wave slopes displace texture coordinates. */
(() => {
  'use strict';
  const canvas = document.querySelector('#water');
  const status = document.querySelector('#status');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) { status.textContent = 'この環境では水の屈折を表示できません。背景写真をお楽しみください。'; return; }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const waves = [], pointers = new Map(), data = new Float32Array(32 * 4);
  let ready = false, frame = 0, last = 0, width = 1, height = 1, imageRatio = 1;
  const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float;
    uniform sampler2D photo;
    uniform vec2 viewport;
    uniform vec2 resolution;
    uniform vec2 crop;
    uniform vec4 waves[32];
    uniform float gentle;
    void main(){
      vec2 uv=gl_FragCoord.xy/resolution;
      vec2 p=vec2(uv.x,1.-uv.y)*viewport;
      vec2 slope=vec2(0.);
      for(int i=0;i<32;i++){
        vec4 w=waves[i];
        vec2 delta=p-w.xy;
        float d=length(delta);
        float radius=w.z*mix(115.,45.,gentle);
        float q=d-radius;
        float spread=24.+w.z*6.;
        float envelope=exp(-q*q/(2.*spread*spread));
        float fade=pow(max(0.,1.-w.z/4.5),2.);
        float onset=smoothstep(0.,.12,w.z);
        float radial=sin(q*.13)*envelope*fade*onset*w.w;
        slope+=delta/max(d,1.)*radial;
      }
      vec2 offset=slope*mix(13.,3.,gentle)/viewport;
      vec2 imageUV=(uv-.5)*crop+.5+vec2(offset.x,-offset.y)*crop;
      vec3 color=texture2D(photo,clamp(imageUV,vec2(.001),vec2(.999))).rgb;
      float glint=clamp(dot(slope,vec2(-.035,.055)),-.09,.09);
      gl_FragColor=vec4(clamp(color+glint,0.,1.),1.);
    }`;
  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  } catch (error) { console.error(error); status.textContent = '水面を描画できませんでした。背景写真を表示しています。'; return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uniform = name => gl.getUniformLocation(program, name);
  const loc = { viewport: uniform('viewport'), resolution: uniform('resolution'), crop: uniform('crop'), waves: uniform('waves[0]'), gentle: uniform('gentle') };
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uniform('photo'), 0);
  function draw() {
    if (!ready) return;
    data.fill(0); waves.forEach((w,i) => data.set([w.x,w.y,w.age,w.strength], i*4));
    gl.uniform4fv(loc.waves, data); gl.uniform1f(loc.gentle, reduced.matches ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5, 1800 / Math.max(width, height));
    canvas.width = Math.max(1,Math.round(width * ratio)); canvas.height = Math.max(1,Math.round(height * ratio));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(loc.viewport,width,height); gl.uniform2f(loc.resolution,canvas.width,canvas.height);
    const screenRatio = width / height;
    gl.uniform2f(loc.crop, Math.min(1,screenRatio/imageRatio), Math.min(1,imageRatio/screenRatio));
    draw();
  }
  const photo = new Image();
  photo.onload = () => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,photo);
    imageRatio = photo.width/photo.height; ready = true; status.textContent = ''; resize();
  };
  photo.onerror = () => { status.textContent = '写真を読み込めませんでした。ページを再読み込みしてください。'; };
  photo.src = 'stones.jpg';
  function tick(now) {
    frame = 0; const dt = Math.min((now-last)/1000,.05); last=now;
    for(let i=waves.length-1;i>=0;i--){ waves[i].age+=dt; if(waves[i].age>=4.5) waves.splice(i,1); }
    draw(); if(waves.length) frame=requestAnimationFrame(tick);
  }
  function add(x,y,strength) {
    if(!ready || document.hidden) return;
    document.body.classList.add('touched'); waves.push({x,y,age:0,strength});
    if(waves.length>32) waves.shift();
    if(!frame){ last=performance.now(); frame=requestAnimationFrame(tick); }
  }
  canvas.addEventListener('pointerdown', e => {
    if(e.button!==0) return; canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:performance.now()}); add(e.clientX,e.clientY,1);
  });
  canvas.addEventListener('pointermove', e => {
    if(e.pointerType!=='mouse'&&!pointers.has(e.pointerId)) return;
    const now=performance.now(), previous=pointers.get(e.pointerId);
    if(previous&&(now-previous.time<(reduced.matches?300:95)||Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<12)) return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,time:now}); add(e.clientX,e.clientY,e.buttons?.55:.3);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave']) canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault(); if(!e.repeat)add(width/2,height/2,1);} });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;waves.length=0;pointers.clear();draw();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;cancelAnimationFrame(frame);frame=0;status.textContent='描画が中断されました。再読み込みで再開できます。';});
  addEventListener('resize',resize);
})();
