/* LAZY GALAXY — page logic */
(function () {
  const GAMES = window.LG_GAMES || [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const playUrl = (g) => g.url || `https://play.google.com/store/apps/details?id=${g.id}`;
  const shotSrc = (g) => g.shot || `games/${g.slug}/shot.webp`;
  const iconSrc = (g) => g.icon || `games/${g.slug}/icon.webp`;

  /* ---------- counts / year ---------- */
  const n = GAMES.filter((g) => g.genre !== 'App').length;
  ['rm-count'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = n; });
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  const observeReveals = () => document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
  observeReveals();

  /* ---------- games river ---------- */
  const river = $('#river');
  let colCount = 0;
  function cardHTML(g, hidden) {
    return `<a class="shot" href="${esc(playUrl(g))}" target="_blank" rel="noopener"${hidden ? ' aria-hidden="true" tabindex="-1"' : ''}>
      <img class="ss" src="${esc(shotSrc(g))}" alt="${hidden ? '' : esc(g.name) + ' screenshot'}" loading="lazy" decoding="async" width="540" height="960">
      <p class="shot-tag">${esc(g.tagline)}<b>Play on Google Play →</b></p>
      <span class="shot-info"><img src="${esc(iconSrc(g))}" alt="" loading="lazy" width="40" height="40">
        <span><span class="shot-name">${esc(g.name)}</span><span class="shot-genre">${esc(g.genre)}</span></span></span>
    </a>`;
  }
  function buildRiver() {
    if (!river) return;
    const w = window.innerWidth;
    const cols = w < 641 ? 2 : w < 1001 ? 3 : w < 1241 ? 4 : 5;
    if (cols === colCount) return;
    colCount = cols;
    const buckets = Array.from({ length: cols }, () => []);
    GAMES.forEach((g, i) => buckets[i % cols].push(g));
    river.innerHTML = buckets.map((list, ci) => {
      // make sure each column is tall enough to loop seamlessly
      let fill = list.slice();
      let k = 0;
      while (fill.length < 5) { fill.push(GAMES[(ci * 3 + k++ * 7 + 2) % GAMES.length]); }
      const first = fill.map((g) => cardHTML(g, false)).join('');
      const copy = fill.map((g) => cardHTML(g, true)).join('');
      const dur = fill.length * (ci % 2 ? 7.5 : 6.5);
      const delay = -(Math.random() * dur).toFixed(2);
      return `<div class="col${ci % 2 ? ' down' : ''}" style="--dur:${dur}s"><div class="col-track" style="animation-delay:${delay}s">${first}${copy}</div></div>`;
    }).join('');
  }
  buildRiver();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildRiver, 150); });

  /* ---------- studio picks ---------- */
  (function () {
    const ids = window.LG_PICKS || [];
    const picks = ids.map((k) => GAMES.find((g) => g.slug === k)).filter(Boolean);
    const sec = $('#picks'), list = $('#picks-list');
    if (!sec || !picks.length) return;
    sec.hidden = false;
    list.style.setProperty('--n', Math.min(picks.length, 5));
    const showDl = (d) => /[KMB]\+?$/i.test(d || '');          // only 1K+ and up
    list.innerHTML = picks.map((g) => {
      const stats = [showDl(g.downloads) ? `${esc(g.downloads)} downloads` : '', g.rating ? `<span class="star">★</span> ${esc(g.rating)}` : '']
        .filter(Boolean).join(' · ') || esc(g.genre);
      return `<li class="pick"><a href="${esc(playUrl(g))}" target="_blank" rel="noopener" aria-label="${esc(g.name)} on Google Play">
        <div class="pick-shot"><img src="${esc(shotSrc(g))}" alt="${esc(g.name)} screenshot" loading="lazy" width="540" height="960"></div>
        <div class="pick-info"><img src="${esc(iconSrc(g))}" alt="" loading="lazy" width="44" height="44">
          <span class="pick-text"><span class="pick-name">${esc(g.name)}</span><span class="pick-stats">${stats}</span></span></div>
      </a></li>`;
    }).join('');
  })();

  /* ---------- hero orbit of game icons ---------- */
  const orbit = $('#orbit');
  if (orbit && GAMES.length) {
    const picks = GAMES.slice(0, 14);
    const items = picks.map((g, i) => {
      const img = new Image();
      img.src = iconSrc(g); img.alt = ''; img.decoding = 'async';
      orbit.appendChild(img);
      return { img, a: (i / picks.length) * Math.PI * 2 };
    });
    let visible = true, t0 = performance.now(), mx = 0, my = 0;
    const heroEl = $('#hero'), innerEl = $('.hero-inner');
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) requestAnimationFrame(spin); }, { threshold: 0 }).observe($('#hero'));
    window.addEventListener('pointermove', (e) => { mx = e.clientX / window.innerWidth - .5; my = e.clientY / window.innerHeight - .5; }, { passive: true });
    function spin(now) {
      const W = window.innerWidth, H = window.innerHeight;
      const narrow = W < 700;
      const rx = narrow ? W * 0.47 : Math.min(W * 0.44, 640);
      const ry = narrow ? H * 0.36 : Math.min(H * 0.30, rx * 0.42);
      // keep icons from fighting the headline: fade them while they pass behind it
      if (!spin.rects || spin.rectsT < now - 500) { spin.rects = [heroEl.getBoundingClientRect(), innerEl.getBoundingClientRect()]; spin.rectsT = now; }
      const [hr, ir] = spin.rects;
      const hcx = hr.left + hr.width / 2, hcy = hr.top + hr.height / 2;
      const bx0 = ir.left - hcx - 24, bx1 = ir.right - hcx + 24, by0 = ir.top - hcy - 24, by1 = ir.bottom - hcy + 24;
      const t = reduce ? 0 : (now - t0) / 1000;
      const tilt = -0.22 + mx * 0.25;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      for (const it of items) {
        const a = it.a + t * 0.12;
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry * (1 + my * .4);
        const x = ex * ct - ey * st, y = ex * st + ey * ct;
        const depth = Math.sin(a);                 // -1 back … 1 front
        const s = 0.55 + (depth + 1) * 0.28;
        it.img.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        const behind = x > bx0 && x < bx1 && y > by0 && y < by1;
        it.target = (0.25 + (depth + 1) * 0.35) * (behind ? 0.12 : 1);
        it.op = it.op == null ? it.target : it.op + (it.target - it.op) * 0.12;
        it.img.style.opacity = it.op.toFixed(3);
        it.img.style.zIndex = depth > 0 ? 3 : 0;
      }
      if (visible && !reduce) requestAnimationFrame(spin);
    }
    requestAnimationFrame(spin);
  }

  /* ---------- featured (reads featured/feature.js) ---------- */
  function parseFeature(txt) {
    const data = { point: [] };
    txt.split(/\r?\n/).forEach((line) => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const i = l.indexOf(':');
      if (i < 1) return;
      const key = l.slice(0, i).trim().toLowerCase();
      const val = l.slice(i + 1).trim();
      if (key === 'point') { if (val) data.point.push(val); }
      else data[key] = val;
    });
    return data;
  }
  const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
  const asset = (p) => (/^(https?:)?\/\//.test(p) || p.startsWith('/') ? p : 'featured/' + p);

  function hideFeatured() {
    $('#featured').hidden = true;
    document.querySelectorAll('[data-featured-link]').forEach((a) => {
      if (a.closest('.nav-links')) a.remove(); else a.setAttribute('href', '#games');
    });
  }

  // featured/feature.js sets window.LG_FEATURE (plain text). Loaded with a <script> tag,
  // so it works when index.html is opened straight from disk too.
  Promise.resolve(window.LG_FEATURE)
    .then((txt) => {
      if (typeof txt !== 'string') throw new Error('no feature');
      const f = parseFeature(txt);
      if (!f.title || /^(no|false|off|0)$/i.test(f.show || '')) return hideFeatured();
      const sec = $('#featured');
      sec.hidden = false;
      if (f.accent) sec.style.setProperty('--accent', f.accent);

      const st = $('#feat-status');
      if (f.status) st.querySelector('span').textContent = f.status; else st.hidden = true;
      $('#feat-title').textContent = f.title;
      $('#feat-tagline').textContent = f.tagline || '';
      $('#feat-desc').textContent = f.description || '';

      const btn = $('#feat-btn');
      btn.querySelector('span').textContent = f.button || (f.link ? 'Play now' : 'Get notified');
      if (f.link) { btn.href = f.link; btn.target = '_blank'; btn.rel = 'noopener'; }
      else {
        btn.href = '#contact';
        btn.addEventListener('click', () => {
          const m = $('#message');
          if (m && !m.value) m.value = `Hi! Please let me know when ${f.title} launches.`;
          setTimeout(() => { const nm = $('#name'); nm && nm.focus({ preventScroll: true }); }, 700);
        });
      }

      const next = list(f.next);
      if (next.length) {
        const nx = $('#feat-next');
        nx.hidden = false;
        nx.innerHTML = 'Also coming: ' + next.map((x) => `<b>${esc(x)}</b>`).join(' · ');
      }

      // screenshots: slow crossfade with thin progress bars
      const screens = $('#feat-screens'), bars = $('#feat-dots');
      const imgs = list(f.images);
      const SLIDE = 4000;
      if (!imgs.length) {
        screens.innerHTML = `<div class="feat-empty">${esc(f.title)}</div>`;
      } else {
        screens.innerHTML = imgs.map((p, i) => /\.(mp4|webm)$/i.test(p)
          ? `<video src="${esc(asset(p))}" muted loop playsinline autoplay preload="metadata"${i ? '' : ' class="on"'}></video>`
          : `<img src="${esc(asset(p))}" alt="${esc(f.title)} screenshot ${i + 1}"${i ? ' loading="lazy"' : ' class="on"'}>`).join('');
        if (imgs.length > 1) {
          bars.style.setProperty('--slide', SLIDE + 'ms');
          bars.innerHTML = imgs.map((_, i) => `<button type="button" aria-label="Screenshot ${i + 1}"><i></i></button>`).join('');
          const slides = [...screens.children], bs = [...bars.children];
          let cur = 0, timer;
          const go = (i) => {
            slides[cur].classList.remove('on');
            cur = (i + slides.length) % slides.length;
            slides[cur].classList.add('on');
            bs.forEach((b, k) => { b.classList.remove('on'); b.classList.toggle('done', k < cur); });
            void bs[cur].offsetWidth;                       // restart the fill animation
            if (!reduce) bs[cur].classList.add('on'); else bs[cur].classList.add('done');
          };
          const auto = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(cur + 1), SLIDE); };
          bs.forEach((b, i) => b.addEventListener('click', () => { go(i); auto(); }));
          go(0); auto();
        }
      }
      observeReveals();
    })
    .catch(hideFeatured);

  /* ---------- contact (EmailJS) ---------- */
  const form = $('#contact-form'), msg = $('#form-message');
  if (form && window.emailjs) {
    emailjs.init('tqj2kJS_GnTWZuSxc');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { msg.className = 'form-msg err'; msg.textContent = 'Please fill in your name, a valid email and a message.'; return; }
      const btn = form.querySelector('button'); btn.disabled = true;
      msg.className = 'form-msg'; msg.textContent = 'Sending…';
      emailjs.send('service_l4tpgek', 'template_i7e727b', {
        name: $('#name').value, email: $('#email').value, message: $('#message').value
      }).then(() => {
        msg.className = 'form-msg ok'; msg.textContent = 'Message sent — thanks! I\'ll get back to you soon.';
        form.reset();
        const r = btn.getBoundingClientRect();
        window.LG_SUPERNOVA && window.LG_SUPERNOVA(r.left + r.width / 2, r.top + r.height / 2, 2.5);
      }).catch((err) => {
        console.error('EmailJS error:', err);
        msg.className = 'form-msg err'; msg.textContent = 'Couldn\'t send right now. Please try again in a bit.';
      }).finally(() => { btn.disabled = false; });
    });
  } else if (form) {
    form.addEventListener('submit', (e) => { e.preventDefault(); msg.className = 'form-msg err'; msg.textContent = 'Contact form failed to load. Please refresh and try again.'; });
  }
})();
