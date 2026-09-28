/* water v0.1 — no libraries, no network, just a little water. */
(() => {
  'use strict';
  const canvas = document.querySelector('#water');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ripples = [];
  const pointers = new Map();
  let width = 0, height = 0, frame = 0, previous = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function add(x, y, strength) {
    document.body.classList.add('touched');
    ripples.push({ x, y, strength, age: 0 });
    if (ripples.length > 64) ripples.shift();
    if (!frame && !document.hidden) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const ripple of ripples) {
      const life = reduced.matches ? 1.2 : 4.8;
      const progress = ripple.age / life;
      const fade = Math.pow(Math.max(0, 1 - progress), 2);
      const radius = reduced.matches ? 18 + progress * 22 : 5 + ripple.age * 90;
      for (let ring = 0; ring < 4; ring++) {
        const r = radius - ring * 13;
        if (r <= 0) continue;
        const alpha = fade * ripple.strength * (1 - ring * .2);
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y + 1.5, r, r * .76, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 12, 24, ${alpha * .45})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, r, r * .76, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(210, 245, 237, ${alpha * .9})`;
        ctx.lineWidth = 1.7;
        ctx.stroke();
      }
    }
  }

  function tick(now) {
    frame = 0;
    const elapsed = Math.min((now - previous) / 1000, .05);
    previous = now;
    const life = reduced.matches ? 1.2 : 4.8;
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += elapsed;
      if (ripples[i].age >= life) ripples.splice(i, 1);
    }
    draw();
    if (ripples.length) frame = requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, time: performance.now() });
    add(event.clientX, event.clientY, 1);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && !pointers.has(event.pointerId)) return;
    const now = performance.now();
    const last = pointers.get(event.pointerId);
    const interval = reduced.matches ? 250 : 65;
    if (last && (now - last.time < interval || Math.hypot(event.clientX - last.x, event.clientY - last.y) < 9)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, time: now });
    add(event.clientX, event.clientY, event.buttons ? .6 : .28);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
    canvas.addEventListener(name, event => pointers.delete(event.pointerId));
  }
  canvas.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) add(width / 2, height / 2, 1);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      ripples.length = 0;
      pointers.clear();
      draw();
    }
  });
  addEventListener('resize', resize);
  resize();
})();
