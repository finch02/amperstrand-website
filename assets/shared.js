/* Amperstrand shared JS — nav, reveals, status, waves */

// ============ AMPEL DATA (Google Sheet CSV) ============
// Sheet: Spalte A = Datum (DD.MM.YY), Spalte B = Status (geöffnet/geschlossen/...), Spalte C = Notiz (optional)
// Veröffentlicht als CSV → https://docs.google.com/.../pub?output=csv
window.AMPEL_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgQY7ezPfmYcG9q1RJM9d-uM5zfUOZ8TQ55wVCwgAt2FYGrkAo902VloWCcpgSCYnw_Al1acpppdWv/pub?output=csv';

// Map sheet status strings → internal class
function mapSheetStatus(raw) {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('geöff') || s === 'open' || s === 'offen' || s === 'auf') return 'green';
  if (s.startsWith('gesch') || s === 'closed' || s === 'zu') return 'red';
  if (s.startsWith('wetter') || s.startsWith('evtl') || s.includes('unsicher') || s === 'amber') return 'amber';
  if (s.startsWith('ruhe')) return 'red';
  return 'amber'; // unbekannter Wert: vorsichtig gelb
}

function parseCSV(text) {
  // Simple CSV parser — handles quoted fields with commas
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Parse "DD.MM.YY" or "DD.MM.YYYY" → Date
function parseSheetDate(s) {
  const m = (s || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!m) return null;
  const day = +m[1], mon = +m[2] - 1;
  let year = +m[3];
  if (year < 100) year += 2000;
  return new Date(year, mon, day);
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// Load + parse, cached in sessionStorage for 60s
async function loadAmpelData() {
  const CACHE_KEY = 'amperstrand-ampel-cache';
  const CACHE_TTL = 60 * 1000;
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && (Date.now() - cached.t) < CACHE_TTL) return cached.data;
  } catch(e) {}

  const url = window.AMPEL_CSV_URL;
  if (!url) return {};
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    const map = {};
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const d = parseSheetDate(r[0]);
      if (!d) continue;
      const cls = mapSheetStatus(r[1]);
      if (!cls) continue;
      map[dateKey(d)] = { cls, raw: r[1], note: (r[2] || '').trim() };
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: map }));
    return map;
  } catch (err) {
    console.warn('[Ampel] CSV-Load fehlgeschlagen, fallback:', err);
    return {};
  }
}
window.loadAmpelData = loadAmpelData;
window.dateKey = dateKey;

// Build N-day window starting from "today" (param for testing), merged with CSV data
window.buildAmpelWindow = async function({ totalDays = 21, startDate = null } = {}) {
  const days = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const monthsShort = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const today = startDate ? new Date(startDate) : new Date();
  today.setHours(0,0,0,0);
  const csv = await loadAmpelData();
  const out = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dn = d.getDay();
    const idx = (dn + 6) % 7; // Mo=0
    const key = dateKey(d);
    const row = csv[key];
    // Default fallback: Sonntag Ruhetag, sonst geöffnet, vor 1. Mai grey
    const mayStart = new Date(d.getFullYear(), 4, 1).getTime();
    let cls, sub;
    if (row) {
      cls = row.cls;
      sub = row.note || ({ green: 'Geöffnet', red: 'Geschlossen', amber: 'Wetterabhängig' }[cls]);
    } else if (d.getTime() < mayStart) {
      cls = 'grey'; sub = 'Vor Saisonstart';
    } else if (idx === 0) {
      cls = 'red'; sub = 'Ruhetag';
    } else {
      cls = 'green'; sub = 'Geöffnet';
    }
    out.push({
      wd: days[idx],
      d: d.getDate(),
      m: monthsShort[d.getMonth()],
      cls, sub,
      dateObj: d,
      isToday: i === 0,
      fromSheet: !!row
    });
  }
  return out;
};

// ============ STATUS LOGIC ============
// Season: 1 May – 30 Sep. Hours (placeholder):
// Mo-Do 15:00-22:00, Fr 15:00-23:00, Sa 12:00-23:00, So 12:00-22:00.
// For prototype we simulate a state controlled by window.__AMPERSTRAND_STATE.
const STATUS_STATES = {
  open:   { label: 'Jetzt geöffnet', sub: 'bis 22:00', dot: 'green' },
  soon:   { label: 'Öffnet in 2h 15min', sub: 'um 15:00', dot: 'amber' },
  closed: { label: 'Heute geschlossen', sub: 'Mo Ruhetag', dot: 'red' },
  weather:{ label: 'Wetterbedingt zu', sub: 'siehe Instagram', dot: 'red' },
  preseason:{ label: 'Saison ab 01.05.', sub: 'noch 12 Tage', dot: 'blue' },
};

