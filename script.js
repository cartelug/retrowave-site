/* ============================================================
   RETRO WAVE — site behaviour
   Vanilla JS, no dependencies. Everything degrades gracefully:
   if this file fails to load, the CSS still renders a usable site
   (see the <noscript> rules in each page head).
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;

  /* ---------- shared helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }

  /* Scroll lock is counted, not a boolean. The preloader releases its lock on a
     timer, and that timer can land after the drawer or lightbox has taken its
     own lock — a plain class toggle would unlock the page underneath them. */
  var scrollLocks = 0;
  function lockScroll() {
    scrollLocks++;
    document.body.classList.add('is-locked');
  }
  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.classList.remove('is-locked');
  }

  function prefersReducedMotion() {
    if (root.getAttribute('data-motion') === 'calm') return true;
    if (root.getAttribute('data-motion') === 'full') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* rAF-throttled scroll subscriber list — one listener for the whole page */
  var scrollSubs = [];
  var ticking = false;
  function onScroll(fn) { scrollSubs.push(fn); }
  function runScroll() {
    var y = window.pageYOffset || root.scrollTop;
    for (var i = 0; i < scrollSubs.length; i++) {
      try { scrollSubs[i](y); } catch (e) { /* keep other subscribers alive */ }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(runScroll); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(runScroll); }
  }, { passive: true });


  /* ============================================================
     1. ACCESSIBILITY PREFERENCES  (text size + motion)
     Persisted so the choice survives navigation — this matters
     most for the readers who need it.
     ============================================================ */
  var TEXT_STEPS = ['md', 'lg', 'xl'];

  function readPref(key, fallback) {
    try { return window.localStorage.getItem(key) || fallback; }
    catch (e) { return fallback; }
  }
  function writePref(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { /* private mode */ }
  }

  function applyTextSize(size) {
    if (size === 'md') root.removeAttribute('data-text');
    else root.setAttribute('data-text', size);
    $$('[data-text-step]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.textStep === size));
    });
  }

  function applyMotion(mode) {
    if (mode === 'system') root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', mode);
    $$('[data-motion-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(mode === 'calm'));
    });
  }

  function initA11yControls() {
    applyTextSize(readPref('rw-text', 'md'));
    applyMotion(readPref('rw-motion', 'system'));

    $$('[data-text-step]').forEach(function (btn) {
      on(btn, 'click', function () {
        var size = btn.dataset.textStep;
        applyTextSize(size);
        writePref('rw-text', size);
        toast(size === 'md' ? 'Standard text size' : size === 'lg' ? 'Bigger text on' : 'Largest text on', 'check');
      });
    });

    $$('[data-motion-toggle]').forEach(function (btn) {
      on(btn, 'click', function () {
        var next = root.getAttribute('data-motion') === 'calm' ? 'system' : 'calm';
        applyMotion(next);
        writePref('rw-motion', next);
        toast(next === 'calm' ? 'Animations reduced' : 'Animations on', next === 'calm' ? 'moon' : 'sparkle');
      });
    });
  }


  /* ============================================================
     2. TOASTS
     ============================================================ */
  /* Same 24px grid as the inlined page icons, kept minimal since toasts
     build their markup here rather than in the HTML. */
  var TOAST_ICONS = {
    check:   '<path d="m5 12.6 4.6 4.6L19 8"/>',
    warning: '<path d="M12 4.2 21.4 19.8H2.6Z"/><path d="M12 10.2v3.8"/><circle cx="12" cy="17" r=".95" fill="currentColor" stroke="none"/>',
    moon:    '<path d="M20.4 14.6A8.7 8.7 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11Z"/>',
    sparkle: '<path d="m12 3.2 1.9 5.9 5.9 1.9-5.9 1.9L12 18.8l-1.9-5.9L4.2 11l5.9-1.9Z"/>',
    ticket:  '<path d="M4.6 6.2h14.8a2 2 0 0 1 2 2v1.5a2.3 2.3 0 0 0 0 4.6v1.5a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2v-1.5a2.3 2.3 0 0 0 0-4.6V8.2a2 2 0 0 1 2-2Z"/><path d="M14.6 6.6v10.8" stroke-dasharray="1.5 2.1"/>'
  };

  var toastWrap;
  function toast(msg, iconName) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      body.appendChild(toastWrap);
    }
    var glyph = TOAST_ICONS[iconName] || TOAST_ICONS.sparkle;
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML =
      '<svg class="ico t-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + glyph + '</svg><span></span>';
    t.lastChild.textContent = msg;
    toastWrap.appendChild(t);
    window.setTimeout(function () {
      t.classList.add('is-out');
      window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, 2600);
  }


  /* ============================================================
     3. PRELOADER — logo on cream, rising sea as the progress meter
     ============================================================ */
  function initPreloader() {
    var pl = $('.preloader');
    if (!pl) { startIntro(); return; }

    var sea = $('.pl-sea', pl);
    var pct = $('.pl-pct', pl);

    // Repeat visits in the same tab get a short version — nobody wants
    // to sit through the full sequence on every page.
    var seen = false;
    try { seen = window.sessionStorage.getItem('rw-booted') === '1'; } catch (e) {}
    var calm = prefersReducedMotion();
    var minDuration = calm ? 260 : (seen ? 700 : 2100);

    var started = Date.now();
    var progress = 0;
    var settled = false;

    // Only lock scrolling now that we know JS is alive to unlock it again.
    lockScroll();

    // Track real image loading so the bar means something
    var imgs = $$('img');
    var total = imgs.length || 1;
    var loaded = 0;
    imgs.forEach(function (img) {
      if (img.complete) { loaded++; return; }
      var bump = function () { loaded++; };
      on(img, 'load', bump);
      on(img, 'error', bump);
    });

    function paint(v) {
      progress = v;
      // --p (0..1) drives how high the sea has risen — that IS the progress bar
      if (sea) sea.style.setProperty('--p', (v / 100).toFixed(3));
      if (pct) pct.textContent = Math.round(v) + '%';
    }

    var timer = window.setInterval(function () {
      var elapsed = Date.now() - started;
      var byTime = Math.min(1, elapsed / minDuration);
      var byAssets = loaded / total;
      // Blend: never runs ahead of the clock, never claims done before assets are
      var target = Math.min(byTime, 0.35 + byAssets * 0.65) * 100;
      paint(Math.max(progress, Math.min(target, 100)));

      if (progress >= 99.5 && elapsed >= minDuration) { finish(); }
    }, 60);

    // Hard safety net: never trap anyone behind the loader
    var bail = window.setTimeout(finish, calm ? 900 : 5200);

    function finish() {
      if (settled) return;
      settled = true;
      window.clearInterval(timer);
      window.clearTimeout(bail);
      paint(100);
      try { window.sessionStorage.setItem('rw-booted', '1'); } catch (e) {}

      pl.classList.add('is-done');
      startIntro();

      // exit choreography: stage fades, sea surges to full, loader lifts away
      window.setTimeout(function () {
        pl.hidden = true;
        unlockScroll();
      }, calm ? 60 : 1250);
    }

    if (document.readyState === 'complete') {
      loaded = total;
    } else {
      on(window, 'load', function () {
        // once everything is in, let the clock be the only remaining gate
        loaded = total;
      });
    }
  }

  /* Flip the switch the hero + nav animations wait on */
  var introStarted = false;
  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    body.classList.add('intro-ready');
  }


  /* ============================================================
     4. HEADER + MOBILE DRAWER
     ============================================================ */
  function initNav() {
    var header = $('.site-header');
    var toggle = $('.nav-toggle');
    var drawer = $('.drawer');
    var lastY = 0;

    if (header) {
      onScroll(function (y) {
        header.classList.toggle('is-stuck', y > 20);
        // hide-on-scroll-down only once we're well past the hero, and never
        // while the drawer is open
        var down = y > lastY && y > 420;
        if (!drawer || !drawer.classList.contains('is-open')) {
          header.classList.toggle('is-hidden', down);
        }
        lastY = y;
      });
    }

    if (!toggle || !drawer) return;

    var focusables = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.removeAttribute('aria-hidden');
      toggle.setAttribute('aria-expanded', 'true');
      lockScroll();
      if (header) header.classList.remove('is-hidden');
      var first = $(focusables, drawer);
      if (first) window.setTimeout(function () { first.focus(); }, 380);
    }
    function closeDrawer(returnFocus) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      unlockScroll();
      if (returnFocus !== false) toggle.focus();
    }

    on(toggle, 'click', function () {
      if (drawer.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });

    // Close on link tap (same-page anchors especially)
    $$('a', drawer).forEach(function (a) {
      on(a, 'click', function () { closeDrawer(false); });
    });

    on(document, 'keydown', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      // focus trap
      var items = $$(focusables, drawer).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Anything wider than the drawer breakpoint should never keep it open
    on(window, 'resize', function () {
      if (window.innerWidth > 780 && drawer.classList.contains('is-open')) closeDrawer(false);
    });
  }


  /* ============================================================
     5. SCROLL REVEALS
     ============================================================ */
  function initReveals() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // Stagger siblings that share a parent marked [data-stagger]
    $$('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.dataset.stagger, 10) || 90;
      $$('[data-reveal]', group).forEach(function (el, i) {
        el.style.setProperty('--d', i * step);
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });

    // Items inside a horizontal rail scroll sideways out of the viewport, so
    // they'd never intersect on their own. Reveal the whole group at once when
    // the rail itself appears.
    var groupIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('[data-reveal]', entry.target).forEach(function (el) {
          el.classList.add('is-in');
          io.unobserve(el);
        });
        groupIo.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

    var groups = $$('[data-reveal-group]');
    groups.forEach(function (g) { groupIo.observe(g); });

    items.forEach(function (el) {
      if (el.closest('[data-reveal-group]')) return;
      io.observe(el);
    });
  }


  /* ============================================================
     6. SCROLL-REACTIVE DIVIDERS + PARALLAX
     Each divider gets --sx: a -1..1 value describing how far it has
     travelled through the viewport. CSS maps that onto translate /
     rotate, so waves slide, tape reels spin and sunbursts turn as
     you scroll — identically on desktop and touch.
     ============================================================ */
  function initScrollFx() {
    var dividers = $$('.divider');
    var parallax = $$('[data-parallax]');
    if (!dividers.length && !parallax.length) return;

    var calm = prefersReducedMotion();
    if (calm) return;

    function update() {
      var vh = window.innerHeight;

      dividers.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        // -1 (below the fold) → 0 (centred) → 1 (above)
        var mid = r.top + r.height / 2;
        var sx = (vh / 2 - mid) / (vh / 2 + r.height / 2);
        el.style.setProperty('--sx', Math.max(-1.4, Math.min(1.4, sx)).toFixed(4));
      });

      parallax.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var depth = parseFloat(el.dataset.parallax) || 0.12;
        var mid = r.top + r.height / 2;
        var offset = (vh / 2 - mid) * depth;
        el.style.setProperty('--py', offset.toFixed(2) + 'px');
        el.style.transform = 'translate3d(0,' + offset.toFixed(2) + 'px,0)';
      });
    }

    onScroll(update);
    update();
  }


  /* ============================================================
     7. HERO PHOTO CLUSTER — pointer tilt (desktop only)
     ============================================================ */
  function initHeroTilt() {
    var stage = $('.hero-stage');
    if (!stage || prefersReducedMotion()) return;
    if (window.matchMedia('(hover: none)').matches) return;

    var cards = $$('.photo-card', stage);
    if (!cards.length) return;

    var raf = null, tx = 0, ty = 0;

    on(stage, 'pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
    on(stage, 'pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = window.requestAnimationFrame(apply); });

    function apply() {
      raf = null;
      cards.forEach(function (card, i) {
        var depth = (i + 1) * 7;
        card.style.transform =
          'rotate(' + (card.dataset.rot || 0) + 'deg) ' +
          'translate3d(' + (tx * depth).toFixed(2) + 'px,' + (ty * depth).toFixed(2) + 'px,0)';
      });
    }

    // remember each card's resting rotation from the stylesheet
    cards.forEach(function (card) {
      var m = window.getComputedStyle(card).transform;
      var deg = 0;
      if (m && m !== 'none') {
        var v = m.match(/matrix\(([^)]+)\)/);
        if (v) {
          var p = v[1].split(',');
          deg = Math.round(Math.atan2(parseFloat(p[1]), parseFloat(p[0])) * 180 / Math.PI);
        }
      }
      card.dataset.rot = deg;
    });
  }


  /* ============================================================
     8. COUNT-UP STATS
     ============================================================ */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      nums.forEach(function (el) { el.textContent = formatCount(el, parseFloat(el.dataset.count)); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    nums.forEach(function (el) { io.observe(el); });

    function formatCount(el, v) {
      var out = Math.round(v).toLocaleString('en-US');
      return (el.dataset.prefix || '') + out + (el.dataset.suffix || '');
    }

    function run(el) {
      var target = parseFloat(el.dataset.count) || 0;
      var dur = 1400;
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatCount(el, target * eased);
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }
  }


  /* ============================================================
     9. REMAINING-CAPACITY BARS (fill on reveal)
     ============================================================ */
  function initBars() {
    var bars = $$('.remaining-bar > span[data-fill]');
    if (!bars.length) return;

    if (!('IntersectionObserver' in window)) {
      bars.forEach(function (b) { b.style.width = b.dataset.fill + '%'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.width = entry.target.dataset.fill + '%';
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    bars.forEach(function (b) { io.observe(b); });
  }


  /* ============================================================
     10. COUNTDOWN
     ============================================================ */
  function initCountdown() {
    $$('[data-countdown]').forEach(function (box) {
      var target = new Date(box.dataset.countdown).getTime();
      if (isNaN(target)) return;

      var els = {
        d: $('[data-d]', box), h: $('[data-h]', box),
        m: $('[data-m]', box), s: $('[data-s]', box)
      };
      var prev = {};

      function set(key, val) {
        var el = els[key];
        if (!el) return;
        var txt = String(val).padStart(2, '0');
        if (prev[key] === txt) return;
        prev[key] = txt;
        el.textContent = txt;
        el.classList.remove('tick');
        // reflow so the animation can retrigger
        void el.offsetWidth;
        el.classList.add('tick');
      }

      function tick() {
        var diff = Math.max(0, target - Date.now());
        set('d', Math.floor(diff / 86400000));
        set('h', Math.floor(diff / 3600000) % 24);
        set('m', Math.floor(diff / 60000) % 60);
        set('s', Math.floor(diff / 1000) % 60);
        if (diff === 0 && box.dataset.doneText) {
          box.innerHTML = '<div style="flex:1;text-align:center;padding:12px;">' + box.dataset.doneText + '</div>';
          window.clearInterval(id);
        }
      }
      tick();
      var id = window.setInterval(tick, 1000);
    });
  }


  /* ============================================================
     11. COUNTRY FILTER
     ============================================================ */
  var activeCountry = 'all';

  function setCountry(code) {
    activeCountry = code;

    $$('[data-country-btn]').forEach(function (btn) {
      var isOn = btn.dataset.countryBtn === code;
      btn.classList.toggle('active', isOn);
      btn.setAttribute('aria-pressed', String(isOn));
    });

    var shown = 0;
    $$('[data-country-item]').forEach(function (item) {
      var show = code === 'all' || item.dataset.countryItem === code;
      if (show) shown++;
      item.classList.toggle('is-filtered', !show);
      // wait for the fade before removing from layout
      window.setTimeout(function () {
        item.style.display = show ? '' : 'none';
      }, show ? 0 : 300);
      if (show) item.style.display = '';
    });

    $$('[data-country-empty]').forEach(function (el) {
      var relevant = code !== 'all' && code === el.dataset.countryEmpty;
      var anyForCode = $$('[data-country-item="' + code + '"]').length > 0;
      el.style.display = relevant && !anyForCode ? '' : 'none';
    });

    var live = $('[data-filter-live]');
    if (live) {
      var names = { all: 'all countries', ug: 'Uganda', ke: 'Kenya', rw: 'Rwanda' };
      live.textContent = shown + ' event' + (shown === 1 ? '' : 's') + ' showing for ' + (names[code] || code) + '.';
    }
  }

  function initFilters() {
    on(document, 'click', function (e) {
      var btn = e.target.closest('[data-country-btn]');
      if (btn) setCountry(btn.dataset.countryBtn);
    });
    // Sync the initial empty-state visibility
    if ($('[data-country-item]') || $('[data-country-empty]')) setCountry('all');
  }


  /* ============================================================
     12. TICKET TIERS
     ============================================================ */
  function initTicketTiers() {
    var rows = $$('[data-tier]');
    if (!rows.length) return;

    var totalEls = $$('[data-cart-total]');
    var countEls = $$('[data-cart-count]');
    var stickyBar = $('[data-sticky-bar]');
    var currencyHost = $('[data-currency]');
    var currency = currencyHost ? currencyHost.dataset.currency : 'UGX';

    function recalc() {
      var total = 0, count = 0;
      rows.forEach(function (row) {
        var price = parseFloat(row.dataset.price) || 0;
        var qty = parseInt($('[data-qty]', row).textContent, 10) || 0;
        total += price * qty;
        count += qty;
        row.classList.toggle('has-qty', qty > 0);
        var minus = $('[data-minus]', row);
        if (minus) minus.disabled = qty === 0;
      });
      totalEls.forEach(function (el) { el.textContent = currency + ' ' + total.toLocaleString('en-US'); });
      countEls.forEach(function (el) { el.textContent = count; });
      if (stickyBar) {
        stickyBar.classList.toggle('is-visible', count > 0);
        // lets the back-to-top button move clear of the checkout bar
        body.classList.toggle('has-cart-bar', count > 0);
      }
    }

    rows.forEach(function (row) {
      var qtyEl = $('[data-qty]', row);
      var max = parseInt(row.dataset.max, 10) || 10;

      on($('[data-plus]', row), 'click', function () {
        var val = parseInt(qtyEl.textContent, 10) || 0;
        if (val >= max) { toast('Maximum ' + max + ' per order for this tier', 'ticket'); return; }
        qtyEl.textContent = val + 1;
        recalc();
      });
      on($('[data-minus]', row), 'click', function () {
        var val = parseInt(qtyEl.textContent, 10) || 0;
        qtyEl.textContent = Math.max(0, val - 1);
        recalc();
      });
    });

    recalc();
  }


  /* ============================================================
     13. LIGHTBOX GALLERY
     ============================================================ */
  function initLightbox() {
    var tiles = $$('[data-lightbox]');
    if (!tiles.length) return;

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close photo viewer">✕</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">‹</button>' +
      '<figure class="lb-figure"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next photo">›</button>' +
      '<div class="lb-count" aria-hidden="true"></div>';
    body.appendChild(lb);

    var img = $('img', lb);
    var cap = $('figcaption', lb);
    var counter = $('.lb-count', lb);
    var index = 0;
    var lastFocus = null;

    function show(i) {
      index = (i + tiles.length) % tiles.length;
      var tile = tiles[index];
      img.src = tile.dataset.lightbox;
      img.alt = tile.dataset.caption || '';
      cap.textContent = tile.dataset.caption || '';
      counter.textContent = (index + 1) + ' / ' + tiles.length;
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      lockScroll();
      $('.lb-close', lb).focus();
    }
    function close() {
      lb.classList.remove('is-open');
      unlockScroll();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    tiles.forEach(function (tile, i) {
      on(tile, 'click', function () { open(i); });
    });

    on($('.lb-close', lb), 'click', close);
    on($('.lb-prev', lb), 'click', function () { show(index - 1); });
    on($('.lb-next', lb), 'click', function () { show(index + 1); });
    on(lb, 'click', function (e) { if (e.target === lb) close(); });

    on(document, 'keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'Tab') {
        // trap focus inside the viewer
        var items = $$('button', lb);
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Swipe on touch
    var sx = 0, sy = 0;
    on(lb, 'touchstart', function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    on(lb, 'touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
    }, { passive: true });
  }


  /* ============================================================
     14. PROGRESSIVE IMAGE FADE-IN
     ============================================================ */
  function initImages() {
    $$('.img-holder img').forEach(function (img) {
      if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
      on(img, 'load', function () { img.classList.add('is-loaded'); });
      on(img, 'error', function () { img.classList.add('is-loaded'); });
    });
  }


  /* ============================================================
     15. BACK TO TOP
     ============================================================ */
  function initToTop() {
    var btn = $('.to-top');
    if (!btn) return;
    onScroll(function (y) { btn.classList.toggle('is-visible', y > 700); });
    on(btn, 'click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }


  /* ============================================================
     16. NOTIFY FORM (front-end only until the backend lands)
     ============================================================ */
  function initNotify() {
    $$('[data-notify]').forEach(function (form) {
      on(form, 'submit', function (e) {
        e.preventDefault();
        var input = $('input[type="email"]', form);
        if (!input) return;
        var val = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
          toast('That email address does not look right — please check it', 'warning');
          input.focus();
          return;
        }
        input.value = '';
        toast('You are on the list. We will email you before tickets go live.', 'check');
      });
    });
  }


  /* ============================================================
     17. MARQUEE DIRECTION FOLLOWS SCROLL DIRECTION
     ============================================================ */
  function initMarquee() {
    var bands = $$('.divider-marquee');
    if (!bands.length || prefersReducedMotion()) return;
    var lastY = window.pageYOffset;
    onScroll(function (y) {
      var dir = y > lastY ? '' : 'rev';
      lastY = y;
      bands.forEach(function (b) {
        if (b.dataset.lock === 'true') return;
        b.dataset.dir = dir;
      });
    });
  }


  /* ============================================================
     17b. ICON MOTION
     The icons animate continuously, but only the ones actually on
     screen — and nothing at all while the tab is in the background.
     Reduced motion is already handled in CSS.
     ============================================================ */
  function initIconMotion() {
    var icons = $$('.ico');
    if (!icons.length) return;

    if (prefersReducedMotion()) return;      // CSS keeps them paused

    if (!('IntersectionObserver' in window)) {
      icons.forEach(function (el) { el.classList.add('is-live'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle('is-live', entry.isIntersecting);
        });
      }, { rootMargin: '120px 0px' });
      icons.forEach(function (el) { io.observe(el); });
    }

    on(document, 'visibilitychange', function () {
      root.classList.toggle('tab-hidden', document.hidden);
    });
  }


  /* ============================================================
     17c. SWIPE RAILS
     A horizontal rail is only obvious if it *looks* scrollable, so
     each one gets edge fades, dots, desktop arrows, drag-to-scroll
     and a hint that retires itself after the first swipe.
     ============================================================ */
  function initRails() {
    $$('.rail-shell').forEach(function (shell) {
      var rail = $('.gallery-rail', shell);
      if (!rail) return;

      var prev = $('.rail-prev', shell);
      var next = $('.rail-next', shell);
      var dotWrap = $('.rail-dots', shell);
      var tiles = $$('.g-tile', rail);
      var dots = [];

      if (dotWrap && tiles.length) {
        tiles.forEach(function (tile, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Go to photo ' + (i + 1));
          on(b, 'click', function () {
            rail.scrollTo({ left: tile.offsetLeft - rail.offsetLeft, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
            markSwiped();
          });
          dotWrap.appendChild(b);
          dots.push(b);
        });
      }

      function step() {
        var t = tiles[0];
        var gap = parseFloat(window.getComputedStyle(rail).columnGap || '16') || 16;
        return t ? t.offsetWidth + gap : rail.clientWidth * 0.8;
      }

      function sync() {
        var max = rail.scrollWidth - rail.clientWidth;
        var x = rail.scrollLeft;
        shell.classList.toggle('can-prev', x > 4);
        shell.classList.toggle('can-next', x < max - 4);
        if (prev) prev.disabled = x <= 4;
        if (next) next.disabled = x >= max - 4;

        if (dots.length) {
          // whichever tile sits nearest the rail's left edge is "current"
          var best = 0, bestD = Infinity;
          tiles.forEach(function (t, i) {
            var d = Math.abs((t.offsetLeft - rail.offsetLeft) - x);
            if (d < bestD) { bestD = d; best = i; }
          });
          dots.forEach(function (d, i) { d.classList.toggle('is-on', i === best); });
        }
      }

      function markSwiped() { shell.classList.add('has-swiped'); }

      on(prev, 'click', function () {
        rail.scrollBy({ left: -step(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        markSwiped();
      });
      on(next, 'click', function () {
        rail.scrollBy({ left: step(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        markSwiped();
      });

      var scrollRaf = null;
      on(rail, 'scroll', function () {
        if (rail.scrollLeft > 8) markSwiped();
        if (scrollRaf) return;
        scrollRaf = window.requestAnimationFrame(function () { scrollRaf = null; sync(); });
      }, { passive: true });

      // pointer drag on desktop (touch already scrolls natively)
      var down = false, startX = 0, startScroll = 0, moved = 0;
      on(rail, 'pointerdown', function (e) {
        if (e.pointerType === 'touch') return;
        down = true; moved = 0;
        startX = e.clientX; startScroll = rail.scrollLeft;
      });
      on(rail, 'pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 4) {
          if (!rail.classList.contains('is-dragging')) rail.classList.add('is-dragging');
          moved = Math.abs(dx);
          rail.scrollLeft = startScroll - dx;
        }
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        on(rail, ev, function () {
          if (!down) return;
          down = false;
          // let the click through only if this was a tap, not a drag
          if (moved > 4) window.setTimeout(function () { rail.classList.remove('is-dragging'); }, 0);
          else rail.classList.remove('is-dragging');
        });
      });

      on(window, 'resize', sync);
      sync();
    });
  }


  /* ============================================================
     18. SMOOTH IN-PAGE ANCHORS (offset for the sticky header)
     ============================================================ */
  function initAnchors() {
    on(document, 'click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var headerH = parseInt(window.getComputedStyle(root).getPropertyValue('--header-h'), 10) || 72;
      var top = target.getBoundingClientRect().top + window.pageYOffset - headerH - 14;
      window.scrollTo({ top: top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }


  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    body = document.body;
    initA11yControls();
    initNav();
    initReveals();
    initScrollFx();
    initHeroTilt();
    initCounters();
    initBars();
    initCountdown();
    initFilters();
    initTicketTiers();
    initLightbox();
    initImages();
    initToTop();
    initNotify();
    initMarquee();
    initIconMotion();
    initRails();
    initAnchors();
    initPreloader();
    runScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ---------- inline-handler compatibility ---------- */
  window.setCountry = setCountry;
  window.rwToast = toast;
  window.showPreviewNotice = function () {
    var m = $('[data-preview-modal]');
    if (!m) return;
    m.classList.add('is-open');
    lockScroll();
    var btn = $('button', m);
    if (btn) btn.focus();
  };
  window.closePreviewNotice = function () {
    var m = $('[data-preview-modal]');
    if (!m) return;
    m.classList.remove('is-open');
    unlockScroll();
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = $('[data-preview-modal].is-open');
    if (m) window.closePreviewNotice();
  });
})();
