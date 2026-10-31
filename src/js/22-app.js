/* ═══ التطبيق: التنقل والهيكل والبحث وعبارات الشخصية ═══ */
const NAV = [
  { id: 'home', name: 'الرئيسية', icon: 'home', color: '--c-saffron' },
  { id: 'academy', name: 'الأكاديمية', icon: 'academy', color: '--c-teal' },
  { id: 'wiki', name: 'الموسوعة', icon: 'wiki', color: '--c-sky' },
  { id: 'library', name: 'مكتبتي', icon: 'library', color: '--c-rose' },
  { id: 'review', name: 'المراجعة', icon: 'review', color: '--thread' },
  { id: 'graph', name: 'شبكة المعرفة', icon: 'graph', color: '--c-leaf' }
];
const PLAIN = ['home', 'academy', 'wiki', 'library', 'review', 'graph', 'progress', 'prefs'];
const SECOF = { home: 'home', progress: 'home', prefs: 'home', academy: 'academy', course: 'academy', lesson: 'academy', wiki: 'wiki', topic: 'wiki', library: 'library', note: 'library', review: 'review', graph: 'graph' };
const V = {};      // الواجهات: V[name] = { html(route), mount(route) }
const ON = {};     // معالجات الإدخال: data-on
const FORMS = {};  // معالجات النماذج: data-form
let cur = { name: 'home' }, curKey = '';