function currentStatusKey() {
  const saved = localStorage.getItem('amperstrand-state');
  return saved && STATUS_STATES[saved] ? saved : 'open';
}

function applyStatusPill() {
  const key = currentStatusKey();
  const s = STATUS_STATES[key];
  document.querySelectorAll('[data-status-pill]').forEach(el => {
    el.innerHTML = `<span class="dot ${s.dot}"></span><span class="status-label">${s.label}</span>`;
  });
  document.querySelectorAll('[data-status-label]').forEach(el => el.textContent = s.label);
  document.querySelectorAll('[data-status-sub]').forEach(el => el.textContent = s.sub);
  document.querySelectorAll('[data-status-dot]').forEach(el => {
    el.className = 'dot ' + s.dot;
  });
}

// Map sheet status for today → STATUS_STATES key + override labels live
async function applyLiveStatusFromSheet() {
  // Tweaks-override nicht überschreiben (Session-scoped)
  if (sessionStorage.getItem('amperstrand-state-manual')) return;
  try {
    const csv = await loadAmpelData();
    const today = new Date(); today.setHours(0,0,0,0);
    const row = csv[dateKey(today)];
    const sheetToKey = { green: 'open', red: 'closed', amber: 'weather', grey: 'preseason' };
    let key;
    if (row) {
      key = sheetToKey[row.cls] || 'closed';
      // Sheet-Notiz als Sub-Text (sonst kein Sub-Text)
      STATUS_STATES[key].sub = row.note || '';
      if (key === 'open' && !row.note) STATUS_STATES[key].sub = 'bis 22:00';
    } else {
      // Kein Sheet-Eintrag: Sonntag=Ruhetag, sonst offen, vor 01.05. preseason
      const d = today;
      const mayStart = new Date(d.getFullYear(), 4, 1).getTime();
      const dow = (d.getDay() + 6) % 7;
      if (d.getTime() < mayStart) key = 'preseason';
      else if (dow === 0) { key = 'closed'; STATUS_STATES.closed.sub = 'Ruhetag'; }
      else key = 'open';
    }
    localStorage.setItem('amperstrand-state', key);
    applyStatusPill();
  } catch (e) {
    console.warn('[Status] Live-Status konnte nicht aus Sheet geladen werden:', e);
  }
}
window.applyLiveStatusFromSheet = applyLiveStatusFromSheet;

window.setAmperstrandState = function(k) {
  if (!STATUS_STATES[k]) return;
  // Manuelle Auswahl via Tweaks → Sheet-Auto-Update in dieser Session aussetzen
  sessionStorage.setItem('amperstrand-state-manual', '1');
  localStorage.setItem('amperstrand-state', k);
  applyStatusPill();
};

// ============ NAV (sticky + scroll treatment) ============
function setupNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const isInk = nav.classList.contains('on-ink');
  const hero = document.querySelector('.hero, section.head');
  const update = () => {
    const y = window.scrollY;
    if (y > 20) nav.classList.add('solid');
    else nav.classList.remove('solid');
    // If nav was marked on-ink for a dark hero, drop that once we scroll past hero
    if (isInk && hero) {
      const h = hero.offsetHeight;
      if (y > h - 80) nav.classList.remove('on-ink');
      else nav.classList.add('on-ink');
    }
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

// ============ REVEAL ============
function setupReveals() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || '0', 10);
        setTimeout(() => e.target.classList.add('in'), delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(e => io.observe(e));
}

// ============ FOOTER + NAV INJECTION ============
const NAV_HTML = (active) => `
  <nav class="nav" data-nav>
    <a href="index.html" class="nav-logo">amperstrand.</a>
    <div class="nav-links">
      <a href="index.html" data-k="home">Home</a>
      <a href="oeffnungszeiten.html" data-k="oeffnungszeiten">Öffnungszeiten</a>
      <a href="karte.html" data-k="karte">Karte</a>
      <a href="events.html" data-k="events">Events</a>
      <a href="geschichte.html" data-k="geschichte">Geschichte</a>
      <a href="kreativquartier.html" data-k="kreativquartier">Kreativquartier</a>
    </div>
    <div class="nav-right">
      <span class="nav-est">Est. 2025</span>
      <button class="nav-burger" aria-label="Menü öffnen" data-burger>
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="nav-overlay" data-nav-overlay aria-hidden="true">
    <button class="nav-overlay-close" aria-label="Menü schließen" data-nav-close type="button"><span></span><span></span></button>
    <div class="nav-overlay-inner">
      <a href="index.html" data-k="home"><span class="mono">00</span><span>Home</span></a>
      <a href="oeffnungszeiten.html" data-k="oeffnungszeiten"><span class="mono">01</span><span>Öffnungszeiten</span></a>
      <a href="karte.html" data-k="karte"><span class="mono">02</span><span>Karte</span></a>
      <a href="events.html" data-k="events"><span class="mono">03</span><span>Events</span></a>
      <a href="geschichte.html" data-k="geschichte"><span class="mono">04</span><span>Geschichte</span></a>
      <a href="kreativquartier.html" data-k="kreativquartier"><span class="mono">05</span><span>Kreativquartier</span></a>
    </div>
    <div class="nav-overlay-foot">
      <span class="mono">Bullachstr. 30 · FFB</span>
      <span class="mono">Est. 2025</span>
    </div>
  </div>
`;

