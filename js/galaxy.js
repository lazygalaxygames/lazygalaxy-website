/* =============================================================
   LAZY GALAXY — full-page interactive galaxy
   - 3D star drift with mouse parallax
   - gravitational lens around the cursor
   - comet trail
   - click = supernova, HOLD = black hole (absorbs stars), release = shockwave
   - scrolling fast = warp speed streaks
   - type "lazy" (or the Konami code) = hyperdrive
   ============================================================= */
(function () {
  const canvas = document.getElementById('galaxy');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const root = document.documentElement;
  const cursorEl = document.getElementById('cursor');
  const massEl = cursorEl && cursorEl.querySelector('.cursor-mass');
  const dotEl = cursorEl && cursorEl.querySelector('.cursor-dot');
  const ringEl = cursorEl && cursorEl.querySelector('.cursor-ring');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const PALETTE = ['#ffffff', '#ffffff', '#dfe6ff', '#c9d6ff', '#ff4fd8', '#8b5cff', '#3ee8ff'];
  const BURST = ['#ff4fd8', '#8b5cff', '#3ee8ff', '#ffffff', '#ffb3f0'];

  let W = 0, H = 0, DPR = 1, F = 1;
  let stars = [];
  let nebula = null;
  const trail = [];
  const sparks = [];
  const waves = [];

  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, inside: false, down: false, downAt: 0, downX: 0, downY: 0 };
  const hole = { active: false, mass: 0, eaten: 0, spin: 0 };
  const cam = { x: 0, y: 0 };
  let warp = 0, warpTarget = 0, hyper = 0;
  let lastScroll = window.scrollY;
  let flash = 0;
  let nextShooting = performance.now() + 3000;
  let running = true;

  /* ---------- setup ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    F = Math.max(W, H) * 0.5;
    const target = Math.round(Math.min(950, Math.max(260, (W * H) / 1700)));
    while (stars.length < target) stars.push(makeStar(true));
    stars.length = target;
    buildNebula();
  }

  function makeStar(anyDepth) {
    const s = { x: 0, y: 0, z: 0, px: null, py: null, ox: 0, oy: 0, vx: 0, vy: 0, c: '', tw: 0 };
    respawn(s, anyDepth);
    return s;
  }
  function respawn(s, anyDepth) {
    const spanX = (W / F) * 1.15, spanY = (H / F) * 1.15;
    s.x = (Math.random() * 2 - 1) * spanX;
    s.y = (Math.random() * 2 - 1) * spanY;
    s.z = anyDepth ? 0.06 + Math.random() * 0.94 : 1;
    s.px = s.py = null;
    s.ox = s.oy = s.vx = s.vy = 0;
    s.c = PALETTE[(Math.random() * PALETTE.length) | 0];
    s.tw = Math.random() * Math.PI * 2;
  }

  function buildNebula() {
    const nw = Math.max(2, Math.round(W / 3)), nh = Math.max(2, Math.round(H / 3)) * 2; // twice as tall: scrolls with page
    const off = document.createElement('canvas');
    off.width = nw; off.height = nh;
    const n = off.getContext('2d');
    n.fillStyle = '#07051a'; n.fillRect(0, 0, nw, nh);
    const blobs = [
      [0.15, 0.10, 0.55, 'rgba(139,92,255,0.30)'],
      [0.85, 0.20, 0.50, 'rgba(255,79,216,0.20)'],
      [0.55, 0.45, 0.60, 'rgba(62,232,255,0.10)'],
      [0.10, 0.65, 0.55, 'rgba(255,79,216,0.16)'],
      [0.90, 0.85, 0.60, 'rgba(139,92,255,0.26)'],
      [0.45, 0.98, 0.45, 'rgba(62,232,255,0.12)']
    ];
    for (const [bx, by, br, col] of blobs) {
      const g = n.createRadialGradient(bx * nw, by * nh, 0, bx * nw, by * nh, br * Math.max(nw, nh / 2));
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = g; n.fillRect(0, 0, nw, nh);
    }
    nebula = off;
  }

  /* ---------- input ---------- */
  function isInteractive(el) {
    return !!(el && el.closest && el.closest('a, button, input, textarea, select, label, [role="button"], .shot'));
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
    if (!reduce && trail.length < 140) {
      const n = hole.active ? 0 : 2;
      for (let i = 0; i < n; i++) trail.push({
        x: e.clientX + (Math.random() - .5) * 6, y: e.clientY + (Math.random() - .5) * 6,
        vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 30 + 10,
        life: 1, c: Math.random() < .5 ? '#ff4fd8' : '#3ee8ff', r: 1 + Math.random() * 2
      });
    }
  }, { passive: true });

  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { mouse.inside = false; cursorEl && cursorEl.classList.add('is-hidden'); } });
  document.addEventListener('mouseover', (e) => {
    if (mouse.x > -999) mouse.inside = true;
    if (!cursorEl) return;
    cursorEl.classList.remove('is-hidden');
    const t = e.target;
    const text = t.closest && t.closest('input, textarea');
    cursorEl.classList.toggle('is-text', !!text);
    cursorEl.classList.toggle('is-link', !text && isInteractive(t));
  });

  let holdTimer = 0;
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    mouse.downAt = performance.now(); mouse.downX = e.clientX; mouse.downY = e.clientY;
    if (e.pointerType !== 'mouse' || isInteractive(e.target) || gameClaimed()) return;
    mouse.down = true;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!mouse.down) return;
      hole.active = true; hole.mass = 0; hole.eaten = 0;
      document.body.style.userSelect = 'none';
      window.getSelection && window.getSelection().removeAllRanges();
      cursorEl && cursorEl.classList.add('is-hold');
    }, 170);
  }, { passive: true });

  function release(e) {
    clearTimeout(holdTimer);
    const quick = performance.now() - mouse.downAt < 300 &&
      Math.hypot(e.clientX - mouse.downX, e.clientY - mouse.downY) < 10;
    if (hole.active) {
      supernova(mouse.x, mouse.y, 1 + Math.min(hole.eaten, 160) / 22 + hole.mass * .6);
      hole.active = false;
      document.body.style.userSelect = '';
      cursorEl && cursorEl.classList.remove('is-hold');
    } else if (quick && e.button === 0 && !isInteractive(e.target) && !gameClaimed()) {
      supernova(e.clientX, e.clientY, e.pointerType === 'mouse' ? 0.7 : 0.9);
    }
    mouse.down = false;
  }
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', () => {
    clearTimeout(holdTimer); mouse.down = false;
    if (hole.active) { hole.active = false; document.body.style.userSelect = ''; cursorEl && cursorEl.classList.remove('is-hold'); }
  });
  window.addEventListener('blur', () => { if (hole.active) release({ clientX: mouse.x, clientY: mouse.y, button: 0, pointerType: 'mouse', target: document.body }); });

  function gameClaimed() { return window.LG_GAME_CLAIM && performance.now() - window.LG_GAME_CLAIM < 600; }

  function supernova(x, y, power) {
    if (window.LG_onNova) { try { window.LG_onNova(x, y, power); } catch (err) {} }
    waves.push({ x, y, r: 0, speed: 700 + power * 260, power, life: 1 });
    const count = Math.min(320, Math.round(26 + power * 34));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 380) * (0.6 + power * 0.35);
      sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: .5 + Math.random() * .7, c: BURST[(Math.random() * BURST.length) | 0], r: .8 + Math.random() * 2.2 });
    }
    flash = Math.min(0.35, 0.06 + power * 0.04);
  }

  // Easter egg: type "lazy" or the Konami code
  const keys = [];
  const KONAMI = 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a';
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    keys.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (keys.length > 10) keys.shift();
    const s = keys.join(',');
    if (s.endsWith('l,a,z,y') || s === KONAMI) engageHyperdrive();
  });
  function engageHyperdrive() {
    if (reduce) return;
    hyper = 3.2;
    root.classList.add('hyper');
    setTimeout(() => { root.classList.remove('hyper'); supernova(W / 2, H / 2, 4); }, 3000);
  }
  window.LG_HYPERDRIVE = engageHyperdrive;
  window.LG_SUPERNOVA = supernova;
  window.LG_GALAXY = { hole, mouse };

  if (finePointer && cursorEl) root.classList.add('has-cursor');

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
  let rT = 0;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 120); });

  /* ---------- frame ---------- */
  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt, now);
    draw(now);
    requestAnimationFrame(frame);
  }

  function step(dt, now) {
    // scroll → warp
    const sy = window.scrollY;
    const dy = Math.abs(sy - lastScroll); lastScroll = sy;
    if (!reduce) warpTarget = Math.min(1.6, warpTarget * 0.9 + Math.min(dy, 220) * 0.004);
    warp += (warpTarget - warp) * Math.min(1, dt * 6);
    warpTarget *= Math.pow(0.02, dt);
    if (hyper > 0) hyper -= dt;

    // smoothed mouse & camera parallax
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 18);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 18);
    const clamp = (v) => Math.max(-0.5, Math.min(0.5, v));
    const tx = mouse.inside ? clamp((mouse.x - W / 2) / W) : 0, ty = mouse.inside ? clamp((mouse.y - H / 2) / H) : 0;
    cam.x += (tx - cam.x) * Math.min(1, dt * 2);
    cam.y += (ty - cam.y) * Math.min(1, dt * 2);

    if (hole.active) { hole.mass = Math.min(8, hole.mass + dt * 1.4); hole.spin += dt * (2 + hole.mass); }

    // star motion
    const base = reduce ? 0.006 : 0.022;
    const speed = base + warp * 0.35 + (hyper > 0 ? 1.6 : 0);
    const cx = W / 2 - cam.x * 60, cy = H / 2 - cam.y * 60;
    const coreR = 10 + hole.mass * 4;

    for (const s of stars) {
      s.z -= speed * dt * (0.4 + (1 - s.z) * 0.6 + 0.3);
      if (s.z < 0.04) { respawn(s, false); continue; }

      const bx = cx + (s.x / s.z) * F, by = cy + (s.y / s.z) * F;

      // forces on the star's 2D offset
      let ax = -s.ox * 6, ay = -s.oy * 6;           // spring back home
      if (hole.active) {
        const dx = mouse.x - (bx + s.ox), dy2 = mouse.y - (by + s.oy);
        const d = Math.hypot(dx, dy2) + 0.001;
        const reach = 260 + hole.mass * 70;
        if (d < reach) {
          const pull = (1 - d / reach) * (1400 + hole.mass * 700);
          ax += (dx / d) * pull - (dy2 / d) * pull * 0.9;   // inward + swirl
          ay += (dy2 / d) * pull + (dx / d) * pull * 0.9;
          if (d < coreR) { hole.eaten++; respawn(s, false); continue; }
        }
      }
      for (const w of waves) {
        const dx = bx + s.ox - w.x, dy2 = by + s.oy - w.y;
        const d = Math.hypot(dx, dy2) + 0.001;
        const band = 60 + w.power * 10;
        if (Math.abs(d - w.r) < band) {
          const k = (1 - Math.abs(d - w.r) / band) * w.life * (1400 + w.power * 600);
          ax += (dx / d) * k; ay += (dy2 / d) * k;
        }
      }
      s.vx = (s.vx + ax * dt) * Math.pow(0.12, dt);
      s.vy = (s.vy + ay * dt) * Math.pow(0.12, dt);
      s.ox += s.vx * dt; s.oy += s.vy * dt;

      if (bx < -200 || bx > W + 200 || by < -200 || by > H + 200) respawn(s, false);
    }

    for (const w of waves) { w.r += w.speed * dt; w.life -= dt * 0.9; }
    for (let i = waves.length - 1; i >= 0; i--) if (waves[i].life <= 0) waves.splice(i, 1);

    for (const p of trail) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.2; }
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].life <= 0) trail.splice(i, 1);

    for (const p of sparks) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.pow(0.25, dt); p.vy *= Math.pow(0.25, dt);
      p.life -= dt * p.decay;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);

    if (flash > 0) flash = Math.max(0, flash - dt * 0.8);

    // shooting star
    if (!reduce && now > nextShooting) {
      nextShooting = now + 4000 + Math.random() * 6000;
      const fromLeft = Math.random() < .5;
      const x = fromLeft ? Math.random() * W * .5 : W * .5 + Math.random() * W * .5;
      const ang = (fromLeft ? 0.35 : Math.PI - 0.35) + (Math.random() - .5) * .3;
      const sp = 900 + Math.random() * 500;
      sparks.push({ x, y: Math.random() * H * .4, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, decay: .9, c: '#ffffff', r: 1.6, streak: true });
    }

    // cursor element
    if (cursorEl && root.classList.contains('has-cursor')) {
      dotEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      ringEl.style.transform = `translate3d(${mouse.sx}px, ${mouse.sy}px, 0)`;
      massEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      if (hole.active) massEl.textContent = `MASS × ${hole.eaten}`;
    }
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // solid clear, then nebula backdrop (parallax with scroll + mouse)
    ctx.fillStyle = '#07051a'; ctx.fillRect(0, 0, W, H);
    if (nebula) {
      const docH = Math.max(1, document.documentElement.scrollHeight - H);
      const prog = Math.min(1, window.scrollY / docH);
      const extra = H; // nebula is 2x viewport tall
      ctx.drawImage(nebula, -20 - cam.x * 30, -prog * extra - 20 - cam.y * 30, W + 40, H * 2 + 40);
    }

    const cx = W / 2 - cam.x * 60, cy = H / 2 - cam.y * 60;
    const lensOn = mouse.inside && !hole.active && finePointer;
    const LR = 120;
    const streakK = Math.min(1, warp * 0.9 + (hyper > 0 ? 1 : 0));

    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      let x = cx + (s.x / s.z) * F + s.ox;
      let y = cy + (s.y / s.z) * F + s.oy;

      // gravitational lens: stars bow away from the cursor
      if (lensOn) {
        const dx = x - mouse.sx, dy = y - mouse.sy;
        const d = Math.hypot(dx, dy) + 0.001;
        if (d < LR * 2.2) {
          const f = 1 - d / (LR * 2.2);
          const push = Math.min(70, (LR * LR) / (d + 30)) * f * f;
          x += (dx / d) * push; y += (dy / d) * push;
        }
      }

      const depth = 1 - s.z;
      const size = 0.9 + depth * depth * 2.6;
      const tw = 0.75 + 0.25 * Math.sin(now * 0.003 + s.tw);
      const a = Math.min(1, 0.38 + depth * 1.1) * tw;
      ctx.globalAlpha = a;

      if (streakK > 0.05 && s.px !== null) {
        ctx.strokeStyle = s.c;
        ctx.lineWidth = Math.max(0.6, size * 0.8);
        ctx.beginPath();
        let ddx = (s.px - x) * (1 + streakK * 3), ddy = (s.py - y) * (1 + streakK * 3);
        const len = Math.hypot(ddx, ddy), maxL = 30 + streakK * 110;
        if (len > maxL) { ddx *= maxL / len; ddy *= maxL / len; }
        ctx.moveTo(x, y);
        ctx.lineTo(x + ddx, y + ddy);
        ctx.stroke();
      } else {
        ctx.fillStyle = s.c;
        if (size < 1.4) ctx.fillRect(x - size / 2, y - size / 2, size, size);
        else { ctx.beginPath(); ctx.arc(x, y, size / 2, 0, 6.2832); ctx.fill(); }
      }
      s.px = x; s.py = y;
    }

    // lens glow ring
    if (lensOn) {
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, LR * 1.4);
      g.addColorStop(0, 'rgba(139,92,255,0.10)');
      g.addColorStop(0.55, 'rgba(255,79,216,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(mouse.sx, mouse.sy, LR * 1.4, 0, 6.2832); ctx.fill();
    }

    // trail
    for (const p of trail) {
      ctx.globalAlpha = Math.max(0, p.life) * 0.85;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life + 0.3, 0, 6.2832); ctx.fill();
    }

    // sparks & shooting stars
    for (const p of sparks) {
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.streak) {
        ctx.strokeStyle = p.c; ctx.lineWidth = p.r;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.09, p.y - p.vy * 0.09); ctx.stroke();
      } else {
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + p.life * 0.6), 0, 6.2832); ctx.fill();
      }
    }

    // shockwaves
    for (const w of waves) {
      ctx.globalAlpha = Math.max(0, w.life) * 0.7;
      ctx.strokeStyle = '#3ee8ff'; ctx.lineWidth = 2 + w.power;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = Math.max(0, w.life) * 0.45;
      ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r * 0.82, 0, 6.2832); ctx.stroke();
    }

    // black hole
    if (hole.active) {
      const m = hole.mass, x = mouse.x, y = mouse.y;
      const core = 10 + m * 4, disk = core * 3.2;
      ctx.globalAlpha = 1;
      const glow = ctx.createRadialGradient(x, y, core, x, y, disk * 1.8);
      glow.addColorStop(0, 'rgba(255,79,216,0.55)');
      glow.addColorStop(0.35, 'rgba(139,92,255,0.25)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, disk * 1.8, 0, 6.2832); ctx.fill();
      // accretion arcs
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = core * (1.5 + i * 0.55);
        ctx.strokeStyle = i === 1 ? '#3ee8ff' : '#ff4fd8';
        ctx.globalAlpha = 0.7 - i * 0.18;
        ctx.lineWidth = 2.2 - i * 0.5;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.35, r * 0.55, -0.4, hole.spin * (1 + i * .3), hole.spin * (1 + i * .3) + 4.2); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(x, y, core, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,250,0.9)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, core + 0.8, 0, 6.2832); ctx.stroke();
    }

    if (flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#8b5cff';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  resize();
  requestAnimationFrame(frame);
})();
