// ============================================================
// RETRO WAVE — shared site behaviour
// ============================================================

// ---------- Mobile nav toggle ----------
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });
  }
});

// ---------- Country switcher (in-memory only; resets on reload by design) ----------
let activeCountry = 'all';

function setCountry(code) {
  activeCountry = code;
  document.querySelectorAll('[data-country-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.countryBtn === code);
  });
  document.querySelectorAll('[data-country-item]').forEach(item => {
    const show = code === 'all' || item.dataset.countryItem === code;
    item.style.display = show ? '' : 'none';
  });
  document.querySelectorAll('[data-country-empty]').forEach(el => {
    const relevant = code !== 'all' && code === el.dataset.countryEmpty;
    const anyVisible = relevant && document.querySelector(
      `[data-country-item="${code}"]`
    ) && [...document.querySelectorAll(`[data-country-item="${code}"]`)]
      .some(i => i.style.display !== 'none');
    el.style.display = relevant && !anyVisible ? '' : 'none';
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-country-btn]');
  if (btn) setCountry(btn.dataset.countryBtn);
});

// ---------- Countdown timer ----------
function startCountdown(targetISO, els) {
  function tick() {
    const now = new Date().getTime();
    const target = new Date(targetISO).getTime();
    let diff = Math.max(0, target - now);

    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    if (els.d) els.d.textContent = String(d).padStart(2, '0');
    if (els.h) els.h.textContent = String(h).padStart(2, '0');
    if (els.m) els.m.textContent = String(m).padStart(2, '0');
    if (els.s) els.s.textContent = String(s).padStart(2, '0');
  }
  tick();
  return setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  const box = document.querySelector('[data-countdown]');
  if (box) {
    startCountdown(box.dataset.countdown, {
      d: box.querySelector('[data-d]'),
      h: box.querySelector('[data-h]'),
      m: box.querySelector('[data-m]'),
      s: box.querySelector('[data-s]'),
    });
  }
});

// ---------- Ticket tier quantity + running total (event.html) ----------
function formatMoney(n, currency) {
  return currency + ' ' + n.toLocaleString('en-US');
}

function initTicketTiers() {
  const rows = document.querySelectorAll('[data-tier]');
  const totalEls = document.querySelectorAll('[data-cart-total]');
  const countEls = document.querySelectorAll('[data-cart-count]');
  const stickyBar = document.querySelector('[data-sticky-bar]');
  const currency = document.querySelector('[data-currency]')?.dataset.currency || 'UGX';

  function recalc() {
    let total = 0, count = 0;
    rows.forEach(row => {
      const price = parseFloat(row.dataset.price);
      const qty = parseInt(row.querySelector('[data-qty]').textContent, 10);
      total += price * qty;
      count += qty;
    });
    totalEls.forEach(el => el.textContent = formatMoney(total, currency));
    countEls.forEach(el => el.textContent = count);
    if (stickyBar) stickyBar.classList.toggle('is-visible', count > 0);
  }

  rows.forEach(row => {
    const qtyEl = row.querySelector('[data-qty]');
    const max = parseInt(row.dataset.max || '10', 10);
    row.querySelector('[data-plus]')?.addEventListener('click', () => {
      const val = Math.min(max, parseInt(qtyEl.textContent, 10) + 1);
      qtyEl.textContent = val;
      recalc();
    });
    row.querySelector('[data-minus]')?.addEventListener('click', () => {
      const val = Math.max(0, parseInt(qtyEl.textContent, 10) - 1);
      qtyEl.textContent = val;
      recalc();
    });
  });

  recalc();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-tier]')) initTicketTiers();
});

// ---------- Preview checkout notice ----------
function showPreviewNotice() {
  const modal = document.querySelector('[data-preview-modal]');
  if (modal) modal.classList.add('is-open');
}
function closePreviewNotice() {
  const modal = document.querySelector('[data-preview-modal]');
  if (modal) modal.classList.remove('is-open');
}
