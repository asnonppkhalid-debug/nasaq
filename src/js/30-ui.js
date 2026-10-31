/* ═══ مكوّنات مشتركة بين الواجهات: رؤوس، حالات فارغة، محرّرات ═══ */
function phead(eyebrow, title, sub, extra) {
  return `<header class="phead"><div class="eyebrow"><span class="dot"></span>${eyebrow}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}${extra || ''}<div class="threadline" aria-hidden="true"></div></header>`;
}
const sampleBadge = () => `<span class="chip sample" title="محتوى تجريبي لم يُراجَع تحريرياً">تجريبي</span>`;
const chip = (t, c) => `<span class="chip"${c ? ` style="--b:${c}"` : ''}>${c ? '<i></i>' : ''}${esc(t)}</span>`;
const excerpt = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).trim() + '…' : s; };
function empty(mood, title, text, actions) {
  return `<section class="empty">${S.settings.mascot ? mascot(mood) : ''}<div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div></section>`;
}
const sectionHead = (t, more) => `<div class="shead"><h2>${t}</h2>${more || ''}</div>`;

/* خيط المعرفة: خرزة لكل شيء حقيقي أنجزه المستخدم أو حفظه */
function knowledgeBeads() {
  const b = [];
  Object.entries(S.progress.done).forEach(([id, t]) => { const l = CAT.lessons[id]; if (l) b.push({ t, c: 'var(--c-teal)', l: 'درس: ' + l.t }); });
  S.notes.forEach(n => b.push({ t: n.created, c: TYPES[n.type].color, l: TYPES[n.type].name + ': ' + noteTitle(n) }));
  Object.entries(S.saved).forEach(([id, t]) => { const x = CAT.topics[id]; if (x) b.push({ t, c: dcol(x.d), l: 'موضوع: ' + x.t }); });
  return b.sort((x, y) => x.t - y.t);
}
function strand(beads) {
  const max = innerWidth < 600 ? 11 : 26;
  if (!beads.length) return `<div class="strand empty" role="img" aria-label="الخيط فارغ لأنك ما حفظت شيئاً بعد"><span class="strand-line"></span></div>`;
  const shown = beads.slice(-max), hidden = beads.length - shown.length;
  return `<div class="strand" role="img" aria-label="${beads.length} عنصر على خيط معرفتك"><span class="strand-line"></span>${hidden ? `<span class="more num">+${hidden}</span>` : ''}${shown.map(x => `<i class="sb" style="--b:${x.c}" title="${esc(x.l)}"></i>`).join('')}</div>`;
}

function noteCard(n) {
  const t = TYPES[n.type];
  return `<article class="ncard t-${n.type}" style="--b:${t.color};--bs:${t.soft}"><a href="#note-${n.id}">
    <div class="ncard-top">${bead(t.color)}<span class="eyebrow">${t.name}</span><span class="eyebrow tm">${rel(n.updated || n.created)}</span></div>
    ${n.title ? `<h3 dir="auto">${esc(n.title)}</h3>` : ''}
    <p class="ncard-body" dir="auto">${esc(excerpt(n.body, n.type === 'quote' ? 190 : 150))}</p>
    ${(n.tags || []).length ? `<div class="tags">${n.tags.slice(0, 4).map(x => `<span class="tag" dir="auto">#${esc(x)}</span>`).join('')}</div>` : ''}</a></article>`;
}

