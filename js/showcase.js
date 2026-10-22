/* =============================================================
   LAZY GALAXY — cinematic game showcase
   Used when featured/feature.js says  layout: showcase
   Videos only load/play while on screen, so the page stays light.
   ============================================================= */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const autoplayOK = !reduce && !saveData;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const split = (v) => String(v || '').split('|').map((x) => x.trim());
  const poster = (p) => p.replace(/\.(mp4|webm|mov)$/i, '.jpg');

  const PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 4.6v14.8c0 .7.8 1.2 1.4.8l11.6-7.4a.9.9 0 0 0 0-1.6L8.4 3.8C7.8 3.4 7 3.9 7 4.6z"/></svg>';

  /* play a <video> only while it's visible */
  function whenVisible(video, opts) {
    const o = Object.assign({ threshold: 0.25, lazy: true }, opts);
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) {
          if (o.lazy && video.dataset.src && !video.src) { video.src = video.dataset.src; }
          if (autoplayOK && !video.dataset.hold) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
        } else if (!video.paused) video.pause();
      });
    }, { threshold: o.threshold });
    io.observe(video);
    // start downloading a little before it scrolls into view
    if (o.lazy && video.dataset.src) {
      const pre = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) { if (!video.src) video.src = video.dataset.src; pre.disconnect(); } }, { rootMargin: '400px 0px' });
      pre.observe(video);
    }
    return io;
  }

  window.LG_renderShowcase = function (f, asset, onRequestDeck) {
    const sec = document.getElementById('showcase');
    if (!sec) return;
    const trailers = (f.trailer || []).map((t) => { const [src, label, dur] = split(t); return { src: asset(src), label: label || 'Watch the trailer', dur: dur || '' }; });
    const beats = (f.beat || []).map((b) => { const [src, title, text] = split(b); return { src: asset(src), title, text }; });
    const stats = (f.stat || []).map((s) => { const [value, label] = split(s); return { value, label }; });
    const moments = (f.moment || []).map((m) => { const [src, title, text] = split(m); return { src: asset(src), title, text }; });
    const road = (f.road || []).map((r) => { const [when, title, text] = split(r); return { when, title, text }; });
    const heroV = f.hero_video ? asset(f.hero_video) : '';

    sec.innerHTML = `
      <div class="sc-hero">
        ${heroV ? `<video class="sc-hero-vid" muted loop playsinline preload="auto" poster="${esc(poster(heroV))}" ${autoplayOK ? 'autoplay' : ''} src="${esc(heroV)}" aria-hidden="true"></video>` : ''}
        <div class="sc-hero-shade" aria-hidden="true"></div>
        <div class="wrap sc-hero-in">
          ${f.kicker ? `<p class="sc-kicker reveal">${esc(f.kicker)}</p>` : ''}
          <h2 class="sc-logo reveal" aria-label="${esc(f.title)}"><span>${esc(f.title)}</span></h2>
          ${f.tagline ? `<p class="sc-tag reveal">${esc(f.tagline)}</p>` : ''}
          ${f.description ? `<p class="sc-desc reveal">${esc(f.description)}</p>` : ''}
          <div class="sc-cta reveal">
            ${trailers[0] ? `<button class="sc-btn sc-btn-y" type="button" data-trailer="0"><span>${PLAY} ${esc(trailers[0].label)}${trailers[0].dur ? ` <small>${esc(trailers[0].dur)}</small>` : ''}</span></button>` : ''}
            ${f.invest_title ? `<a class="sc-btn sc-btn-ghost" href="#sc-invest"><span>${esc(f.invest_link || 'Investor brief')} ↓</span></a>` : ''}
          </div>
          ${f.status ? `<p class="sc-status reveal"><i></i>${esc(f.status)}</p>` : ''}
        </div>
        ${trailers[1] ? `<button class="sc-mini" type="button" data-trailer="1"><img src="${esc(poster(trailers[1].src))}" alt="" loading="lazy"><span>${PLAY}<b>${esc(trailers[1].label)}</b>${trailers[1].dur ? `<small>${esc(trailers[1].dur)}</small>` : ''}</span></button>` : ''}
      </div>

      ${beats.length ? `
      <div class="wrap sc-beats">
        <div class="sc-head reveal">
          <p class="eyebrow">How a round plays</p>
          <h3 class="sc-h">${esc(f.beats_title || 'Every round is a small story')}</h3>
        </div>
        <div class="sc-player reveal">
          <div class="sc-screen">
            <video class="sc-beat-vid" muted playsinline preload="metadata" poster="${esc(poster(beats[0].src))}" data-src="${esc(beats[0].src)}"></video>
            <span class="sc-screen-tag" aria-hidden="true">${esc(beats[0].title)}</span>
          </div>
          <ol class="sc-steps" role="tablist">
            ${beats.map((b, i) => `
              <li><button type="button" role="tab" class="sc-step${i ? '' : ' on'}" data-i="${i}" aria-selected="${i ? 'false' : 'true'}">
                <span class="sc-step-n">${String(i + 1).padStart(2, '0')}</span>
                <span class="sc-step-t"><b>${esc(b.title)}</b><span>${esc(b.text)}</span></span>
                <i class="sc-step-bar"><i></i></i>
              </button></li>`).join('')}
          </ol>
        </div>
      </div>` : ''}

      ${stats.length ? `
      <div class="wrap sc-proof">
        <div class="sc-head reveal">
          <p class="eyebrow">The build</p>
          <h3 class="sc-h">${esc(f.stats_title || 'Built and playable today')}</h3>
        </div>
        <div class="sc-fuse" aria-hidden="true"><i class="sc-fuse-burn"></i><i class="sc-fuse-spark"></i><b class="sc-fuse-bomb"></b></div>
        <div class="sc-stats">
          ${stats.map((s) => {
            const n = parseFloat(s.value);
            const isNum = /^\d+(\.\d+)?$/.test(s.value);
            return `<div class="sc-stat"><b data-to="${isNum ? n : ''}">${esc(s.value)}</b><span>${esc(s.label)}</span></div>`;
          }).join('')}
        </div>
      </div>` : ''}

      ${moments.length ? `
      <div class="wrap sc-moments">
        ${moments.map((m) => `
          <figure class="sc-moment reveal">
            <div class="sc-moment-v"><video muted playsinline preload="none" poster="${esc(poster(m.src))}" data-src="${esc(m.src)}"></video></div>
            <figcaption><b>${esc(m.title)}</b><span>${esc(m.text)}</span></figcaption>
          </figure>`).join('')}
      </div>` : ''}

      ${f.invest_title ? `
      <div class="wrap">
        <div class="sc-invest reveal" id="sc-invest">
          <div class="sc-invest-l">
            <p class="eyebrow">For investors & publishers</p>
            <h3 class="sc-h">${esc(f.invest_title)}</h3>
            ${f.invest_amount ? `<p class="sc-amount">${esc(f.invest_amount)}</p>` : ''}
            ${f.invest_text ? `<p class="sc-invest-t">${esc(f.invest_text)}</p>` : ''}
            ${f.invest_note ? `<p class="sc-chip">${esc(f.invest_note)}</p>` : ''}
            <div class="sc-cta">
              <a class="sc-btn sc-btn-y" href="#contact" data-deck><span>${esc(f.invest_button || 'Request the pitch deck')}</span></a>
              ${trailers[0] ? `<button class="sc-btn sc-btn-ghost" type="button" data-trailer="0"><span>${PLAY} Trailer</span></button>` : ''}
            </div>
          </div>
          ${road.length ? `
          <ol class="sc-road">
            ${road.map((r, i) => `<li class="${i === 0 ? 'now' : ''}"><span class="sc-road-w">${esc(r.when)}</span><b>${esc(r.title)}</b>${r.text ? `<span class="sc-road-t">${esc(r.text)}</span>` : ''}</li>`).join('')}
          </ol>` : ''}
        </div>
      </div>` : ''}`;

    sec.hidden = false;
    if (f.accent) sec.style.setProperty('--sc-accent', f.accent);

    /* ---------- hero video: pause when off screen ---------- */
    const hv = sec.querySelector('.sc-hero-vid');
    if (hv) whenVisible(hv, { threshold: 0.35, lazy: false });

    /* ---------- beats player ---------- */
    const bv = sec.querySelector('.sc-beat-vid');
    if (bv) {
      const steps = [...sec.querySelectorAll('.sc-step')];
      const tag = sec.querySelector('.sc-screen-tag');
      let cur = 0;
      const select = (i, play) => {
        cur = (i + beats.length) % beats.length;
        steps.forEach((s, k) => { s.classList.toggle('on', k === cur); s.setAttribute('aria-selected', k === cur ? 'true' : 'false'); s.querySelector('.sc-step-bar i').style.transform = 'scaleX(0)'; });
        bv.poster = poster(beats[cur].src);
        bv.dataset.src = beats[cur].src;
        bv.src = beats[cur].src;
        tag.textContent = beats[cur].title;
        tag.classList.remove('pop'); void tag.offsetWidth; tag.classList.add('pop');
        if (play && autoplayOK) { const pr = bv.play(); if (pr && pr.catch) pr.catch(() => {}); }
      };
      steps.forEach((s, i) => s.addEventListener('click', () => { select(i, true); if (!autoplayOK) bv.play().catch(() => {}); }));
      bv.addEventListener('ended', () => select(cur + 1, true));
      bv.addEventListener('timeupdate', () => {
        const p = bv.duration ? bv.currentTime / bv.duration : 0;
        steps[cur].querySelector('.sc-step-bar i').style.transform = `scaleX(${p.toFixed(3)})`;
      });
      if (!autoplayOK) { bv.controls = true; bv.src = beats[0].src; }
      whenVisible(bv, { threshold: 0.35 });
    }

    /* ---------- moments: one plays at a time, the spotlight moves along ---------- */
    const mWrap = sec.querySelector('.sc-moments');
    if (mWrap) {
      const cards = [...mWrap.querySelectorAll('.sc-moment')];
      const vids = cards.map((c) => c.querySelector('video'));
      let mi = 0, inView = false;
      vids.forEach((v) => { v.loop = false; });
      const focus = (i) => {
        mi = (i + vids.length) % vids.length;
        cards.forEach((c, k) => c.classList.toggle('on', k === mi));
        vids.forEach((v, k) => { if (k !== mi && !v.paused) v.pause(); });
        const v = vids[mi];
        if (!v.src) v.src = v.dataset.src;
        if (inView && autoplayOK) { try { v.currentTime = 0; } catch (e) {} const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      };
      vids.forEach((v, k) => v.addEventListener('ended', () => { if (k === mi) focus(mi + 1); }));
      cards.forEach((c, k) => {
        c.addEventListener('mouseenter', () => { if (k !== mi) focus(k); });
        c.addEventListener('click', () => { if (k !== mi) focus(k); else if (!autoplayOK) { const v = vids[k]; v.paused ? v.play().catch(() => {}) : v.pause(); } });
      });
      new IntersectionObserver((ents) => {
        inView = ents[0].isIntersecting;
        if (inView) focus(mi); else vids.forEach((v) => v.pause());
      }, { threshold: 0.3 }).observe(mWrap);
      // preload the first one shortly before it's needed
      new IntersectionObserver((ents, o) => { if (ents[0].isIntersecting) { vids.forEach((v) => { if (!v.src) v.preload = 'metadata'; }); if (!vids[0].src) vids[0].src = vids[0].dataset.src; o.disconnect(); } }, { rootMargin: '400px 0px' }).observe(mWrap);
      cards[0].classList.add('on');
    }

    /* ---------- fuse → boom → count-up ---------- */
    const proof = sec.querySelector('.sc-proof');
    if (proof) {
      const fuse = proof.querySelector('.sc-fuse');
      const nums = [...proof.querySelectorAll('.sc-stat b[data-to]')].filter((b) => b.dataset.to !== '');
      let boomed = false;
      const countUp = () => {
        nums.forEach((b) => {
          const to = +b.dataset.to, t0 = performance.now(), dur = 900 + to * 25;
          const tick = (now) => {
            const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            b.textContent = Math.round(to * e);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      };
      const boom = () => {
        if (boomed) return; boomed = true;
        fuse.classList.add('boom');
        proof.classList.add('lit');
        const r = fuse.querySelector('.sc-fuse-bomb').getBoundingClientRect();
        if (window.LG_SUPERNOVA && !reduce) window.LG_SUPERNOVA(r.left + r.width / 2, r.top + r.height / 2, 2.2);
        countUp();
      };
      if (reduce) { fuse.style.setProperty('--p', 1); boom(); }
      else {
        let ticking = false;
        const onScroll = () => {
          if (ticking) return; ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            const r = fuse.getBoundingClientRect(), vh = window.innerHeight;
            // burns from when the fuse enters the bottom of the screen until it reaches ~45% height
            const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.45)));
            fuse.style.setProperty('--p', p.toFixed(3));
            if (p >= 1) boom();
          });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        // also blow when the numbers are clearly on screen (e.g. jumped here from the menu)
        const io = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) { fuse.style.setProperty('--p', 1); boom(); io.disconnect(); } }, { threshold: 0.9 });
        io.observe(proof.querySelector('.sc-stats'));
      }
    }

    /* ---------- trailer modal ---------- */
    let modal = null;
    const openTrailer = (i) => {
      const t = trailers[i]; if (!t) return;
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'sc-modal';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Trailer');
        modal.innerHTML = `
          <div class="sc-modal-box">
            <video class="sc-modal-vid" controls playsinline preload="auto"></video>
            <div class="sc-modal-bar">
              <div class="sc-modal-tabs">${trailers.map((x, k) => `<button type="button" data-k="${k}">${esc(x.label)}${x.dur ? ` <small>${esc(x.dur)}</small>` : ''}</button>`).join('')}</div>
              <button type="button" class="sc-modal-x" aria-label="Close">✕</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        const mv = modal.querySelector('video');
        const close = () => { mv.pause(); modal.hidden = true; document.documentElement.classList.remove('sc-modal-open'); if (hv && autoplayOK) hv.play().catch(() => {}); };
        modal.querySelector('.sc-modal-x').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
        modal.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => load(+b.dataset.k)));
        modal._load = load;
        function load(k) {
          const tt = trailers[k];
          modal.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('on', +b.dataset.k === k));
          mv.poster = poster(tt.src); mv.src = tt.src;
          const pr = mv.play(); if (pr && pr.catch) pr.catch(() => {});
        }
      }
      modal.hidden = false;
      document.documentElement.classList.add('sc-modal-open');
      if (hv) hv.pause();
      modal._load(i);
      setTimeout(() => modal.querySelector('.sc-modal-x').focus(), 50);
    };
    sec.querySelectorAll('[data-trailer]').forEach((b) => b.addEventListener('click', () => openTrailer(+b.dataset.trailer)));

    /* ---------- request deck → contact form ---------- */
    sec.querySelectorAll('[data-deck]').forEach((a) => a.addEventListener('click', () => onRequestDeck && onRequestDeck(f.invest_message || `Hi! I'd like to see the ${f.title} pitch deck.`)));
  };
})();
