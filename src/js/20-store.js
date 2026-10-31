/* ═══ المخزن: حالة التطبيق وحفظها محلياً (localStorage) ═══
   كل بيانات المستخدم في كائن واحد S. التغيير يمرّ عبر mutate() ليُحفظ ويُحتسب في عدّاد النسخ الاحتياطي. */
const KEY = 'nasaq:v1';
const blankState = () => ({
  v: 1, created: now(),
  settings: { theme: 'system', mascot: true, sample: true },
  notes: [], links: [], cards: [], courses: [],   // courses: مسارات بناها المستخدم بالذكاء الاصطناعي
  progress: { done: {}, last: {} },
  saved: {},
  activity: [], reviews: [],
  backup: { last: 0, changes: 0 }
});
let S = blankState(), storageOK = true, saveT = null;

function migrate(o) {
  const b = blankState();
  if (!o || typeof o !== 'object') return b;
  const out = Object.assign(b, o);
  out.settings = Object.assign(blankState().settings, o.settings || {});
  out.progress = Object.assign({ done: {}, last: {} }, o.progress || {});
  out.progress.done = out.progress.done || {}; out.progress.last = out.progress.last || {};
  out.backup = Object.assign({ last: 0, changes: 0 }, o.backup || {});
  ['notes', 'links', 'cards', 'activity', 'reviews', 'courses'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  const seen = new Set();   // مسارات تالفة أو مكرّرة تُسقَط بدل أن تكسر الواجهة
  out.courses = out.courses.map(PS.normCourse).filter(c => c && !seen.has(c.id) && seen.add(c.id)).slice(0, 40);
  if (!out.saved || typeof out.saved !== 'object') out.saved = {};
  out.v = 1;
  return out;
}
function loadState() {
  try {
    localStorage.setItem(KEY + ':t', '1'); localStorage.removeItem(KEY + ':t');
    const raw = localStorage.getItem(KEY);
    if (raw) S = migrate(JSON.parse(raw));
  } catch (e) { storageOK = false; }
}
function flush() {
  clearTimeout(saveT); saveT = null;
  if (!storageOK) return;
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { storageOK = false; toast('تعذّر الحفظ في المتصفح. خذ نسخة احتياطية الآن.'); }
}
function mutate(fn) {
  fn(S);
  S.backup.changes++;
  clearTimeout(saveT); saveT = setTimeout(flush, 250);
}
function log(type, label, route) {
  S.activity.unshift({ t: now(), type, label, route: route || '' });
  if (S.activity.length > 200) S.activity.length = 200;
}

/* ═══ الفهرس: المحتوى التجريبي المرفق ═══ */
const CAT = { topics: {}, lessons: {}, courses: {} };
function indexCatalog() {
  TOPICS.forEach(t => { CAT.topics[t.id] = t; });
  COURSES.forEach(c => {
    CAT.courses[c.id] = c; c.lessons = [];
    c.units.forEach((u, ui) => u.lessons.forEach(l => { l.course = c.id; l.unit = ui; c.lessons.push(l); CAT.lessons[l.id] = l; }));
  });
}
/* مسارات المستخدم: نبني نسخة عرض لكل مسار (فيها lessons مسطّحة) ونترك المخزَّن بلا تكرار */
function indexUserCourses() {
  Object.keys(CAT.courses).forEach(id => { const v = CAT.courses[id]; if (v.user) { v.lessons.forEach(l => { delete CAT.lessons[l.id]; }); delete CAT.courses[id]; } });
  S.courses.forEach(c => {
    const v = Object.assign({}, c, { lessons: [] });
    c.units.forEach((u, ui) => u.lessons.forEach(l => { l.course = c.id; l.unit = ui; v.lessons.push(l); CAT.lessons[l.id] = l; }));
    CAT.courses[c.id] = v;
  });
}
const dcol = d => `var(${DOMAINS[d].color})`;
const dsoft = d => `var(${DOMAINS[d].soft})`;
const domName = c => c.user ? 'مساري' : DOMAINS[c.d].name;
const sampleOn = () => !!S.settings.sample;
const lessonReady = l => l.ok !== false;   // الدروس التجريبية جاهزة دائماً؛ المولَّدة جاهزة بعد كتابتها
const userCourses = () => S.courses.map(c => CAT.courses[c.id]).filter(Boolean).sort((a, b) => b.created - a.created);
const visibleCourses = () => userCourses().concat(sampleOn() ? COURSES : []);
const visibleLessons = () => visibleCourses().reduce((a, c) => a.concat(c.lessons), []);
const lessonDone = id => !!S.progress.done[id];
const courseDone = c => c.lessons.filter(l => lessonDone(l.id)).length;
function nextLesson(c) { return c.lessons.find(l => !lessonDone(l.id) && lessonReady(l)) || null; }

/* ═══ العناصر: ملاحظات ومواضيع ودروس تُعرَض بشكل موحّد ═══ */
const TYPES = {
  note: { name: 'ملاحظة', color: 'var(--c-sky)', soft: 'var(--s-sky)' },
  idea: { name: 'فكرة', color: 'var(--c-saffron)', soft: 'var(--s-saffron)' },
  quote: { name: 'اقتباس', color: 'var(--c-rose)', soft: 'var(--s-rose)' },
  source: { name: 'مصدر', color: 'var(--c-leaf)', soft: 'var(--s-leaf)' }
};
const getNote = id => S.notes.find(n => n.id === id);
function noteTitle(n) {
  if (n.title && n.title.trim()) return n.title.trim();
  const b = (n.body || '').trim().replace(/\s+/g, ' ');
  return b ? (b.length > 44 ? b.slice(0, 44) + '…' : b) : 'بلا عنوان';
}
function resolve(ref) {
  if (!ref) return null;
  if (ref.kind === 'note') {
    const n = getNote(ref.id); if (!n) return null;
    return { kind: 'note', id: n.id, title: noteTitle(n), color: TYPES[n.type].color, route: 'note-' + n.id, label: TYPES[n.type].name };
  }
  if (ref.kind === 'topic') {
    const t = CAT.topics[ref.id]; if (!t) return null;
    return { kind: 'topic', id: t.id, title: t.t, color: dcol(t.d), route: 'topic-' + t.id, label: 'موضوع' };
  }
  if (ref.kind === 'lesson') {
    const l = CAT.lessons[ref.id]; if (!l) return null;
    return { kind: 'lesson', id: l.id, title: l.t, color: 'var(--c-teal)', route: 'lesson-' + l.id, label: 'درس' };
  }
  return null;
}
const sameRef = (a, b) => a.kind === b.kind && a.id === b.id;

/* ═══ الروابط بين العناصر (يصنعها المستخدم فقط) ═══ */
function linksOf(ref) {
  return S.links.filter(l => sameRef(l.a, ref) || sameRef(l.b, ref))
    .map(l => ({ link: l, other: resolve(sameRef(l.a, ref) ? l.b : l.a) })).filter(x => x.other);
}
function addLink(a, b, label) {
  if (sameRef(a, b)) return 'same';
  if (S.links.some(l => (sameRef(l.a, a) && sameRef(l.b, b)) || (sameRef(l.a, b) && sameRef(l.b, a)))) return 'dup';
  mutate(s => { s.links.push({ id: uid('l'), a: { kind: a.kind, id: a.id }, b: { kind: b.kind, id: b.id }, label: (label || '').trim(), t: now() }); log('link', 'ربطت فكرتين'); });
  return 'ok';
}
const removeLink = id => mutate(s => { s.links = s.links.filter(l => l.id !== id); });

/* ═══ البطاقات ═══ */
function addCard(q, a, origin, key) {
  q = (q || '').trim(); a = (a || '').trim();
  if (!q || !a) return false;
  if (key && S.cards.some(c => c.key === key)) return false;
  mutate(s => { s.cards.push(Object.assign({ id: uid('c'), q, a, origin: origin || null, key: key || '', created: now() }, SRS.fresh())); });
  return true;
}
const dueCards = () => S.cards.filter(c => c.due <= now()).sort((x, y) => x.due - y.due);
const nextDue = () => S.cards.filter(c => c.due > now()).reduce((m, c) => Math.min(m, c.due), Infinity);

/* ═══ النسخ الاحتياطي ═══ */
function exportJSON() {
  return JSON.stringify({ app: 'nasaq', version: 1, exported: new Date().toISOString(), data: S });
}
function parseBackup(text) {
  let o; try { o = JSON.parse(text); } catch (e) { return { err: 'النص ليس JSON صالحاً.' }; }
  const d = o && o.app === 'nasaq' ? o.data : null;
  if (!d || typeof d !== 'object') return { err: 'هالملف مو مال نَسَق. تأكد من أنه نسخة احتياطية منها.' };
  const data = migrate(d);
  return { data, counts: { notes: data.notes.length, cards: data.cards.length, links: data.links.length, courses: data.courses.length, lessons: Object.keys(data.progress.done).length } };
}
function applyBackup(data, mode) {
  if (mode === 'replace') { S = migrate(data); S.backup.changes = 0; S.backup.last = now(); indexUserCourses(); flush(); return; }
  mutate(s => {
    const mergeBy = (k) => { const ids = new Set(s[k].map(x => x.id)); data[k].forEach(x => { if (!ids.has(x.id)) s[k].push(x); }); };
    ['notes', 'links', 'cards', 'courses'].forEach(mergeBy);
    Object.assign(s.progress.done, data.progress.done); Object.assign(s.progress.last, data.progress.last);
    Object.assign(s.saved, data.saved);
    s.activity = s.activity.concat(data.activity).sort((x, y) => y.t - x.t).slice(0, 200);
    s.reviews = s.reviews.concat(data.reviews).sort((x, y) => x.t - y.t).slice(-3000);
  });
  indexUserCourses(); flush();
}
