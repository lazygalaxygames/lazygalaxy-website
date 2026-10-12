/* =============================================================
   LAZY GALAXY — DEFEND THE GALAXY (incremental clicker)
   Aliens + asteroids float over the whole site. Click them for coins.
   Waves get tougher, boss every 10 waves, research constellation,
   Big Bang prestige. Progress is saved in the browser.
   ============================================================= */
(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const GAMES = window.LG_GAMES || [];
  const GX = () => window.LG_GALAXY || { hole: { active: false, mass: 0 }, mouse: { x: -9999, y: -9999 } };

  let W = 0, H = 0, DPR = 1, small = false;

  /* ---------------- save ---------------- */
  const KEY = 'lg-galaxy-defense-v1';
  const fresh = () => ({ v: 1, coins: 0, total: 0, wave: 1, best: 1, prog: 0, kills: 0, bosses: 0, clicks: 0,
    r: {}, stardust: 0, bangs: 0, ach: {}, off: false, cps: 0, seen: Date.now(), golds: 0, introDone: false });
  let S = load();
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 1) return Object.assign(fresh(), j); } catch (e) {}
    return fresh();
  }
  function save() { S.seen = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  setInterval(save, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  /* ---------------- research tree ---------------- */
  const RES = [
    { id: 'blaster', icon: '👆', name: 'Photon Finger', max: 200, base: 10, grow: 1.25, req: [], x: 50, y: 90,
      desc: 'Every click hits harder. Damage doubles every 10 levels.', fx: (l) => `${fmt(baseDmg(l))} per click` },
    { id: 'crit', icon: '🍀', name: 'Lucky Photon', max: 10, base: 40, grow: 1.8, req: [['blaster', 2]], x: 24, y: 74,
      desc: 'Chance for a click to land a critical hit.', fx: (l) => `${l * 5}% crit chance` },
    { id: 'critdmg', icon: '💥', name: 'Cosmic Crits', max: 6, base: 450, grow: 2.3, req: [['crit', 3]], x: 10, y: 52,
      desc: 'Critical hits explode harder.', fx: (l) => `crits deal ×${5 + l * 2}` },
    { id: 'nova', icon: '🌟', name: 'Supernova', max: 5, base: 70, grow: 2.1, req: [['blaster', 3]], x: 38, y: 64,
      desc: 'Clicking empty space releases a shockwave that damages nearby aliens.', fx: (l) => `shockwave = ${Math.round(l * 60)}% of click` },
    { id: 'hole', icon: '🕳️', name: 'Event Horizon', max: 5, base: 650, grow: 2.4, req: [['nova', 2]], x: 24, y: 34,
      desc: 'Hold the mouse to open a black hole. Aliens caught in it get crushed. Release for a giant supernova.', fx: (l) => `${l * 2}× click damage / sec` },
    { id: 'drone', icon: '🤖', name: 'Scout Drones', max: 5, base: 120, grow: 2.3, req: [['blaster', 4]], x: 62, y: 64,
      desc: 'Little drones orbit your cursor and shoot the nearest alien.', fx: (l) => `${l} drone${l === 1 ? '' : 's'}` },
    { id: 'overclock', icon: '⚡', name: 'Overclock', max: 5, base: 520, grow: 2.2, req: [['drone', 2]], x: 76, y: 46,
      desc: 'Drones fire faster.', fx: (l) => `+${l * 30}% fire rate` },
    { id: 'magnet', icon: '🧲', name: 'Coin Magnet', max: 10, base: 50, grow: 1.9, req: [['blaster', 2]], x: 76, y: 78,
      desc: 'More coins from everything.', fx: (l) => `+${l * 25}% coins` },
    { id: 'mining', icon: '⛏️', name: 'Asteroid Mining', max: 5, base: 160, grow: 2.0, req: [['magnet', 1]], x: 92, y: 62,
      desc: 'Asteroids drop far more coins, and more of them drift by.', fx: (l) => `asteroids ×${1 + l * 2} coins` },
    { id: 'golden', icon: '✨', name: 'Golden UFO', max: 3, base: 1500, grow: 4, req: [['magnet', 3]], x: 90, y: 36,
      desc: 'A rare golden UFO zips past. Catch it for a pile of coins and a 10-second ×7 FRENZY.', fx: (l) => l ? `every ~${[0, 90, 65, 45][l]}s` : 'locked' },
    { id: 'comet', icon: '☄️', name: 'Comet Strike', max: 5, base: 2400, grow: 2.5, req: [['nova', 1], ['drone', 1]], x: 50, y: 44,
      desc: 'Every few seconds a comet slams into an alien.', fx: (l) => l ? `${15 * l}× click, every ${10 - l}s` : 'none' },
    { id: 'fleet', icon: '🛰️', name: 'Game Fleet', max: 10, base: 7500, grow: 2.2, req: [['comet', 1]], x: 50, y: 24,
      desc: 'Lazy Galaxy’s own games join the fight: their icons orbit the screen and fire lasers.', fx: (l) => `${l * 2} games in orbit` },
    { id: 'timewarp', icon: '⏳', name: 'Time Warp', max: 5, base: 5000, grow: 3, req: [['overclock', 1]], x: 74, y: 20,
      desc: 'Keep earning while you’re away (up to 8 hours).', fx: (l) => `${l * 10}% of your earning rate offline` },
    { id: 'bigbang', icon: '🌌', name: 'Big Bang', max: 0, base: 0, grow: 1, req: [], x: 50, y: 6, special: true,
      desc: 'Reset waves, coins and research to collapse the universe into Stardust. Each Stardust permanently adds +10% damage and coins. Unlocks at wave 20.', fx: () => '' }
  ];
  const RMAP = Object.fromEntries(RES.map((n) => [n.id, n]));
  const lvl = (id) => S.r[id] || 0;
  const cost = (n) => Math.ceil(n.base * Math.pow(n.grow, lvl(n.id)));
  const reqOk = (n) => n.req.every(([id, l]) => lvl(id) >= l);
  const stardustGain = () => (S.best >= 20 ? Math.floor(1.5 * Math.pow(S.best - 15, 1.3)) : 0);

  /* ---------------- stats ---------------- */
  let frenzyT = 0;
  const achBonus = () => 1 + 0.02 * Object.keys(S.ach).length;
  const baseDmg = (l) => (1 + l) * Math.pow(2, Math.floor(l / 10));
  const mult = () => (1 + 0.1 * S.stardust);
  const clickDmg = () => baseDmg(lvl('blaster')) * mult() * (frenzyT > 0 ? 7 : 1);
  const coinMult = () => (1 + 0.25 * lvl('magnet')) * mult() * achBonus();
  const hpFor = (w) => Math.ceil(5 * Math.pow(1.12, w - 1));
  const coinFor = (w) => Math.ceil(1.6 * Math.pow(1.13, w - 1));
  const isBossWave = (w) => w % 10 === 0;
  const KILLS_PER_WAVE = 8;

  /* ---------------- entities ---------------- */
  const TYPES = [
    { k: 'blorp', names: ['Blorp', 'Glorb', 'Splooch', 'Gary'], cols: ['#7CF29A', '#5EE6C9', '#B6F36B'] },
    { k: 'zib', names: ['Zib', 'Zorp', 'Mr. Saucer'], cols: ['#9AA7FF', '#B48CFF', '#7FD3FF'] },
    { k: 'squid', names: ['Squiddo', 'Jelly Jim', 'Inkling'], cols: ['#FF7AD9', '#FF9AA8', '#C38BFF'] },
    { k: 'spike', names: ['Spikey', 'Cyclo', 'Pokey'], cols: ['#FFB04D', '#FFD84D', '#FF8A5B'] },
    { k: 'tooth', names: ['Chompers', 'Gnasher', 'Molar'], cols: ['#5BD6FF', '#FF6B6B', '#8CF0C8'] }
  ];
  const BOSSES = ['King Blorp', 'The Mothership', 'Mega Squiddo', 'Lord Spikington', 'Grand Chomper'];
  const SAY_SPAWN = ['hi', 'we come in peace', 'nice website', '👀', 'is this the game studio?', 'beep boop', 'take me to your dev'];
  const SAY_HIT = ['ow', 'rude', 'hey!', 'not the face', 'i bruise easily', 'my mom will hear about this', 'ok that one hurt', '>:(', 'why', 'stop it'];
  const SAY_BOSS = ['you dare?', 'I AM INEVITABLE', 'this galaxy is mine', 'pathetic clicks'];

  let enemies = [];
  const parts = [];
  const lasers = [];
  const comets = [];
  let bossT = 0;
  let spawnT = 1.2, rockT = 2, goldT = 60, cometT = 6, droneT = 0, fleetT = 0, t = 0;
  const aim = { x: -1, y: -1 };

  const pick = (a) => a[(Math.random() * a.length) | 0];
  const rand = (a, b) => a + Math.random() * (b - a);

  function safeArea() { return { x0: small ? 40 : 70, x1: W - (small ? 40 : 70), y0: small ? 130 : 160, y1: H - (small ? 50 : 70) }; }

  function spawnEnemy(boss) {
    const tp = boss ? TYPES[((S.wave / 10 - 1) | 0) % TYPES.length] : pick(TYPES);
    const a = safeArea();
    const hp = boss ? hpFor(S.wave) * 12 : hpFor(S.wave);
    const r = boss ? (small ? 80 : 110) : (small ? rand(30, 36) : rand(42, 54));
    // warp in somewhere on screen (not too close to the cursor)
    let x = W / 2, y = H / 2;
    for (let k = 0; k < 8; k++) {
      const top = a.y0 + r * (boss ? 1.3 : .5); x = rand(a.x0 + r, Math.max(a.x0 + r, a.x1 - r)); y = rand(top, Math.max(top, a.y1 - r));
      if (Math.hypot(x - aim.x, y - aim.y) > 220) break;
    }
    parts.push({ k: 'ring', x, y, r: r * 0.6, life: 1, col: '#3ee8ff' });
    const e = {
      kind: 'alien', type: tp.k, name: boss ? BOSSES[((S.wave / 10 - 1) | 0) % BOSSES.length] : pick(tp.names), col: pick(tp.cols),
      x, y, vx: 0, vy: 0, r, hp, max: hp, boss: !!boss, ph: Math.random() * 6.28, sq: 1, flash: 0,
      tx: x, ty: y, grow: 0, blink: rand(1, 4), pup: [0, 0], say: '', sayT: 0, hit: false, rot: 0
    };
    if (Math.random() < 0.35 || boss) speak(e, boss ? pick(SAY_BOSS) : pick(SAY_SPAWN), 2.2);
    enemies.push(e);
    return e;
  }
  function spawnRock(x, y, size) {
    const a = safeArea();
    const s = size || pick([1, 2, 2, 3]);
    const fromLeft = Math.random() < 0.5;
    const r = (small ? 12 : 16) * s + 8;
    const verts = Array.from({ length: 9 }, () => rand(0.72, 1.12));
    const hp = Math.max(1, Math.ceil(hpFor(S.wave) * 0.25 * s));
    enemies.push({
      kind: 'rock', s, r, verts, x: x ?? (fromLeft ? -40 : W + 40), y: y ?? rand(a.y0, a.y1),
      vx: x != null ? rand(-60, 60) : (fromLeft ? 1 : -1) * rand(12, 28), vy: x != null ? rand(-60, 60) : rand(-6, 6),
      rot: Math.random() * 6, vr: rand(-1, 1), hp, max: hp, sq: 1, flash: 0, hit: false,
      craters: Array.from({ length: 3 }, () => [rand(-.4, .4), rand(-.4, .4), rand(.12, .22)])
    });
  }
  function spawnGold() {
    const fromLeft = Math.random() < 0.5;
    const a = safeArea();
    enemies.push({ kind: 'gold', x: fromLeft ? -60 : W + 60, y: rand(a.y0, a.y0 + (a.y1 - a.y0) * 0.6), vx: (fromLeft ? 1 : -1) * rand(110, 140), vy: 0,
      r: small ? 32 : 40, hp: 1, max: 1, sq: 1, flash: 0, ph: 0, rot: 0, hit: false });
    toast('✨ A golden UFO! Catch it!');
  }
  function speak(e, txt, dur) { e.say = txt; e.sayT = dur || 1.6; }

  /* ---------------- combat ---------------- */
  function damage(e, amt, src) {
    if (e.dead) return;
    let crit = false;
    if (src.click) {
      const cc = 0.05 * lvl('crit');
      if (Math.random() < cc) { crit = true; amt *= 5 + 2 * lvl('critdmg'); }
    }
    e.hp -= amt; e.hit = true;
    e.flash = 1; e.sq = src.click ? 1.3 : Math.max(e.sq, 1.12);
    if (src.x != null) {
      const dx = e.x - src.x, dy = e.y - src.y, d = Math.hypot(dx, dy) || 1;
      const kb = (src.click ? 70 : 30) * (e.boss ? 0.25 : 1);
      e.vx += dx / d * kb; e.vy += dy / d * kb;
    }
    if (src.click || crit || src.big) {
      text(e.x + rand(-12, 12), e.y - e.r - 6, (crit ? 'CRIT ' : '') + fmt(amt), crit ? '#ff4fd8' : '#fff', crit ? 22 : 16);
      sparks(src.x ?? e.x, src.y ?? e.y, crit ? 14 : 6, crit ? '#ff4fd8' : '#3ee8ff');
    }
    if (e.kind === 'alien' && src.click && Math.random() < 0.12 && e.sayT <= 0) speak(e, pick(SAY_HIT));
    if (e.hp <= 0) kill(e, src);
  }

  function kill(e, src) {
    e.dead = true;
    enemies = enemies.filter((x) => x !== e);
    let reward = 0;
    if (e.kind === 'alien') {
      reward = coinFor(S.wave) * (e.boss ? 15 : 1) * coinMult();
      S.kills++;
      pop(e.x, e.y, e.r, e.col, e.boss ? 60 : 18);
      if (src && src.hole) unlock('hole');
      if (e.boss) {
        S.bosses++; bossT = 0; unlock('boss1');
        toast(`👑 ${e.name} defeated!`);
        if (window.LG_SUPERNOVA) { novaGuard = true; window.LG_SUPERNOVA(e.x, e.y, 3); novaGuard = false; }
        nextWave();
      } else if (!isBossWave(S.wave)) {
        S.prog++;
        if (S.prog >= KILLS_PER_WAVE) nextWave();
      }
      unlock('first');
    } else if (e.kind === 'rock') {
      reward = coinFor(S.wave) * 0.3 * e.s * (1 + 2 * lvl('mining')) * coinMult();
      pop(e.x, e.y, e.r, '#a89a8a', 10);
      if (e.s > 1) for (let i = 0; i < 2; i++) spawnRock(e.x, e.y, e.s - 1);
    } else if (e.kind === 'gold') {
      reward = coinFor(S.wave) * 30 * coinMult();
      frenzyT = 10; S.golds++; unlock('gold');
      pop(e.x, e.y, e.r, '#ffd84d', 40);
      toast('⚡ FRENZY ×7 damage for 10s!');
    }
    reward = Math.ceil(reward);
    earn(reward);
    coinsFly(e.x, e.y, Math.min(e.boss ? 16 : 6, 2 + Math.ceil(Math.log10(reward + 1) * 2)));
    text(e.x, e.y, '+' + fmt(reward), '#ffd84d', e.boss ? 26 : 17, true);
  }

  function earn(n) {
    S.coins += n; S.total += n; earnedWindow += n;
    if (S.total >= 1e6) unlock('mil');
  }

  function nextWave() {
    S.wave++; S.prog = 0; S.best = Math.max(S.best, S.wave);
    if (S.wave >= 25) unlock('w25');
    if (isBossWave(S.wave)) {
      enemies.forEach((e) => { if (e.kind === 'alien') { e.flee = true; } });
      const b = spawnEnemy(true);
      bossT = 30;
      bossName = b.name;
      toast(`👑 BOSS: ${b.name} — 30 seconds!`);
    } else {
      waveFlash = 1.6;
    }
    save();
  }
  let bossName = '', waveFlash = 0;

  function bossFail() {
    const b = enemies.find((e) => e.boss);
    if (b) { b.flee = true; speak(b, 'lol. bye.', 2); b.boss = false; b.kind = 'leaving'; }
    S.wave = Math.max(1, S.wave - 1); S.prog = 0; bossT = 0;
    toast('Boss escaped. Clear this wave to challenge it again.');
  }

  /* supernova from galaxy.js (clicks on empty space, black hole release) */
  let novaGuard = false;
  window.LG_onNova = function (x, y, power) {
    if (S.off) return;
    const R = 120 + power * 70;
    const nl = lvl('nova');
    enemies.forEach((e) => {
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R + e.r) {
        const f = 1 - d / (R + e.r);
        e.vx += dx / d * 500 * f * (e.boss ? .3 : 1); e.vy += dy / d * 500 * f * (e.boss ? .3 : 1);
        if (nl && !novaGuard) damage(e, clickDmg() * 0.6 * nl * Math.max(0.6, power) * (0.4 + f), { x, y, big: true });
      }
    });
  };

  /* ---------------- particles ---------------- */
  function text(x, y, s, col, size, rise) { parts.push({ k: 'text', x, y, vx: 0, vy: rise ? -60 : -40, life: 1, s, col, size }); }
  function sparks(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rand(80, 260); parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(.4, .8), col, r: rand(1, 2.5) }); }
  }
  function pop(x, y, r, col, n) {
    parts.push({ k: 'ring', x, y, r, life: 1, col });
    const C = [col, '#ffffff', '#ff4fd8', '#3ee8ff', '#ffd84d'];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rand(100, 380); parts.push({ k: 'conf', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: rand(.7, 1.3), col: pick(C), r: rand(2, 4.5), rot: rand(0, 6), vr: rand(-10, 10) }); }
  }
  function coinsFly(x, y, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = rand(90, 220); parts.push({ k: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, age: -i * 0.05, r: small ? 11 : 13, spin: Math.random() * 6 }); }
  }

  /* ---------------- input ---------------- */
  let claimed = false;
  const hitAt = (x, y, pad) => {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.kind === 'leaving') continue;
      if (Math.hypot(e.x - x, e.y - y) < e.r * 1.1 + (pad || 0)) return e;
    }
    return null;
  };
  window.addEventListener('pointerdown', (e) => {
    claimed = false;
    aim.x = e.clientX; aim.y = e.clientY;
    if (S.off || e.button !== 0) return;
    if (e.target.closest && e.target.closest('input, textarea, select, .hud, .rs, .gtoast')) return;
    const en = hitAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 14 : 4);
    if (!en) return;
    claimed = true;
    window.LG_GAME_CLAIM = performance.now();
    S.clicks++; if (S.clicks >= 1000) unlock('clicks');
    damage(en, clickDmg(), { click: true, x: e.clientX, y: e.clientY });
    hideHint();
  }, { capture: true });
  // don't let a click on an alien also follow a link underneath it
  window.addEventListener('click', (e) => { if (claimed) { e.preventDefault(); e.stopPropagation(); claimed = false; } }, { capture: true });
  window.addEventListener('pointermove', (e) => { aim.x = e.clientX; aim.y = e.clientY; }, { passive: true });

  /* ---------------- HUD ---------------- */
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <button class="hud-chip hud-coins" id="hud-coins-btn" type="button" title="Coins"><span class="coin" aria-hidden="true"></span><b id="hud-coins">0</b></button>
    <div class="hud-chip hud-wave" title="Wave progress"><span id="hud-wave">Wave 1</span><i class="hud-bar"><b id="hud-prog"></b></i></div>
    <span class="hud-chip hud-frenzy" id="hud-frenzy" hidden>FRENZY ×7</span>
    <button class="hud-chip hud-research" id="hud-research" type="button">Research</button>
    <button class="hud-chip hud-icon" id="hud-off" type="button" title="Hide the game" aria-label="Hide the game">✕</button>`;
  document.body.appendChild(hud);
  const playBtn = document.createElement('button');
  playBtn.className = 'hud-play'; playBtn.type = 'button'; playBtn.innerHTML = '<span class="coin" aria-hidden="true"></span> Play the galaxy';
  document.body.appendChild(playBtn);
  const bossBar = document.createElement('div');
  bossBar.className = 'boss-bar'; bossBar.hidden = true;
  bossBar.innerHTML = '<span id="boss-name"></span><i class="boss-hp"><b id="boss-hp"></b></i><span id="boss-time"></span>';
  document.body.appendChild(bossBar);
  const toasts = document.createElement('div'); toasts.className = 'gtoast'; document.body.appendChild(toasts);

  const elCoins = document.getElementById('hud-coins'), elWave = document.getElementById('hud-wave'), elProg = document.getElementById('hud-prog');
  const elRes = document.getElementById('hud-research'), elFrenzy = document.getElementById('hud-frenzy');
  const elBossName = document.getElementById('boss-name'), elBossHp = document.getElementById('boss-hp'), elBossTime = document.getElementById('boss-time');
  const coinBtn = document.getElementById('hud-coins-btn');

  function toast(msg) {
    const d = document.createElement('div'); d.className = 'gt'; d.textContent = msg;
    toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3100);
    while (toasts.children.length > 3) toasts.firstChild.remove();
  }
  function hideHint() { if (!S.introDone) { S.introDone = true; enemies.forEach((e) => { if (e.say && e.say.startsWith('psst')) e.sayT = 0; }); } }

  document.getElementById('hud-off').addEventListener('click', () => setOff(true));
  playBtn.addEventListener('click', () => setOff(false));
  elRes.addEventListener('click', () => openRS());
  coinBtn.addEventListener('click', () => openRS());
  function setOff(v) {
    S.off = v; save();
    root.classList.toggle('game-off', v);
    if (v) { enemies = []; parts.length = 0; bossT = 0; bossBar.hidden = true; }
    else { spawnT = 0.3; toast('Defend the galaxy! Click the aliens.'); }
  }
  root.classList.toggle('game-off', S.off);

  const ACH = {
    first: 'First contact — your first alien', boss1: 'Boss down', w25: 'Deep space — wave 25', mil: 'Space millionaire',
    clicks: 'Clicky fingers — 1,000 clicks', hole: 'Event horizon — a black-hole kill', gold: 'Golden touch', bang: 'Big Bang'
  };
  function unlock(k) {
    if (S.ach[k]) return;
    S.ach[k] = 1; toast('🏆 ' + ACH[k] + '  (+2% coins)');
  }

  /* ---------------- research panel ---------------- */
  const rs = document.createElement('div');
  rs.className = 'rs'; rs.hidden = true; rs.setAttribute('role', 'dialog'); rs.setAttribute('aria-modal', 'true'); rs.setAttribute('aria-label', 'Research lab');
  rs.innerHTML = `
    <div class="rs-box">
      <header class="rs-head">
        <div><p class="eyebrow">Research lab</p><h3>The constellation</h3></div>
        <div class="rs-wallet"><span><span class="coin"></span><b id="rs-coins">0</b></span><span id="rs-dust" hidden>✦ <b></b> stardust</span></div>
        <button class="rs-x" type="button" aria-label="Close">✕</button>
      </header>
      <div class="rs-body">
        <div class="rs-map" id="rs-map"><svg class="rs-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div>
        <aside class="rs-detail" id="rs-detail"></aside>
      </div>
      <footer class="rs-foot" id="rs-foot"></footer>
    </div>`;
  document.body.appendChild(rs);
  const rsMap = rs.querySelector('#rs-map'), rsLines = rs.querySelector('.rs-lines'), rsDetail = rs.querySelector('#rs-detail');
  let sel = 'blaster', bangConfirm = false, lastSig = '';

  RES.forEach((n) => {
    n.req.forEach(([id]) => {
      const a = RMAP[id];
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', n.x); l.setAttribute('y2', n.y);
      l.dataset.to = n.id; l.dataset.from = id;
      rsLines.appendChild(l);
    });
    if (n.id === 'bigbang') ['fleet', 'hole', 'timewarp'].forEach((id) => {
      const a = RMAP[id];
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', n.x); l.setAttribute('y2', n.y);
      l.dataset.to = n.id; l.dataset.from = id; l.classList.add('faint');
      rsLines.appendChild(l);
    });
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rs-node' + (n.special ? ' special' : ''); b.dataset.id = n.id;
    b.style.left = n.x + '%'; b.style.top = n.y + '%';
    b.innerHTML = `<span class="rs-ic">${n.icon}</span><span class="rs-lv"></span>`;
    b.setAttribute('aria-label', n.name);
    b.addEventListener('click', () => { sel = n.id; bangConfirm = false; renderRS(); });
    b.addEventListener('dblclick', () => buy(n));
    rsMap.appendChild(b);
  });

  function openRS() { lastSig = ''; rs.hidden = false; root.classList.add('rs-open'); renderRS(); setTimeout(() => rs.querySelector('.rs-x').focus(), 30); }
  function closeRS() { rs.hidden = true; root.classList.remove('rs-open'); bangConfirm = false; }
  rs.querySelector('.rs-x').addEventListener('click', closeRS);
  rs.addEventListener('click', (e) => { if (e.target === rs) closeRS(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !rs.hidden) closeRS();
    const tg = e.target;
    if ((e.key === 'r' || e.key === 'R') && !(tg && /INPUT|TEXTAREA/.test(tg.tagName)) && !S.off && !e.metaKey && !e.ctrlKey) { rs.hidden ? openRS() : closeRS(); }
  });

  function buy(n) {
    if (n.special) return bigBang();
    if (!reqOk(n) || lvl(n.id) >= n.max) return;
    const c = cost(n);
    if (S.coins < c) return;
    S.coins -= c; S.r[n.id] = lvl(n.id) + 1;
    if (n.id === 'golden' && lvl('golden') === 1) goldT = 20;
    save(); renderRS();
    const node = rsMap.querySelector(`[data-id="${n.id}"]`);
    node.classList.remove('bought'); void node.offsetWidth; node.classList.add('bought');
  }

  function bigBang() {
    const g = stardustGain();
    if (!g) return;
    if (!bangConfirm) { bangConfirm = true; renderRS(); return; }
    const keep = { stardust: S.stardust + g, bangs: S.bangs + 1, ach: S.ach, introDone: true, golds: S.golds, clicks: S.clicks };
    S = Object.assign(fresh(), keep);
    unlock('bang');
    enemies = []; bossT = 0; frenzyT = 0;
    save(); closeRS();
    if (window.LG_HYPERDRIVE) window.LG_HYPERDRIVE();
    toast(`🌌 The universe is reborn. +${g} stardust (×${mult().toFixed(1)} forever)`);
  }

  function renderRS() {
    if (rs.hidden) return;
    rs.querySelector('#rs-coins').textContent = fmt(S.coins);
    const dust = rs.querySelector('#rs-dust');
    dust.hidden = !S.stardust; dust.querySelector('b').textContent = fmt(S.stardust);
    RES.forEach((n) => {
      const b = rsMap.querySelector(`[data-id="${n.id}"]`);
      const l = lvl(n.id), ok = n.special ? S.best >= 20 : reqOk(n), maxed = !n.special && l >= n.max;
      const afford = n.special ? ok : ok && !maxed && S.coins >= cost(n);
      b.classList.toggle('locked', !ok); b.classList.toggle('maxed', maxed);
      b.classList.toggle('afford', afford); b.classList.toggle('sel', sel === n.id); b.classList.toggle('owned', l > 0);
      b.querySelector('.rs-lv').textContent = n.special ? '' : (l ? l : '');
    });
    rsLines.querySelectorAll('line').forEach((ln) => {
      const n = RMAP[ln.dataset.to];
      ln.classList.toggle('on', n.special ? S.best >= 20 : reqOk(n));
    });
    const n = RMAP[sel], l = lvl(n.id);
    const ok = n.special ? S.best >= 20 : reqOk(n);
    // only rebuild the detail card when something visible in it changed
    const achN = Object.keys(S.ach).length;
    const foot = `<span>Wave <b>${S.wave}</b> · best <b>${S.best}</b></span><span>Aliens <b>${fmt(S.kills)}</b> · bosses <b>${S.bosses}</b></span><span>Achievements <b>${achN}/${Object.keys(ACH).length}</b> (+${achN * 2}% coins)</span><span class="rs-tip">Tip: press R to open the lab</span>`;
    const footEl = rs.querySelector('#rs-foot');
    if (footEl.innerHTML !== foot) footEl.innerHTML = foot;
    const sig = [sel, l, ok, n.special ? stardustGain() : S.coins >= cost(n), bangConfirm, S.stardust, S.best].join('|');
    if (sig === lastSig) return;
    lastSig = sig;
    let btn = '';
    if (n.special) {
      const g = stardustGain();
      btn = g ? `<button class="rs-buy ${bangConfirm ? 'danger' : ''}" data-buy>${bangConfirm ? 'Really? Click again to reset' : `Big Bang · +${g} stardust`}</button>`
              : `<p class="rs-req">Reach wave 20 to unlock (best: ${S.best}).</p>`;
    } else if (!ok) {
      btn = `<p class="rs-req">Requires ${n.req.map(([id, rl]) => `${RMAP[id].name} ${rl}`).join(' + ')}</p>`;
    } else if (l >= n.max) {
      btn = `<p class="rs-req">Fully researched.</p>`;
    } else {
      const c = cost(n);
      btn = `<button class="rs-buy" data-buy ${S.coins < c ? 'disabled' : ''}><span class="coin"></span> ${fmt(c)} · Research</button>`;
    }
    const now = n.special ? '' : (l || n.id === 'blaster' ? n.fx(l) : '—');
    const next = n.special || l >= n.max ? '' : n.fx(l + 1);
    rsDetail.innerHTML = `
      <div class="rs-dicon">${n.icon}</div>
      <h4>${n.name}</h4>
      ${n.special ? (S.stardust ? `<p class="rs-lvl">${S.stardust} stardust · ×${mult().toFixed(1)}</p>` : '') : `<p class="rs-lvl">Level ${l} / ${n.max}</p>`}
      <p class="rs-desc">${n.desc}</p>
      ${n.special ? '' : `<dl class="rs-fx"><dt>Now</dt><dd>${now}</dd>${next ? `<dt>Next</dt><dd>${next}</dd>` : ''}</dl>`}
      ${btn}`;
    const bb = rsDetail.querySelector('[data-buy]');
    if (bb) bb.addEventListener('click', () => buy(n));
  }

  /* ---------------- offline earnings ---------------- */
  let earnedWindow = 0, cpsT = 0;
  (function offline() {
    const tw = lvl('timewarp');
    if (!tw || !S.cps || S.off) return;
    const away = Math.min(8 * 3600, (Date.now() - S.seen) / 1000);
    if (away < 60) return;
    const gain = Math.floor(S.cps * away * 0.1 * tw);
    if (gain > 0) { earn(gain); setTimeout(() => toast(`⏳ While you were away: +${fmt(gain)} coins`), 1200); }
  })();

  /* ---------------- sizing ---------------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight; small = W < 700;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // fleet icons
  const fleetImgs = GAMES.slice().sort(() => Math.random() - .5).slice(0, 20).map((g) => {
    const im = new Image(); im.src = g.icon || `games/${g.slug}/icon.webp`; return im;
  });

  /* ---------------- loop ---------------- */
  let last = performance.now(), hudT = 0, running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
    if (!S.off) step(dt);
    draw();
    hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
    requestAnimationFrame(frame);
  }

  function step(dt) {
    const a = safeArea();
    const g = GX();
    const boss = isBossWave(S.wave) && bossT > 0;
    const maxE = small ? 2 : 4, maxR = (small ? 1 : 2) + (lvl('mining') ? 1 : 0);
    const aliens = enemies.filter((e) => e.kind === 'alien' && !e.boss && !e.flee).length;
    const rocks = enemies.filter((e) => e.kind === 'rock').length;

    if (isBossWave(S.wave) && bossT <= 0 && !enemies.some((e) => e.boss)) {
      // boss wave without a boss (e.g. after reload) — start the fight
      const b = spawnEnemy(true); bossT = 30; bossName = b.name;
    }
    if (!boss) {
      spawnT -= dt;
      if (spawnT <= 0 && aliens < maxE) { spawnEnemy(false); spawnT = rand(0.8, 1.8); }
    }
    rockT -= dt;
    if (rockT <= 0 && rocks < maxR) { spawnRock(); rockT = rand(2.5, 5) / (1 + lvl('mining') * .3); }
    if (lvl('golden')) { goldT -= dt; if (goldT <= 0) { spawnGold(); goldT = [0, 90, 65, 45][lvl('golden')] * rand(.8, 1.2); } }
    if (boss) { bossT -= dt; if (bossT <= 0) bossFail(); }
    if (frenzyT > 0) frenzyT -= dt;
    if (waveFlash > 0) waveFlash -= dt;

    // earning rate (for Time Warp)
    cpsT += dt;
    if (cpsT >= 10) { const r = earnedWindow / cpsT; S.cps = S.cps ? S.cps * 0.7 + r * 0.3 : r; earnedWindow = 0; cpsT = 0; }

    const mx = g.mouse.x, my = g.mouse.y;
    const holeOn = g.hole.active && mx > -999;
    const hl = lvl('hole');
    const core = 10 + g.hole.mass * 4;

    for (const e of enemies.slice()) {
      e.ph = (e.ph || 0) + dt;
      if (e.kind === 'alien' || e.kind === 'leaving') {
        if (e.flee || e.kind === 'leaving') {
          const dx = e.x - W / 2, dy = e.y - H / 2, d = Math.hypot(dx, dy) || 1;
          e.vx += dx / d * 400 * dt; e.vy += dy / d * 400 * dt;
          if (e.x < -150 || e.x > W + 150 || e.y < -150 || e.y > H + 150) { enemies = enemies.filter((x) => x !== e); continue; }
        } else {
          const speed = (reduce ? 0.35 : 1) * (e.boss ? 0.6 : 1) * 0.3;
          let dx = e.tx - e.x, dy = e.ty - e.y;
          if (Math.hypot(dx, dy) < 30) { const m = e.r * 0.8; e.tx = rand(a.x0 + m, Math.max(a.x0 + m, a.x1 - m)); const tp = a.y0 + e.r * (e.boss ? 1.3 : .5); e.ty = rand(tp, Math.max(tp, a.y1 - m)); }
          e.vx += dx * 0.9 * dt * speed; e.vy += dy * 0.9 * dt * speed;
        }
        e.vx *= Math.pow(0.35, dt); e.vy *= Math.pow(0.35, dt);
        e.blink -= dt; if (e.blink < -0.12) e.blink = rand(2, 5);
        if (e.grow < 1) e.grow = Math.min(1, e.grow + dt * 2.2);
      } else if (e.kind === 'rock') {
        e.rot += e.vr * dt;
        if (e.x < -120 || e.x > W + 120 || e.y < -120 || e.y > H + 120) { enemies = enemies.filter((x) => x !== e); continue; }
        e.vx *= Math.pow(0.9, dt); e.vy *= Math.pow(0.9, dt);
        if (Math.abs(e.vx) < 10) e.vx += (e.vx >= 0 ? 1 : -1) * 10 * dt;
      } else if (e.kind === 'gold') {
        e.y += Math.sin(t * 3) * 25 * dt;
        if (e.x < -120 || e.x > W + 120) { enemies = enemies.filter((x) => x !== e); continue; }
      }

      // black hole: pull everything; crush with research
      if (holeOn && e.kind !== 'gold') {
        const dx = mx - e.x, dy = my - e.y, d = Math.hypot(dx, dy) || 1;
        const reach = 260 + g.hole.mass * 70;
        if (d < reach) {
          const f = (1 - d / reach) * (e.boss ? 260 : 900);
          e.vx += (dx / d * f - dy / d * f * 0.6) * dt; e.vy += (dy / d * f + dx / d * f * 0.6) * dt;
          if (hl && d < core * 3 + e.r) { damage(e, clickDmg() * 2 * hl * (1 + g.hole.mass / 3) * dt, { hole: true }); if (e.dead) continue; e.sq = 1.08; }
        }
      }

      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.kind === 'alien' && !e.flee) {
        // soft walls
        const m = e.r * 0.8;
        if (e.x < a.x0 + m) e.vx += 120 * dt; if (e.x > a.x1 - m) e.vx -= 120 * dt;
        if (e.y < a.y0 + e.r * (e.boss ? 1.3 : .5)) e.vy += 120 * dt; if (e.y > a.y1 - m) e.vy -= 120 * dt;
      }
      e.sq += (1 - e.sq) * Math.min(1, dt * 10);
      e.flash = Math.max(0, e.flash - dt * 6);
      if (e.sayT > 0) e.sayT -= dt;
      // googly pupils (spring toward cursor)
      if (e.pup) {
        const lx = (aim.x > -1 ? aim.x : W / 2) - e.x, ly = (aim.y > -1 ? aim.y : H / 2) - e.y, ld = Math.hypot(lx, ly) || 1;
        const k = Math.min(1, dt * 12);
        e.pup[0] += (lx / ld - e.pup[0]) * k; e.pup[1] += (ly / ld - e.pup[1]) * k;
      }
    }

    const live = enemies.filter((e) => !e.flee && e.kind !== 'leaving');
    const nearest = (x, y, maxD) => {
      let best = null, bd = maxD || 1e9;
      for (const e of live) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
      return best;
    };

    // drones
    const dn = lvl('drone');
    if (dn && live.length) {
      droneT -= dt;
      if (droneT <= 0) {
        droneT = 1 / (1.5 * (1 + 0.3 * lvl('overclock')));
        const c = dronesCenter();
        for (let i = 0; i < dn; i++) {
          const p = dronePos(i, dn, c);
          const tg = nearest(p.x, p.y, 520);
          if (tg) { lasers.push({ x1: p.x, y1: p.y, x2: tg.x, y2: tg.y, life: 0.12, col: '#3ee8ff' }); damage(tg, clickDmg() * 0.4, { x: p.x, y: p.y }); }
        }
      }
    }
    // fleet (game icons)
    const fl = lvl('fleet');
    if (fl && live.length) {
      fleetT -= dt;
      if (fleetT <= 0) {
        fleetT = 1.5 / (fl * 2);
        const i = (Math.random() * fl * 2) | 0;
        const p = fleetPos(i, fl * 2);
        const tg = nearest(p.x, p.y);
        if (tg) { lasers.push({ x1: p.x, y1: p.y, x2: tg.x, y2: tg.y, life: 0.18, col: '#ff4fd8', w: 2.5 }); damage(tg, clickDmg() * 1.5, { x: p.x, y: p.y }); }
      }
    }
    // comets
    const cl = lvl('comet');
    if (cl && live.length) {
      cometT -= dt;
      if (cometT <= 0) {
        cometT = 10 - cl;
        const tg = pick(live);
        const fromX = tg.x + (Math.random() < .5 ? -1 : 1) * rand(300, 600);
        comets.push({ x: fromX, y: -60, tg, sx: fromX, sy: -60, p: 0 });
      }
    }
    for (const c of comets.slice()) {
      c.p += dt / 0.55;
      const tx = c.tg.dead ? c.tx ?? c.tg.x : c.tg.x, ty = c.tg.dead ? c.ty ?? c.tg.y : c.tg.y;
      c.tx = tx; c.ty = ty;
      c.x = c.sx + (tx - c.sx) * c.p; c.y = c.sy + (ty - c.sy) * c.p;
      if (c.p >= 1) {
        comets.splice(comets.indexOf(c), 1);
        pop(c.x, c.y, 30, '#ffb04d', 16);
        if (!c.tg.dead) damage(c.tg, clickDmg() * 15 * cl, { x: c.sx, y: c.sy, big: true });
      }
    }

    // particles
    const target = coinTarget();
    for (const p of parts) {
      if (p.k === 'coin') {
        p.age += dt;
        if (p.age < 0) continue;
        p.spin += dt * 9;
        if (p.age < 0.5) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy *= .9; }
        else {
          const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy);
          const sp = 420 + p.age * 1100;
          if (d < 18) { p.life = 0; bumpCoins(); continue; }
          p.x += dx / d * sp * dt; p.y += dy / d * sp * dt;
        }
        if (p.age > 3) p.life = 0;
      } else {
        p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
        if (p.k === 'conf') { p.vy += 380 * dt; p.rot += p.vr * dt; }
        if (p.k === 'spark') { p.vx *= .9; p.vy *= .9; }
        p.life -= dt * (p.k === 'ring' ? 2.2 : p.k === 'text' ? 0.9 : 1);
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    for (let i = lasers.length - 1; i >= 0; i--) { lasers[i].life -= dt; if (lasers[i].life <= 0) lasers.splice(i, 1); }
    if (parts.length > 500) parts.splice(0, parts.length - 500);

    // hint for first-timers: an alien asks to be clicked
    if (!S.introDone && t > 2) {
      const e = enemies.find((x) => x.kind === 'alien' && x.x > 80 && x.x < W - 200 && x.y > 160 && x.y < H - 60);
      if (e && e.sayT < 0.5) speak(e, small ? 'psst… tap me 👆' : 'psst… click me 👆', 3);
    }

    // custom cursor: crosshair over targets
    const cur = document.getElementById('cursor');
    if (cur && finePointer) cur.classList.toggle('is-target', !!hitAt(g.mouse.x, g.mouse.y, 4));
  }

  function dronesCenter() {
    const g = GX();
    if (finePointer && g.mouse.x > -999) return { x: g.mouse.x, y: g.mouse.y };
    return { x: aim.x > -1 ? aim.x : W / 2, y: aim.y > -1 ? aim.y : H / 2 };
  }
  function dronePos(i, n, c) {
    const a = t * 2.2 + (i / n) * Math.PI * 2;
    const r = 46 + (i % 2) * 10;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.8 };
  }
  function fleetPos(i, n) {
    const a = t * 0.18 + (i / n) * Math.PI * 2;
    return { x: W / 2 + Math.cos(a) * W * 0.44, y: H / 2 + 20 + Math.sin(a) * H * 0.36 };
  }

  let coinRect = { x: 0, y: 0 }, coinRectT = 0;
  function coinTarget() {
    if (performance.now() - coinRectT > 500) {
      const r = coinBtn.getBoundingClientRect();
      coinRect = { x: r.left + 22, y: r.top + r.height / 2 }; coinRectT = performance.now();
    }
    return coinRect;
  }
  let bumpT = 0;
  function bumpCoins() {
    const n = performance.now();
    if (n - bumpT < 60) return; bumpT = n;
    coinBtn.classList.remove('bump'); void coinBtn.offsetWidth; coinBtn.classList.add('bump');
  }

  let lastAfford = false;
  function updateHud() {
    elCoins.textContent = fmt(S.coins);
    elWave.textContent = isBossWave(S.wave) ? `Wave ${S.wave} · Boss` : `Wave ${S.wave}`;
    elProg.style.width = (isBossWave(S.wave) ? 100 : (S.prog / KILLS_PER_WAVE) * 100) + '%';
    elFrenzy.hidden = !(frenzyT > 0);
    const afford = RES.some((n) => !n.special && reqOk(n) && lvl(n.id) < n.max && S.coins >= cost(n)) || stardustGain() > 0;
    if (afford !== lastAfford) { elRes.classList.toggle('glow', afford); lastAfford = afford; }
    const b = enemies.find((e) => e.boss);
    if (b && bossT > 0 && !S.off) {
      bossBar.hidden = false;
      elBossName.textContent = b.name;
      elBossHp.style.width = Math.max(0, b.hp / b.max * 100) + '%';
      elBossTime.textContent = Math.ceil(bossT) + 's';
    } else bossBar.hidden = true;
    if (!rs.hidden) renderRS();
  }

  /* ---------------- drawing ---------------- */
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (S.off) return;

    if (frenzyT > 0) {
      const a = 0.06 + 0.04 * Math.sin(t * 10);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
      g.addColorStop(0, 'rgba(255,216,77,0)'); g.addColorStop(1, `rgba(255,216,77,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // fleet
    const fl = lvl('fleet');
    for (let i = 0; i < fl * 2; i++) {
      const p = fleetPos(i, fl * 2), im = fleetImgs[i % fleetImgs.length];
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.shadowColor = 'rgba(255,79,216,.7)'; ctx.shadowBlur = 14;
      roundRect(-15, -15, 30, 30, 8); ctx.fillStyle = '#1a1440'; ctx.fill();
      ctx.shadowBlur = 0; ctx.clip();
      if (im.complete && im.naturalWidth) ctx.drawImage(im, -15, -15, 30, 30);
      ctx.restore();
    }

    // lasers
    ctx.lineCap = 'round';
    for (const l of lasers) {
      ctx.globalAlpha = Math.min(1, l.life * 8);
      ctx.strokeStyle = l.col; ctx.lineWidth = (l.w || 1.6) + 3; ctx.globalAlpha *= .25;
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
      ctx.globalAlpha = Math.min(1, l.life * 8); ctx.lineWidth = l.w || 1.6; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const e of enemies) {
      outlined(e);
      hpBar(e);
      if (e.kind === 'alien' || e.kind === 'leaving') bubble(e);
    }

    // comets
    for (const c of comets) {
      const ang = Math.atan2(c.ty - c.sy, c.tx - c.sx);
      const g = ctx.createLinearGradient(c.x, c.y, c.x - Math.cos(ang) * 120, c.y - Math.sin(ang) * 120);
      g.addColorStop(0, 'rgba(255,200,120,1)'); g.addColorStop(1, 'rgba(255,79,216,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - Math.cos(ang) * 120, c.y - Math.sin(ang) * 120); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, 6.28); ctx.fill();
    }

    // drones
    const dn = lvl('drone');
    if (dn) {
      const c = dronesCenter();
      for (let i = 0; i < dn; i++) {
        const p = dronePos(i, dn, c), a = t * 2.2 + (i / dn) * Math.PI * 2 + Math.PI / 2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
        ctx.shadowColor = '#3ee8ff'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#bff8ff';
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, 5); ctx.lineTo(-2, 0); ctx.lineTo(-5, -5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // particles
    for (const p of parts) {
      if (p.k === 'coin') { if (p.age >= 0) drawCoin(p.x, p.y, p.r, p.spin); continue; }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.k === 'spark') { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); }
      else if (p.k === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
      else if (p.k === 'ring') { ctx.strokeStyle = p.col; ctx.lineWidth = 3 * p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + (1 - p.life) * 1.6), 0, 6.28); ctx.stroke(); }
      else if (p.k === 'text') {
        ctx.font = `800 ${p.size}px Unbounded, system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(7,5,26,.85)'; ctx.strokeText(p.s, p.x, p.y);
        ctx.fillStyle = p.col; ctx.fillText(p.s, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;

    if (waveFlash > 0 && !isBossWave(S.wave)) {
      ctx.globalAlpha = Math.min(1, waveFlash) * 0.9;
      ctx.font = `700 ${small ? 28 : 44}px Unbounded, system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.fillText(`Wave ${S.wave}`, W / 2, H * 0.32);
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawCoin(x, y, r, spin) {
    const sx = Math.max(0.18, Math.abs(Math.cos(spin || 0)));   // flipping coin
    ctx.save(); ctx.translate(x, y);
    // glow
    ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(255,216,77,.55)';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    ctx.scale(sx, 1);
    // outline so it reads on any background
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#2a1600'; ctx.beginPath(); ctx.arc(0, 0, r + 1.5, 0, 6.28); ctx.fill();
    // body + rim
    const g = ctx.createRadialGradient(-r * .35, -r * .35, 0, 0, 0, r);
    g.addColorStop(0, '#fff6c2'); g.addColorStop(.45, '#ffd84d'); g.addColorStop(1, '#e09a1a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#b8730f'; ctx.lineWidth = Math.max(1.5, r * .14);
    ctx.beginPath(); ctx.arc(0, 0, r * .72, 0, 6.28); ctx.stroke();
    // star stamp
    if (sx > 0.45) {
      ctx.fillStyle = '#b8730f'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .22 : r * .48; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
    // shine
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-r * .38, -r * .42, r * .22, r * .12, -0.7, 0, 6.28); ctx.fill();
    ctx.restore();
  }
  function eye(x, y, s, e, k) {
    const closed = e.blink < 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, y, s, closed ? s * 0.12 : s, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = Math.max(1.2, s * 0.14); ctx.stroke();
    if (closed) return;
    const px = x + e.pup[0] * s * 0.42, py = y + e.pup[1] * s * 0.42;
    ctx.fillStyle = '#120d2a'; ctx.beginPath(); ctx.arc(px, py, s * (k || 0.5), 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - s * .15, py - s * .18, s * .14, 0, 6.28); ctx.fill();
  }

  function drawAlien(e) {
    const r = e.r;
    ctx.save();
    ctx.translate(0, Math.sin(e.ph * 1.4) * 4);
    if (e.grow != null && e.grow < 1) { const g = e.grow, k = 1 + 2.2 * Math.pow(g - 1, 3) + 1.2 * Math.pow(g - 1, 2); ctx.scale(Math.max(.01, k), Math.max(.01, k)); }
    const tilt = Math.max(-0.35, Math.min(0.35, e.vx * 0.002));
    ctx.rotate(tilt);
    ctx.scale(e.sq, 2 - e.sq);
    ctx.shadowColor = e.col; ctx.shadowBlur = e.boss ? 30 : 16;
    ctx.fillStyle = e.col; ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = Math.max(2, r * 0.07);

    if (e.type === 'blorp') {
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2, w = 1 + 0.07 * Math.sin(e.ph * 4 + i * 1.7);
        const px = Math.cos(a) * r * w, py = Math.sin(a) * r * w * (a > 0 && a < Math.PI ? 0.85 : 1);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      shine(r);
      eye(-r * .32, -r * .15, r * .26, e); eye(r * .34, -r * .2, r * .2, e);
      ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = r * .07;
      ctx.beginPath(); ctx.arc(0, r * .22, r * .26, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#ff6b9a'; ctx.beginPath(); ctx.ellipse(r * .08, r * .5, r * .1, r * .14 + Math.sin(e.ph * 6) * r * .03, 0, 0, 6.28); ctx.fill();
    } else if (e.type === 'zib') {
      // dome + alien
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(160,230,255,.35)'; ctx.beginPath(); ctx.ellipse(0, -r * .2, r * .55, r * .6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#8CF06A'; ctx.beginPath(); ctx.arc(0, -r * .3, r * .3, 0, 6.28); ctx.fill(); ctx.stroke();
      eye(0, -r * .34, r * .18, e, .55);
      ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.beginPath(); ctx.moveTo(-r * .14, -r * .58); ctx.lineTo(-r * .22, -r * .8); ctx.moveTo(r * .14, -r * .58); ctx.lineTo(r * .22, -r * .8); ctx.stroke();
      ctx.shadowColor = e.col; ctx.shadowBlur = e.boss ? 30 : 14; ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.ellipse(0, r * .05, r * 1.15, r * .38, 0, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * .3, -r * .05, r * .45, r * .08, 0, 0, 6.28); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const on = ((t * 4 | 0) + i) % 2;
        ctx.fillStyle = on ? '#ffe36b' : '#ff4fd8';
        ctx.beginPath(); ctx.arc(-r * .8 + i * r * .4, r * .16, r * .07, 0, 6.28); ctx.fill();
      }
    } else if (e.type === 'squid') {
      ctx.lineWidth = Math.max(3, r * .16); ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const x0 = -r * .6 + i * r * .3;
        ctx.strokeStyle = e.col; ctx.beginPath(); ctx.moveTo(x0, r * .1);
        for (let k = 1; k <= 4; k++) ctx.lineTo(x0 + Math.sin(e.ph * 5 + i + k) * r * .14, r * .1 + k * r * .25);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(2, r * .07); ctx.strokeStyle = 'rgba(7,5,26,.9)';
      ctx.fillStyle = e.col;
      ctx.beginPath(); ctx.ellipse(0, -r * .1, r * .9, r * .75, 0, Math.PI, 0); ctx.lineTo(r * .9, r * .2); ctx.quadraticCurveTo(0, r * .45, -r * .9, r * .2); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      shine(r * .9);
      eye(-r * .42, -r * .22, r * .18, e); eye(0, -r * .4, r * .22, e); eye(r * .42, -r * .22, r * .18, e);
    } else if (e.type === 'spike') {
      const n = 9;
      ctx.beginPath();
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 + e.ph * 0.6, rr = i % 2 ? r * .7 : r * 1.05;
        i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      eye(0, -r * .05, r * .42, e, .45);
      ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = r * .08;
      ctx.beginPath(); ctx.moveTo(-r * .4, -r * .55); ctx.lineTo(r * .4, -r * .48); ctx.stroke();
    } else if (e.type === 'tooth') {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
      shine(r);
      const open = 0.35 + 0.15 * Math.sin(e.ph * 7);
      ctx.fillStyle = '#2a0f22'; ctx.beginPath(); ctx.ellipse(0, r * .32, r * .62, r * open, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) {
        const x = -r * .5 + i * r * .25;
        ctx.beginPath(); ctx.moveTo(x - r * .1, r * .32 - r * open * .85); ctx.lineTo(x + r * .1, r * .32 - r * open * .85); ctx.lineTo(x, r * .32 - r * open * .3); ctx.fill();
      }
      eye(-r * .32, -r * .35, r * .17, e); eye(r * .32, -r * .35, r * .17, e);
      ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = r * .08;
      ctx.beginPath(); ctx.moveTo(-r * .55, -r * .66); ctx.lineTo(-r * .16, -r * .52); ctx.moveTo(r * .55, -r * .66); ctx.lineTo(r * .16, -r * .52); ctx.stroke();
    }
    if (e.boss) { // crown
      ctx.fillStyle = '#ffd84d'; ctx.strokeStyle = 'rgba(7,5,26,.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r * .4, -r * .85); ctx.lineTo(-r * .4, -r * 1.2); ctx.lineTo(-r * .2, -r * 1.02); ctx.lineTo(0, -r * 1.3); ctx.lineTo(r * .2, -r * 1.02); ctx.lineTo(r * .4, -r * 1.2); ctx.lineTo(r * .4, -r * .85); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (e.flash > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(255,255,255,${e.flash * .7})`; ctx.fillRect(-r * 2, -r * 2, r * 4, r * 4); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  const spr = document.createElement('canvas'), sctx = spr.getContext('2d');
  const sil = document.createElement('canvas'), lctx = sil.getContext('2d');
  const OUT = [[1, 0], [-1, 0], [0, 1], [0, -1], [.71, .71], [-.71, .71], [.71, -.71], [-.71, -.71]];
  function outlined(e) {
    const size = Math.ceil(e.r * 3.4 + 24);
    const px = Math.ceil(size * DPR);
    if (spr.width < px) { spr.width = spr.height = sil.width = sil.height = px; }
    // 1) draw the target into the sprite canvas
    sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, px, px);
    sctx.setTransform(DPR, 0, 0, DPR, size / 2 * DPR, size / 2 * DPR);
    ctx = sctx;
    if (e.kind === 'rock') drawRock(e); else if (e.kind === 'gold') drawGold(e); else drawAlien(e);
    ctx = mainCtx;
    // 2) white silhouette of it
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, px, px);
    lctx.globalCompositeOperation = 'source-over'; lctx.drawImage(spr, 0, 0, px, px, 0, 0, px, px);
    lctx.globalCompositeOperation = 'source-in'; lctx.fillStyle = e.kind === 'gold' ? '#fff3b0' : '#ffffff'; lctx.fillRect(0, 0, px, px);
    lctx.globalCompositeOperation = 'source-over';
    // 3) soft glow + crisp outline + the sprite on top
    const x0 = e.x - size / 2, y0 = e.y - size / 2, ow = e.boss ? 4 : 3;
    mainCtx.save();
    mainCtx.globalAlpha = 0.35; mainCtx.filter = 'blur(6px)';
    mainCtx.drawImage(sil, 0, 0, px, px, x0, y0, size, size);
    mainCtx.filter = 'none'; mainCtx.globalAlpha = 1;
    for (const [dx, dy] of OUT) mainCtx.drawImage(sil, 0, 0, px, px, x0 + dx * ow, y0 + dy * ow, size, size);
    mainCtx.drawImage(spr, 0, 0, px, px, x0, y0, size, size);
    mainCtx.restore();
  }
  function shine(r) { ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(-r * .45, -r * .5, r * .18, r * .1, -0.6, 0, 6.28); ctx.fill(); }
  function hpBar(e) {
    if (!e.hit || e.boss) return;
    const w = e.r * 1.4, x = e.x - w / 2, y = e.y - e.r - 18 + (e.kind === 'alien' ? Math.sin((e.ph || 0) * 1.4) * 4 : 0);
    ctx.fillStyle = 'rgba(7,5,26,.8)'; roundRect(x - 1, y - 1, w + 2, 6, 3); ctx.fill();
    ctx.fillStyle = e.kind === 'rock' ? '#d8c8b0' : '#7CF29A'; roundRect(x, y, Math.max(0, w * e.hp / e.max), 4, 2); ctx.fill();
  }
  function bubble(e) {
    if (!(e.sayT > 0)) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.sayT * 3);
    ctx.font = `600 ${small ? 11 : 12}px Manrope, system-ui, sans-serif`;
    const tw = ctx.measureText(e.say).width + 18, x = e.x + e.r * .6, y = e.y - e.r - 34;
    ctx.fillStyle = '#fff'; roundRect(x, y, tw, 24, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 10, y + 22); ctx.lineTo(x + 4, y + 32); ctx.lineTo(x + 18, y + 22); ctx.fill();
    ctx.fillStyle = '#120d2a'; ctx.textAlign = 'left'; ctx.fillText(e.say, x + 9, y + 16);
    ctx.restore();
  }
  function drawRock(e) {
    ctx.save(); ctx.rotate(e.rot); ctx.scale(e.sq, 2 - e.sq);
    ctx.beginPath();
    e.verts.forEach((v, i) => { const a = i / e.verts.length * Math.PI * 2; const px = Math.cos(a) * e.r * v, py = Math.sin(a) * e.r * v; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath();
    const g = ctx.createRadialGradient(-e.r * .3, -e.r * .3, 0, 0, 0, e.r * 1.2);
    g.addColorStop(0, '#b9a995'); g.addColorStop(1, '#5e5246');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(7,5,26,.85)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(40,32,26,.45)';
    e.craters.forEach(([cx, cy, cr]) => { ctx.beginPath(); ctx.arc(cx * e.r, cy * e.r, cr * e.r, 0, 6.28); ctx.fill(); });
    if (e.flash > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(255,255,255,${e.flash * .6})`; ctx.fillRect(-e.r * 2, -e.r * 2, e.r * 4, e.r * 4); }
    ctx.restore();
  }
  function drawGold(e) {
    const r = e.r;
    ctx.save();
    ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,240,180,.5)'; ctx.beginPath(); ctx.ellipse(0, -r * .2, r * .5, r * .55, 0, Math.PI, 0); ctx.fill();
    const g = ctx.createLinearGradient(0, -r * .4, 0, r * .4); g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#e0a020');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, r * .05, r * 1.15, r * .38, 0, 0, 6.28); ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 6; i++) { const a = t * 3 + i; ctx.fillStyle = '#fff'; ctx.globalAlpha = .6 + .4 * Math.sin(t * 8 + i); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.5, Math.sin(a) * r * .9, 2, 0, 6.28); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* ---------------- utils ---------------- */
  function fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    let i = -1; let v = n;
    while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + u[i];
  }

  // dev/debug helpers in the console (fun for you): LG_GAME.give(1e6)
  window.LG_GAME = { give: (n) => earn(n), state: () => S, enemies: () => enemies.map((e) => ({ x: e.x, y: e.y, r: e.r, kind: e.kind, boss: e.boss })), reset: () => { localStorage.removeItem(KEY); location.reload(); }, wave: (w) => { S.wave = w; S.best = Math.max(S.best, w); S.prog = 0; } };

  updateHud();
  requestAnimationFrame(frame);
})();