const FOOTER_HTML = `
  <footer class="footer">
    <div class="wrap">
      <div class="closer reveal">
        Bis bald<br>
        <span class="hand">am Wasser.</span>
      </div>
      <div class="footer-grid">
        <div class="footer-col">
          <h4>Amperstrand</h4>
          <p style="opacity:.7; font-size:15px; line-height:1.55; max-width:320px;">
            Stadtstrand an der Amper.<br>
            Bullachstraße 30, 82256 Fürstenfeldbruck.
          </p>
          <p style="opacity:.7; font-size:15px;"><a href="https://instagram.com" style="display:inline-flex;gap:6px;align-items:center;text-decoration:underline;text-underline-offset:4px;">Instagram →</a></p>
        </div>
        <div class="footer-col">
          <h4>Seiten</h4>
          <a href="index.html">Start</a>
          <a href="oeffnungszeiten.html">Öffnungszeiten</a>
          <a href="karte.html">Karte</a>
          <a href="events.html">Events</a>
        </div>
        <div class="footer-col">
          <h4>Mehr</h4>
          <a href="geschichte.html">Geschichte & FAQ</a>
          <a href="kreativquartier.html">Kreativquartier</a>
          <a href="geschichte.html#kontakt">Kontakt</a>
        </div>
        <div class="footer-col">
          <h4>Rechtliches</h4>
          <a href="impressum.html">Impressum</a>
          <a href="datenschutz.html">Datenschutz</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 AMPERSTRAND Gastro & Event GbR</span>
        <span>Teil vom Kreativquartier Aumühle/Lände</span>
      </div>
    </div>
  </footer>
`;

