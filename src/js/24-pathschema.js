/* ═══ مخطط المسار المولَّد وتحقّقه ═══
   دوال نقية بلا DOM (تُختبر بـ node tests/pathschema.test.js).
   كل نص قادم من نموذج لغوي أو من نسخة احتياطية يمرّ من هنا قبل أن يُحفظ، ثم يمرّ بـ esc() عند العرض. */
const PS = (() => {
  const PAL = ['learning', 'thinking', 'science', 'history', 'math'];       // ألوان المجالات الموجودة، تُوزَّع على المسارات
  const SIZES = { s: { n: 8, name: 'مختصر' }, m: { n: 12, name: 'متوسط' }, l: { n: 18, name: 'موسّع' } };
  const LIM = { title: 90, sub: 160, desc: 420, unit: 60, goal: 220, lt: 100, brief: 320, p: 1600, h: 120, note: 600, item: 420, q: 220, a: 480, code: 1800, rt: 120, rby: 80, rwhy: 220 };
  const ID = /^[A-Za-z0-9-]{3,60}$/;

  function clean(x, max) {
    if (typeof x === 'number') x = String(x);
    if (typeof x !== 'string') return '';
    x = x.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F‪-‮⁦-⁩]/g, '')   // أحرف تحكّم وتجاوز اتجاه
      .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (m, a, b) => b || a)                       // لا روابط داخلية من خارج النظام
      .replace(/\s+/g, ' ').trim();
    return x.length > max ? x.slice(0, max).trim() + '…' : x;
  }
  function cleanCode(x) {
    if (typeof x !== 'string') return '';
    x = x.replace(/\r/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F‪-‮⁦-⁩]/g, '').replace(/^\n+|\s+$/g, '');
    return x.length > LIM.code ? x.slice(0, LIM.code) : x;
  }
  const clampInt = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };

  /* يقرأ JSON من رد نموذج: الرد كله، أو كتلة ```، أو من أول { إلى آخر } ، مع إصلاح الفواصل الزائدة */
  function extractJSON(t) {
    if (t && typeof t === 'object') return t;
    t = String(t == null ? '' : t).trim(); if (!t) return null;
    const tryParse = s => { try { return JSON.parse(s); } catch (e) { } try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch (e) { } return null; };
    let v = tryParse(t); if (v !== null) return v;
    const f = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (f) { v = tryParse(f[1].trim()); if (v !== null) return v; }
    const i = t.search(/[{\[]/), j = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (i >= 0 && j > i) { v = tryParse(t.slice(i, j + 1)); if (v !== null) return v; }
    return null;
  }

  /* كتل الدرس: h p note ul ol code فقط */
  function blocks(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let b of raw.slice(0, 60)) {
      if (b && !Array.isArray(b) && typeof b === 'object') b = [b.type || b.t, b.text != null ? b.text : (b.items != null ? b.items : (b.content != null ? b.content : b.x))];
      if (!Array.isArray(b) || b.length < 2) continue;
      const t = String(b[0]);
      if (t === 'h' || t === 'p' || t === 'note') { const x = clean(b[1], LIM[t]); if (x) out.push([t, x]); }
      else if (t === 'code') { const x = cleanCode(b[1]); if (x) out.push(['code', x]); }
      else if (t === 'ul' || t === 'ol') {
        const arr = Array.isArray(b[1]) ? b[1] : (typeof b[1] === 'string' ? b[1].split(/\n+/) : []);
        const items = arr.map(i => clean(i, LIM.item)).filter(Boolean).slice(0, 14);
        if (items.length) out.push([t, items]);
      }
    }
    return out;
  }
  function cards(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (let c of raw.slice(0, 12)) {
      if (c && !Array.isArray(c) && typeof c === 'object') c = [c.q != null ? c.q : c.question, c.a != null ? c.a : c.answer];
      if (!Array.isArray(c) || c.length < 2) continue;
      const q = clean(c[0], LIM.q), a = clean(c[1], LIM.a);
      if (q && a) out.push([q, a]);
      if (out.length >= 8) break;
    }
    return out;
  }
  const wordsOf = bl => bl.reduce((n, [t, x]) => n + (Array.isArray(x) ? x.join(' ') : x).split(/\s+/).filter(Boolean).length, 0);

  /* مصادر مقترحة (كتب، فيديوهات، دورات، مواقع). النموذج قد يخطئ بالعناوين، فلا نقبل منه روابط أبداً:
     نحتفظ بالعنوان والمؤلف فقط، والواجهة هي التي تبني رابط بحث من عندها. */
  const RES_KINDS = { book: 'كتاب', video: 'فيديو', course: 'دورة', site: 'موقع' };
  function resKind(k) {
    k = String(k || '').toLowerCase();
    if (/book|كتاب|ebook|pdf|مرجع/.test(k)) return 'book';
    if (/video|youtube|فيديو|مرئ|playlist|channel|قناة|lecture|محاضر|سلسل/.test(k)) return 'video';
    if (/course|دورة|مساق|mooc|class/.test(k)) return 'course';
    return 'site';
  }
  function resources(raw, max) {
    const o = extractJSON(raw);
    const arr = Array.isArray(o) ? o : (o && typeof o === 'object' ? (o.res || o.resources || o.refs) : null);
    if (!Array.isArray(arr)) return [];
    const out = [], seen = new Set(), cap = max || 10;
    for (let r of arr.slice(0, cap * 2)) {
      if (Array.isArray(r)) r = { k: r[0], t: r[1], by: r[2], why: r[3] };
      if (!r || typeof r !== 'object') continue;
      const t = clean(r.t != null ? r.t : (r.title != null ? r.title : r.name), LIM.rt);
      if (t.length < 2 || /^(https?:|www\.)/i.test(t)) continue;                    // رابط مكان العنوان: نرفضه
      const key = t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      if (!key || seen.has(key)) continue; seen.add(key);
      out.push({
        k: resKind(r.k != null ? r.k : (r.type != null ? r.type : r.kind)), t,
        by: clean(r.by != null ? r.by : (r.author != null ? r.author : (r.channel != null ? r.channel : r.creator)), LIM.rby),
        why: clean(r.why != null ? r.why : (r.note != null ? r.note : r.reason), LIM.rwhy)
      });
      if (out.length >= cap) break;
    }
    return out;
  }

  /* رد توليد درس → { blocks, cards, refs, min } أو { err } */
  function lesson(raw) {
    const o = extractJSON(raw); if (!o || typeof o !== 'object') return { err: 'invalid_json' };
    const bl = blocks(Array.isArray(o) ? o : o.blocks), w = wordsOf(bl);
    if (bl.length < 3 || w < 120) return { err: 'too_short' };
    return { blocks: bl, cards: cards(o.cards), refs: Array.isArray(o) ? [] : resources(o.refs, 3), min: clampInt(w / 170, 3, 25, 6) };
  }
  /* رد طلب «اقترح مصادر» → { res } أو { err } */
  function resOnly(raw) {
    const o = extractJSON(raw); if (!o || typeof o !== 'object') return { err: 'invalid_json' };
    const res = resources(o, 10);
    return res.length >= 2 ? { res } : { err: 'too_small' };
  }

  /* رد المخطط → { data:{sub,desc,units} } أو { err }. يضبط العدد الكلي حتى لا تتضخّم التكلفة */
  function outline(raw, want) {
    const o = extractJSON(raw); if (!o || typeof o !== 'object' || !Array.isArray(o.units)) return { err: 'invalid_json' };
    const units = [];
    for (const u of o.units.slice(0, 6)) {
      if (!u || typeof u !== 'object') continue;
      const t = clean(u.t || u.title || u.name, LIM.unit), ls = [];
      for (const l of (Array.isArray(u.lessons) ? u.lessons : []).slice(0, 10)) {
        if (!l || typeof l !== 'object') continue;
        const lt = clean(l.t || l.title, LIM.lt); if (!lt) continue;
        ls.push({ t: lt, brief: clean(l.brief || l.summary || l.desc, LIM.brief), min: clampInt(l.min, 3, 20, 6) });
      }
      if (t && ls.length) units.push({ t, goal: clean(u.goal || u.desc, LIM.goal), lessons: ls });
    }
    let n = units.reduce((s, u) => s + u.lessons.length, 0);
    if (units.length < 2 || n < 4) return { err: 'too_small' };
    const cap = Math.min(30, (want || 12) + 6);
    while (n > cap) {                                       // ننقص من أكبر مرحلة، فلا تضيع المرحلة الأخيرة كلها
      const big = units.reduce((m, u) => u.lessons.length > m.lessons.length ? u : m, units[0]);
      if (big.lessons.length <= 1) break;
      big.lessons.pop(); n--;
    }
    return { data: { sub: clean(o.sub || o.subtitle, LIM.sub), desc: clean(o.desc || o.description, LIM.desc), units, res: resources(o, 10) } };
  }

  function colorFor(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; }

  /* تنظيف مسار محفوظ (عند التحميل أو الاستيراد). يرجع null إن كان غير صالح */
  function normCourse(c) {
    if (!c || typeof c !== 'object' || !ID.test(String(c.id))) return null;
    const title = clean(c.title, LIM.title); if (!title) return null;
    const units = [], seen = new Set(); let k = 0;
    (Array.isArray(c.units) ? c.units : []).slice(0, 8).forEach(u => {
      if (!u || typeof u !== 'object') return;
      const ls = [];
      (Array.isArray(u.lessons) ? u.lessons : []).slice(0, 12).forEach(l => {
        if (!l || typeof l !== 'object') return;
        const t = clean(l.t, LIM.lt); if (!t) return;
        k++;
        const bl = blocks(l.blocks), want = String(l.id || '');
        let id = ID.test(want) && want.startsWith(c.id + '-') && !seen.has(want) ? want : c.id + '-' + k;
        while (seen.has(id)) id += 'x';
        seen.add(id);
        const x = { id, t, brief: clean(l.brief, LIM.brief), min: clampInt(l.min, 1, 60, 6), ok: bl.length > 0, blocks: bl, cards: cards(l.cards), refs: resources(l.refs, 3), topics: [] };
        if (typeof l.err === 'string' && /^[a-z_]{2,30}$/.test(l.err)) x.err = l.err;
        ls.push(x);
      });
      const t = clean(u.t, LIM.unit); if (t && ls.length) units.push({ t, goal: clean(u.goal, LIM.goal), lessons: ls });
    });
    const sp = c.spec && typeof c.spec === 'object' ? c.spec : {};
    return {
      id: String(c.id), user: true, title, sub: clean(c.sub, LIM.sub), desc: clean(c.desc, LIM.desc),
      level: clean(c.level, 40) || 'من التأسيس إلى الاحتراف', d: PAL.includes(c.d) ? c.d : colorFor(c.id), res: resources(c.res, 10),
      created: Number.isFinite(+c.created) ? +c.created : 0,
      spec: { name: clean(sp.name, 80) || title, details: clean(sp.details, 1200), size: SIZES[sp.size] ? sp.size : 'm' }, units
    };
  }
  return { PAL, SIZES, LIM, RES_KINDS, clean, extractJSON, blocks, cards, lesson, outline, resources, resOnly, colorFor, normCourse, wordsOf };
})();
if (typeof module !== 'undefined') module.exports = { PS };