/* ═══ محرّر الملاحظات (إنشاء وتعديل) ═══ */
function openNoteEditor(o = {}) {
  const n = o.id ? getNote(o.id) : null, v = n || o, src = v.src || {};
  const type = v.type || 'note';
  const ref = !n && o.ref ? o.ref : null;
  openDlg(`<form data-form="note" ${ref ? `data-rk="${ref.kind}" data-ri="${esc(ref.id)}"` : ''} novalidate>
    <h3>${n ? 'تعديل العنصر' : 'عنصر جديد في مكتبتك'}</h3>
    <fieldset class="seg"><legend class="sr">النوع</legend>${Object.entries(TYPES).map(([k, t]) => `<label class="seg-i"><input type="radio" name="type" value="${k}"${k === type ? ' checked' : ''}><span>${t.name}</span></label>`).join('')}</fieldset>
    <label class="fld"><span>العنوان <small>اختياري</small></span><input name="title" value="${esc(v.title || '')}" dir="auto" maxlength="140" autocomplete="off"></label>
    <label class="fld"><span>المحتوى</span><textarea name="body" rows="6" dir="auto" required>${esc(v.body || '')}</textarea></label>
    <div class="fld2"><label class="fld"><span>المصدر <small>اختياري</small></span><input name="srcl" value="${esc(src.label || '')}" dir="auto" placeholder="كتاب، مقال، شخص…" autocomplete="off"></label>
    <label class="fld"><span>رابط المصدر</span><input name="srcu" type="url" inputmode="url" dir="ltr" value="${esc(src.url || '')}" placeholder="https://" autocomplete="off"></label></div>
    <label class="fld"><span>وسوم <small>افصل بينها بفاصلة</small></span><input name="tags" value="${esc((v.tags || []).join('، '))}" dir="auto" autocomplete="off"></label>
    <input type="hidden" name="id" value="${n ? n.id : ''}">
    <div class="row end"><button type="button" class="btn quiet" data-act="dlg-close">إلغاء</button><button class="btn primary" type="submit">${n ? 'حفظ التعديل' : 'حفظ في مكتبتي'}</button></div></form>`,
    { label: 'محرّر المكتبة', sheet: true });
  setTimeout(() => { const f = $('form[data-form="note"] textarea'); if (f && !o.id) f.focus(); }, 40);
}
FORMS.note = f => {
  const fd = new FormData(f), body = String(fd.get('body') || '').trim();
  if (!body) { toast('اكتب شي بخانة المحتوى أول.'); return; }
  let url = String(fd.get('srcu') || '').trim();
  if (url) {
    try { const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw 0; url = u.href; }
    catch (e) { toast('الرابط لازم يكون صالحاً ويبدأ بـ https.'); return; }
  }
  const type = TYPES[fd.get('type')] ? fd.get('type') : 'note', title = String(fd.get('title') || '').trim();
  const label = String(fd.get('srcl') || '').trim();
  const tags = [...new Set(String(fd.get('tags') || '').split(/[,،]/).map(x => x.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 12);
  const id = String(fd.get('id') || '');
  if (id) {
    mutate(s => { const n = s.notes.find(x => x.id === id); if (n) Object.assign(n, { type, title, body, tags, src: Object.assign({}, n.src, { label, url }), updated: now() }); });
    toast('تم حفظ التعديل.');
  } else {
    const nid = uid('n'), ref = f.dataset.rk ? { kind: f.dataset.rk, id: f.dataset.ri } : null;
    mutate(s => { s.notes.unshift({ id: nid, type, title, body, tags, src: { label, url, ref }, created: now(), updated: now() }); log('note', 'دوّنت: ' + noteTitle({ title, body }), 'note-' + nid); });
    toast('انحفظ بمكتبتك.', { act: 'فتح', fn: () => go('note-' + nid) });
  }
  closeDlg(); rerender();
};
A['new-note'] = d => openNoteEditor({ type: d.type || 'note' });

/* ═══ محرّر البطاقات ═══ */
function openCardEditor(o = {}) {
  openDlg(`<form data-form="card" data-key="${esc(o.key || '')}" ${o.origin ? `data-ok="${o.origin.kind}" data-oi="${esc(o.origin.id)}"` : ''}>
    <h3>بطاقة مراجعة جديدة</h3>
    <label class="fld"><span>السؤال (الوجه الأمامي)</span><textarea name="q" rows="2" dir="auto" required>${esc(o.q || '')}</textarea></label>
    <label class="fld"><span>الجواب (الوجه الخلفي)</span><textarea name="a" rows="3" dir="auto" required>${esc(o.a || '')}</textarea></label>
    <div class="row end"><button type="button" class="btn quiet" data-act="dlg-close">إلغاء</button><button class="btn primary" type="submit">أضف إلى المراجعة</button></div></form>`,
    { label: 'بطاقة جديدة', sheet: true });
}
FORMS.card = f => {
  const fd = new FormData(f);
  const ok = addCard(fd.get('q'), fd.get('a'), f.dataset.ok ? { kind: f.dataset.ok, id: f.dataset.oi } : null, f.dataset.key);
  if (!ok) { toast('اكتب السؤال والجواب كاملين، أو البطاقة موجودة من قبل.'); return; }
  closeDlg(); toast('انضافت البطاقة. راح تظهر بالمراجعة.', { act: 'للمراجعة', fn: () => go('review') }); rerender();
};
A['new-card'] = () => openCardEditor();

/* ═══ محرّر الروابط: يربط عنصرين يختارهما المستخدم ═══ */
function linkOptions(sel) {
  const g = (name, arr) => arr.length ? `<optgroup label="${name}">${arr.map(r => `<option value="${r.kind}:${r.id}"${sel === r.kind + ':' + r.id ? ' selected' : ''}>${esc(r.title)}</option>`).join('')}</optgroup>` : '';
  const topics = (sampleOn() ? TOPICS : TOPICS.filter(t => S.saved[t.id])).map(t => resolve({ kind: 'topic', id: t.id }));
  const lessons = visibleLessons().filter(lessonReady).map(l => resolve({ kind: 'lesson', id: l.id }));
  return '<option value="">اختر عنصراً…</option>' + g('مكتبتي', S.notes.map(n => resolve({ kind: 'note', id: n.id }))) + g('الموسوعة', topics) + g('الدروس', lessons);
}
function openLinkEditor(from) {
  const key = from ? from.kind + ':' + from.id : '';
  openDlg(`<form data-form="link"><h3>ربط فكرتين</h3>
    <p class="muted">اختر عنصرين واكتب كلمة تصف العلاقة بينهما، مثل «يسبّب» أو «مثال على».</p>
    <label class="fld"><span>من</span><select name="a" required>${linkOptions(key)}</select></label>
    <label class="fld"><span>إلى</span><select name="b" required>${linkOptions('')}</select></label>
    <label class="fld"><span>العلاقة <small>اختياري</small></span><input name="label" dir="auto" maxlength="40" autocomplete="off" placeholder="يوضّح، يعارض، جزء من…"></label>
    <div class="row end"><button type="button" class="btn quiet" data-act="dlg-close">إلغاء</button><button class="btn primary" type="submit">اربطهما</button></div></form>`,
    { label: 'ربط فكرتين', sheet: true, cls: 'narrow' });
}
FORMS.link = f => {
  const fd = new FormData(f), p = x => { const i = String(x || '').indexOf(':'); return i < 1 ? null : { kind: x.slice(0, i), id: x.slice(i + 1) }; };
  const a = p(fd.get('a')), b = p(fd.get('b'));
  if (!a || !b) { toast('اختر العنصرين أول.'); return; }
  const r = addLink(a, b, fd.get('label'));
  if (r === 'same') { toast('اختر عنصرين مختلفين.'); return; }
  if (r === 'dup') { toast('هذين العنصرين مربوطين من قبل.'); return; }
  closeDlg(); toast('انربطت الفكرتين.', { act: 'الشبكة', fn: () => go('graph') }); rerender();
};
A['link-new'] = d => openLinkEditor(d.k ? { kind: d.k, id: d.i } : null);
A['link-del'] = d => { removeLink(d.id); toast('انحذف الرابط.'); rerender(); };