function parseRoute(h) {
  h = String(h || '').replace(/^#/, '');
  const m = h.match(/^(course|lesson|topic|note)-([A-Za-z0-9-]+)$/);
  if (m) return { name: m[1], id: m[2], key: h };
  if (PLAIN.includes(h)) return { name: h, key: h };
  return { name: 'home', key: 'home' };
}

/* ───── عبارات الشخصية بلهجة عراقية: تُختار مرة لكل جلسة حتى لا تتبدّل عند إعادة الرسم ───── */
const SEED = Math.floor(Math.random() * 1e6);
const pick = (arr, k) => { let h = SEED; for (const c of String(k)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return arr[h % arr.length]; };
const LINES = {
  morning: ['صباح الخير! شنو نبدي بيه هالصبح؟', 'هلا والله! الصبح حلو للتعلّم، شنو يخطر ببالك؟'],
  day: ['هلا والله! شنو نتعلّم اليوم؟', 'أهلين! شنو تحب تتعلّم اليوم؟'],
  night: ['مساء الخير! شنو يشغل بالك هالليلة؟', 'أهلاً! خلّينا نرتّب شوية أفكار قبل ما تنام.'],
  emptyLib: ['مكتبتك فاضية بعد، وهاي أحلى بداية. دوّن أول فكرة.'],
  emptyCards: ['ما عندك بطاقات بعد. لما تقرأ درس أو تدوّن ملاحظة، تكدر تحوّلها لبطاقة.'],
  due: n => `عندك ${n} مراجعة مستحقة، نخلصها سوه؟`,
  allDone: ['خلصنا كلشي! ارجع بعد شوية وتلقى غيرها.', 'عفية! ما بقى شي لهالوقت.'],
  lessonDone: ['عفية، الدرس خلص! نحفظ منّه بطاقات؟'],
  save: ['هاي الفكرة تستاهل نحفظها بمكتبتك.'],
  noResult: ['ما لكيت شي بهالاسم. جرّب كلمة ثانية؟'],
  free: ['مو لازم تمشي بمسار محدد، تكدر تستكشف براحتك.'],
  graphEmpty: ['الخيوط ما موجودة بعد. اربط فكرتين وشوف شلون تبين الشبكة.'],
  assistant: ['آني قريب إذا احتجتني، وإذا لا أكعد أقرأ وياك بهدوء.']
};
function greeting() {
  const h = new Date().getHours();
  const k = h >= 5 && h < 12 ? 'morning' : h < 18 && h >= 12 ? 'day' : 'night';
  return pick(LINES[k], 'greet');
}
/* خريزة وفقاعة كلام. essential = تظهر نصاً حتى لو أُطفئت الشخصية */
function buddy(mood, text, o = {}) {
  if (!S.settings.mascot && !o.always) return o.essential ? `<p class="buddy-text muted">${esc(text)}</p>` : '';
  return `<div class="buddy ${o.cls || ''}">${mascot(mood)}<p class="bubble">${esc(text)}</p></div>`;
}

/* ───── محتوى نصي: روابط [[id|نص]] وخط عريض ───── */
function inline(s) {
  return esc(s)
    .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, (m, id, t) => CAT.topics[id] ? `<a class="xref" href="#topic-${id}">${t}</a>` : t)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/* ───── الهيكل: ترويسة وشريط سفلي ───── */
function renderChrome(sec) {
  const due = dueCards().length;
  const item = n => `<li><a href="#${n.id}" style="--b:var(${n.color})"${n.id === sec ? ' aria-current="page"' : ''}>${ic(n.icon)}<span>${n.name}</span>${n.id === 'review' && due ? `<span class="badge" aria-label="${due} مراجعة مستحقة">${due > 99 ? '99+' : due}</span>` : ''}</a></li>`;
  $('#top').innerHTML = `<div class="wrap top-in">
    <a class="brand" href="#home" aria-label="نَسَق، الصفحة الرئيسية">${brandMark()}<span class="brand-name">نَسَق</span><span class="brand-latin" dir="ltr">NASAQ</span></a>
    <nav class="tnav" aria-label="التنقل الرئيسي"><ul>${NAV.map(item).join('')}</ul></nav>
    <div class="tools">
      <button class="tbtn" data-act="search" aria-label="بحث">${ic('search')}</button>
      <button class="tbtn" data-act="assistant" aria-label="المساعد المعرفي">${ic('assistant')}</button>
      <button class="tbtn" data-act="menu" aria-label="المزيد">${ic('more')}</button>
    </div></div>`;
  $('#dock').innerHTML = `<ul>${NAV.slice(0, 5).map(item).join('')}</ul>`;
}

function render(focus = true) {
  const r = parseRoute(location.hash); cur = r; curKey = r.key;
  if (r.name !== 'review') REV.active = false;
  const sec = SECOF[r.name];
  $('#app').dataset.sec = sec;
  renderChrome(sec);
  const v = V[r.name] || V.home;
  $('#view').innerHTML = (storageOK ? '' : `<div class="warn" role="alert">${ic('x')}<p>المتصفح ما يسمح بالحفظ هنا، فبياناتك راح تضيع إذا سكرت الصفحة. خذ نسخة احتياطية من الإعدادات بين فترة وفترة.</p></div>`) + v.html(r);
  if (v.mount) v.mount(r);
  if (focus) {
    window.scrollTo(0, 0);
    const h = $('#view h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}
const rerender = () => render(false);
function go(name) {
  closeDlg();
  if (location.hash.slice(1) !== name) { try { location.hash = name; } catch (e) { } }
  render();
}
window.addEventListener('hashchange', () => { if (location.hash.slice(1) !== curKey) { closeDlg(); render(); } });

/* ───── الأحداث: تفويض واحد لكل شيء ───── */
document.addEventListener('click', e => {
  const act = e.target.closest('[data-act]');
  if (act && A[act.dataset.act]) { A[act.dataset.act](act.dataset, act, e); return; }
  const a = e.target.closest('a[href^="#"]');
  if (a) { const h = a.getAttribute('href').slice(1); if (h) { e.preventDefault(); go(h); } }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (f && FORMS[f.dataset.form]) { e.preventDefault(); FORMS[f.dataset.form](f, e); }
});
document.addEventListener('input', e => { const t = e.target, k = t.dataset && t.dataset.on; if (k && ON[k]) ON[k](t, e); });
document.addEventListener('change', e => { const t = e.target, k = t.dataset && t.dataset.change; if (k && ON[k]) ON[k](t, e); });
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('g[data-act]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); A.search(); }
  else if (e.key === '/' && !typing && !dlg) { e.preventDefault(); A.search(); }
  else if (cur.name === 'review' && !typing && !dlg && V.review.key) V.review.key(e);
});
A.skip = () => { const m = $('#main'); m.setAttribute('tabindex', '-1'); m.focus(); };
A.go = d => go(d.to);

/* ───── البحث الشامل ───── */
function searchAll(q) {
  const n = norm(q); if (!n) return null;
  const rank = (title, text) => norm(title).includes(n) ? 0 : (norm(text).includes(n) ? 1 : 9);
  const out = { topics: [], lessons: [], notes: [] };
  if (sampleOn()) TOPICS.forEach(t => { const r = rank(t.t, t.def + ' ' + t.body.join(' ')); if (r < 9) out.topics.push([r, t]); });
  visibleLessons().filter(lessonReady).forEach(l => { const r = rank(l.t, l.blocks.map(b => Array.isArray(b[1]) ? b[1].join(' ') : b[1]).join(' ')); if (r < 9) out.lessons.push([r, l]); });
  S.notes.forEach(x => { const r = rank(noteTitle(x), (x.body || '') + ' ' + (x.tags || []).join(' ') + ' ' + (x.src && x.src.label || '')); if (r < 9) out.notes.push([r, x]); });
  Object.keys(out).forEach(k => { out[k] = out[k].sort((a, b) => a[0] - b[0]).map(x => x[1]); });
  return out;
}
function searchHtml(q) {
  const r = searchAll(q);
  if (!r) return `<p class="muted pad">ابحث عن موضوع أو درس أو شي دوّنته بمكتبتك.</p>`;
  const row = (href, color, title, sub) => `<a class="srow" href="#${href}">${bead(color)}<span><b dir="auto">${esc(title)}</b><small class="muted" dir="auto">${esc(sub)}</small></span></a>`;
  const grp = (name, rows) => rows.length ? `<h4 class="sgrp">${name}</h4>${rows.join('')}` : '';
  const html = grp('الموسوعة', r.topics.slice(0, 6).map(t => row('topic-' + t.id, dcol(t.d), t.t, t.def)))
    + grp('الأكاديمية', r.lessons.slice(0, 6).map(l => row('lesson-' + l.id, 'var(--c-teal)', l.t, CAT.courses[l.course].title)))
    + grp('مكتبتي', r.notes.slice(0, 8).map(n => row('note-' + n.id, TYPES[n.type].color, noteTitle(n), TYPES[n.type].name)));
  return html || `<div class="pad">${buddy('curious', pick(LINES.noResult, 'nr'), { essential: true, always: true })}</div>`;
}
A.search = () => {
  const d = openDlg(`<form class="sform" role="search" data-form="gsearch">${ic('search')}<input id="gq" type="search" data-on="gsearch" placeholder="ابحث في الموسوعة والدروس ومكتبتك" aria-label="بحث" autocomplete="off" dir="auto"></form><div id="gres" class="gres" aria-live="polite">${searchHtml('')}</div>`, { label: 'بحث', cls: 'search-dlg' });
  setTimeout(() => $('#gq', d) && $('#gq', d).focus(), 30);
};
ON.gsearch = t => { $('#gres').innerHTML = searchHtml(t.value); };
FORMS.gsearch = () => { const a = $('#gres a'); if (a) { closeDlg(); go(a.getAttribute('href').slice(1)); } };

/* ───── قائمة المزيد ───── */
A.menu = () => {
  const wide = matchMedia('(min-width:880px)').matches;
  const rows = [].concat(wide ? [] : [['graph', 'graph', 'شبكة المعرفة', 'الروابط التي صنعتها بين أفكارك']],
    [['progress', 'chart', 'تقدّمي', 'الدروس والمراجعات وآخر الأنشطة'], ['prefs', 'sliders', 'الإعدادات والنسخ الاحتياطي', 'المظهر، المحتوى التجريبي، بياناتك']]);
  openDlg(`<h3>المزيد</h3><nav class="menu" aria-label="المزيد">${rows.map(r => `<a href="#${r[0]}">${ic(r[1])}<span><b>${r[2]}</b><small class="muted">${r[3]}</small></span></a>`).join('')}</nav>
    <div class="row end"><button class="btn quiet" data-act="dlg-close">إغلاق</button></div>`, { sheet: true, label: 'المزيد', cls: 'narrow' });
};

/* ───── المظهر ───── */
let hostTheme = null;
function applyTheme() {
  const r = document.documentElement;
  if (hostTheme === null) hostTheme = r.getAttribute('data-theme') || '';
  const t = S.settings.theme;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
  else if (hostTheme) r.setAttribute('data-theme', hostTheme);
  else r.removeAttribute('data-theme');
}
