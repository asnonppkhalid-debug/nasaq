'use strict';
/* ═══ نَسَق | NASAQ — أدوات مساعدة ═══ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => Date.now();
const DAY = 864e5;
const A = {}; // سجلّ الأحداث: data-act => دالة

/* تطبيع النص العربي للبحث: يزيل التشكيل ويوحّد الألف والياء والتاء المربوطة */
const norm = s => String(s || '').toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').trim();

/* صيغة العدد العربية: مفرد، مثنى، جمع (٣–١٠)، تمييز مفرد (١١+) */
function ar(n, one, two, few, many) {
  n = Math.abs(Math.round(n));
  if (n === 1) return one;
  if (n === 2) return two;
  return n + ' ' + (n >= 3 && n <= 10 ? few : many);
}
const num = n => new Intl.NumberFormat('en-US').format(n);

function fmtDate(ts, opts) {
  try { return new Intl.DateTimeFormat('ar-IQ-u-nu-latn', opts || { day: 'numeric', month: 'long' }).format(ts); }
  catch (e) { return new Date(ts).toLocaleDateString(); }
}
function rel(ts) {
  const m = Math.floor((now() - ts) / 6e4);
  if (m < 1) return 'الحين';
  if (m < 60) return 'قبل ' + ar(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.floor(m / 60);
  if (h < 24) return 'قبل ' + ar(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  const d = Math.floor(h / 24);
  if (d < 7) return 'قبل ' + ar(d, 'يوم', 'يومين', 'أيام', 'يوماً');
  return fmtDate(ts);
}
/* وصف فترة المراجعة القادمة */
function ivText(days) {
  if (days < 1) return 'بعد ' + ar(Math.max(1, Math.round(days * 1440)), 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  if (days < 60) return 'بعد ' + ar(Math.round(days), 'يوم', 'يومين', 'أيام', 'يوماً');
  return 'بعد ' + ar(Math.round(days / 30), 'شهر', 'شهرين', 'أشهر', 'شهراً');
}

/* ═══ الأيقونات: خط رفيع بزوايا مدوّرة ═══ */
const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
  academy: '<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13H7.5A2.5 2.5 0 0 1 5 17.5z"/><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H18"/>',
  wiki: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  library: '<path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/>',
  review: '<rect x="4" y="7" width="12" height="13" rx="2.5"/><path d="M8 4h9.5A2.5 2.5 0 0 1 20 6.5V16"/>',
  graph: '<circle cx="6" cy="7" r="2.3"/><circle cx="18" cy="8" r="2.3"/><circle cx="12" cy="18" r="2.3"/><path d="M8.3 7.2l7.4.6M7.2 9.1l3.6 6.8M16.8 10.1l-3.6 5.8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  assistant: '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4.5 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7"/>',
  edit: '<path d="M5 19l.8-4L16.5 4.3a1.6 1.6 0 0 1 2.2 0l1 1a1.6 1.6 0 0 1 0 2.2L9 18.2z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  tag: '<path d="M4 12.5V5a1 1 0 0 1 1-1h7.5l7.5 7.5a1.4 1.4 0 0 1 0 2L14 19.5a1.4 1.4 0 0 1-2 0z"/><circle cx="8.5" cy="8.5" r="1.1"/>',
  next: '<path d="M14.5 6 8.5 12l6 6"/>',
  prev: '<path d="M9.5 6l6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M5 19h14"/>',
  ext: '<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
  chart: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
  bolt: '<path d="M13 3 5.5 13.5H11L10 21l8-11h-5.5z"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  note: '<path d="M6 4h9l4 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M9 12h6M9 16h4"/>',
  sliders: '<path d="M4 8h9M19 8h1M4 16h1M11 16h9"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/>',
  book: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'
};
function ic(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
const bead = (color, inner = '', cls = '') => `<span class="bead ${cls}" style="--b:${color}">${inner}</span>`;

/* ═══ خريزة: رفيق نَسَق — خرزة على خيط ═══
   الفكرة خرزة، والمعرفة خيط يجمع الخرزات. الحالات: happy, curious, cheer, calm, think */
function mascot(mood = 'happy', cls = '') {
  const E = (x, y, dx = 0, dy = 0) => `<ellipse class="eye m-fill" cx="${x}" cy="${y}" rx="5.2" ry="7"/><circle cx="${x + 1.8 + dx}" cy="${y - 3 + dy}" r="1.9" class="m-shine-f"/>`;
  const spark = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" class="${c}" d="M0-6 1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6z"/>`;
  const faces = {
    happy: E(47, 58) + E(73, 58) + '<path class="m-line" d="M52 74q8 8 16 0"/>',
    curious: E(49, 58, 1, 0) + E(75, 58, 1, 0) + '<path class="m-line" d="M66 45q8-5 16-1"/><circle class="m-line" cx="62" cy="77" r="3.2"/>',
    cheer: '<path class="m-line" d="M40 61q7-11 14 0M66 61q7-11 14 0"/><path class="m-fill" d="M50 72q10 20 20 0z"/><path class="m-cheek-f" d="M55 82q5-5 10 0q-5 5-10 0z"/>'
      + spark(14, 34, 1, 'm-thread-f') + spark(107, 28, 1.25, 'm-sky-f') + spark(22, 100, .8, 'm-sky-f'),
    calm: '<path class="m-line" d="M41 60q6 5 12 0M67 60q6 5 12 0"/><path class="m-line" d="M55 75q5 3 10 0"/>',
    think: E(47, 56, 0, -1) + E(73, 56, 0, -1) + '<path class="m-line" d="M54 76h12"/><circle class="m-line" cx="94" cy="22" r="3"/><circle class="m-line" cx="102" cy="12" r="4.4"/>'
  };
  return `<svg class="mascot ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
<path class="m-thread" d="M2 84C16 84 18 67 30 67M90 67C104 67 105 94 118 89"/><circle class="m-thread-f" cx="118" cy="89" r="3.6"/>
<path class="m-body" d="M60 19C88 17 104 40 103 64c-1 26-19 41-43 41S17 90 17 64C17 40 33 21 60 19z"/>
<path class="m-shine" d="M33 42q5-11 20-14"/>
<ellipse class="m-cheek-f" cx="35" cy="72" rx="6.5" ry="4.2" opacity=".7"/><ellipse class="m-cheek-f" cx="85" cy="72" rx="6.5" ry="4.2" opacity=".7"/>
${faces[mood] || faces.happy}</svg>`;
}
function brandMark() {
  return `<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path class="m-thread" d="M0 29c6 0 7-7 12-7M28 22c5 0 6 9 12 8"/><circle class="m-body" cx="20" cy="21" r="12.5"/><ellipse class="m-fill" cx="15.8" cy="20" rx="1.7" ry="2.4"/><ellipse class="m-fill" cx="24.2" cy="20" rx="1.7" ry="2.4"/><path class="m-line" d="M17 25.5q3 2.6 6 0"/></svg>`;
}

/* ═══ إشعارات صغيرة ═══ */
function toast(msg, o = {}) {
  const box = $('#toasts'); if (!box) return;
  while (box.children.length > 1) box.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>` + (o.act ? `<button class="toast-act" data-act="toast-act">${esc(o.act)}</button>` : '');
  t._fn = o.fn;
  box.appendChild(t);
  setTimeout(() => t.remove(), o.ms || 4200);
}
A['toast-act'] = (d, el) => { const t = el.closest('.toast'); if (t && t._fn) t._fn(); if (t) t.remove(); };

/* ═══ النوافذ: <dialog> مع حبس التركيز تلقائياً ═══ */
let dlg = null;
function openDlg(html, o = {}) {
  closeDlg();
  const d = document.createElement('dialog');
  d.className = 'dlg' + (o.sheet ? ' sheet' : '') + (o.cls ? ' ' + o.cls : '');
  d.setAttribute('aria-label', o.label || 'نافذة');
  d.setAttribute('dir', 'rtl'); d.setAttribute('lang', 'ar');
  d.innerHTML = `<div class="dlg-in">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('click', e => { if (e.target === d) closeDlg(); });
  d.addEventListener('close', () => { d.remove(); if (dlg === d) dlg = null; });
  try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  dlg = d;
  return d;
}
function closeDlg() { if (dlg) { const d = dlg; dlg = null; try { d.close(); } catch (e) { } d.remove(); } }
A['dlg-close'] = () => closeDlg();
function confirmDlg(o) {
  return new Promise(res => {
    const d = openDlg(`<h3>${esc(o.title)}</h3><p class="muted">${esc(o.text || '')}</p>
      <div class="row end"><button class="btn quiet" data-act="dlg-close">${esc(o.cancel || 'إلغاء')}</button>
      <button class="btn ${o.danger ? 'danger' : 'primary'}" data-act="dlg-yes">${esc(o.ok || 'تأكيد')}</button></div>`, { label: o.title, cls: 'narrow' });
    let done = false;
    d._fin = v => { if (!done) { done = true; res(v); } };
    d.addEventListener('close', () => d._fin(false));
  });
}
A['dlg-yes'] = () => { const d = dlg; if (d && d._fin) d._fin(true); closeDlg(); };