function mountNavFooter(activeKey) {
  const navMount = document.querySelector('[data-mount-nav]');
  if (navMount) navMount.outerHTML = NAV_HTML(activeKey);
  const footMount = document.querySelector('[data-mount-footer]');
  if (footMount) footMount.outerHTML = FOOTER_HTML;
  // mark active
  document.querySelectorAll('.nav-links a, .nav-overlay-inner a').forEach(a => {
    if (a.dataset.k === activeKey) a.classList.add('active');
  });
  // nav on-yellow detection: if first <section> has data-tone="yellow"
  const nav = document.querySelector('.nav');
  const firstTone = document.body.dataset.tone;
  if (firstTone === 'yellow') nav?.classList.add('on-yellow');
  if (firstTone === 'ink') nav?.classList.add('on-ink');

  // Burger menu toggle
  const burger = document.querySelector('[data-burger]');
  const overlay = document.querySelector('[data-nav-overlay]');
  if (burger && overlay) {
    const close = () => {
      overlay.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', () => {
      const open = overlay.classList.toggle('open');
      burger.classList.toggle('active', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    // X-Button im Overlay schließt ebenfalls
    overlay.querySelector('[data-nav-close]')?.addEventListener('click', close);
    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
}

// Cycle status on click of the pill
window.__amperToggle = () => {
  const keys = Object.keys(STATUS_STATES);
  const cur = currentStatusKey();
  const next = keys[(keys.indexOf(cur) + 1) % keys.length];
  setAmperstrandState(next);
};

// ============ TWEAKS (Apple-like settings panel) ============
const TWEAKS_HTML = `
  <aside class="tweaks-panel" data-tweaks hidden>
    <header>
      <strong>Tweaks</strong>
      <button data-tweaks-close aria-label="Close">×</button>
    </header>
    <div class="tw-group">
      <label>Status im Hero</label>
      <div class="tw-seg" data-tw="status">
        <button data-v="open">Offen</button>
        <button data-v="soon">Öffnet bald</button>
        <button data-v="closed">Geschlossen</button>
        <button data-v="weather">Wetter zu</button>
        <button data-v="preseason">Pre-Season</button>
      </div>
    </div>
    <div class="tw-group">
      <label>Wellen-Stil</label>
      <div class="tw-seg" data-tw="wave">
        <button data-v="lines">Linien</button>
        <button data-v="ink">Tinte</button>
        <button data-v="blob">Blob</button>
      </div>
    </div>
    <div class="tw-group">
      <label>Hero-Ton</label>
      <div class="tw-seg" data-tw="herotone">
        <button data-v="yellow">Gelb</button>
        <button data-v="paper">Papier</button>
        <button data-v="ink">Nacht</button>
      </div>
    </div>
    <div class="tw-group">
      <label>Handschrift-Akzent</label>
      <div class="tw-seg" data-tw="hand">
        <button data-v="off">Aus</button>
        <button data-v="on">An</button>
      </div>
    </div>
    <div class="tw-hint">Änderungen gelten für alle Seiten (im Browser gespeichert).</div>
  </aside>
`;

const TWEAKS_CSS = `
.tweaks-panel { position: fixed; right: 18px; bottom: 18px; width: 320px; background: var(--paper); border: 1px solid rgba(10,10,10,.1); border-radius: 20px; padding: 16px 18px 18px; font-family: var(--font-body); font-size: 14px; z-index: 100; box-shadow: 0 20px 60px -20px rgba(0,0,0,.2); }
.tweaks-panel[hidden] { display: none !important; }
.tweaks-panel header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.tweaks-panel header strong { font-family: var(--font-display); font-weight: 700; font-size: 15px; letter-spacing:-0.01em; }
.tweaks-panel [data-tweaks-close] { background:transparent; border:0; font-size:22px; line-height:1; cursor:pointer; padding:2px 8px; color:var(--ink); border-radius:8px; }
.tweaks-panel [data-tweaks-close]:hover { background: rgba(10,10,10,.06); }
.tw-group { margin-bottom: 12px; }
.tw-group label { display:block; font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.06em; opacity:.55; margin-bottom:6px; }
.tw-seg { display:flex; flex-wrap:wrap; gap:4px; padding:3px; background: var(--stone); border-radius: 10px; }
.tw-seg button { flex:1 1 auto; padding: 7px 10px; font-size:12.5px; background: transparent; border:0; border-radius:7px; cursor:pointer; font-family: var(--font-body); color: var(--ink); transition: background .2s; }
.tw-seg button.active { background: var(--paper); box-shadow: 0 1px 3px rgba(0,0,0,.08); font-weight: 500; }
.tw-seg button:hover:not(.active) { background: rgba(250,250,247,.5); }
.tw-hint { margin-top: 4px; font-size: 11.5px; opacity: .55; line-height: 1.4; }
`;

function mountTweaks() {
  const style = document.createElement('style');
  style.textContent = TWEAKS_CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', TWEAKS_HTML);
  const panel = document.querySelector('[data-tweaks]');
  const close = panel.querySelector('[data-tweaks-close]');

  const state = {
    status: currentStatusKey(),
    wave: localStorage.getItem('amper-wave') || 'lines',
    herotone: localStorage.getItem('amper-herotone') || 'yellow',
    hand: localStorage.getItem('amper-hand') || 'on',
  };

  const apply = () => {
    document.documentElement.dataset.wave = state.wave;
    document.documentElement.dataset.herotone = state.herotone;
    document.documentElement.dataset.hand = state.hand;
    applyStatusPill();
    window.__onTweakChange && window.__onTweakChange(state);
    panel.querySelectorAll('.tw-seg').forEach(seg => {
      const key = seg.dataset.tw;
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.v === state[key]));
    });
  };
  apply();

  panel.querySelectorAll('.tw-seg').forEach(seg => {
    const key = seg.dataset.tw;
    seg.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        state[key] = b.dataset.v;
        if (key === 'status') setAmperstrandState(b.dataset.v);
        else localStorage.setItem('amper-' + key, b.dataset.v);
        apply();
      });
    });
  });

  // Host edit-mode integration
  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === '__activate_edit_mode') panel.hidden = false;
    if (e.data.type === '__deactivate_edit_mode') panel.hidden = true;
  });
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');

  close.addEventListener('click', () => {
    panel.hidden = true;
    window.parent.postMessage({ type: '__edit_mode_deactivated_by_page' }, '*');
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const active = document.body.dataset.page || '';
  mountNavFooter(active);
  setupNav();
  setupReveals();
  applyStatusPill();
  mountTweaks();
  // Live-Status aus Google Sheet ziehen (überschreibt Default-Pill)
  applyLiveStatusFromSheet();
  // Fill current month into any [data-current-month] element (e.g. events teaser)
  document.querySelectorAll('[data-current-month]').forEach(el => {
    el.textContent = String(new Date().getMonth() + 1).padStart(2, '0');
  });
  document.body.classList.add('page-enter');
});
