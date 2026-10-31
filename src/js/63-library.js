/* ═══ مكتبتي: ملاحظات وأفكار واقتباسات ومصادر + المواضيع المحفوظة ═══ */
const LIB = { q: '', type: '', tag: '' };
function libItems() {
  const n = norm(LIB.q);
  let items = S.notes.filter(x => (!LIB.type || x.type === LIB.type) && (!LIB.tag || (x.tags || []).includes(LIB.tag)));
  if (n) items = items.filter(x => norm(noteTitle(x) + ' ' + x.body + ' ' + (x.tags || []).join(' ') + ' ' + ((x.src && x.src.label) || '')).includes(n));
  return items.sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
}
function libBody() {
  if (LIB.type === 'topic') {
    const ts = Object.keys(S.saved).map(id => CAT.topics[id]).filter(Boolean);
    return ts.length ? `<ul class="index">${ts.map(wikiRow).join('')}</ul>` : `<div class="empty-in"><p class="muted">ما حفظت مواضيع من الموسوعة بعد.</p><a class="btn" href="#wiki">تصفّح الموسوعة</a></div>`;
  }
  const items = libItems();
  if (!S.notes.length && !Object.keys(S.saved).length) {
    return empty('happy', 'مكتبتك فاضية بعد', pick(LINES.emptyLib, 'el2'), Object.entries(TYPES).map(([k, t]) => `<button class="btn${k === 'note' ? ' primary' : ''}" data-act="new-note" data-type="${k}">${ic('plus')} ${t.name}</button>`).join(''));
  }
  if (!items.length) return `<div class="empty-in">${buddy('curious', pick(LINES.noResult, 'lnr'), { essential: true, always: true })}<button class="btn" data-act="lib-clear">مسح الفلاتر</button></div>`;
  const saved = !LIB.type && !LIB.q && !LIB.tag ? Object.keys(S.saved).map(id => CAT.topics[id]).filter(Boolean) : [];
  return `<div class="masonry">${items.map(noteCard).join('')}</div>`
    + (saved.length ? `<section class="saved-t">${sectionHead('مواضيع محفوظة من الموسوعة')}<ul class="index">${saved.map(wikiRow).join('')}</ul></section>` : '');
}
V.library = {
  html() {
    const tags = [...new Set(S.notes.flatMap(n => n.tags || []))].sort((a, b) => a.localeCompare(b, 'ar'));
    const types = [['', 'الكل'], ['note', 'ملاحظات'], ['idea', 'أفكار'], ['quote', 'اقتباسات'], ['source', 'مصادر'], ['topic', 'مواضيع محفوظة']];
    return phead('مكتبتي', 'كل ما دوّنته وحفظته', 'ملاحظاتك وأفكارك واقتباساتك ومصادرها في مكان واحد. بياناتك محفوظة في متصفحك فقط.')
      + `<div class="wiki-tools"><div class="row grow"><form class="searchbox" data-form="lq" role="search">${ic('search')}<label class="sr" for="lq">ابحث في مكتبتك</label><input id="lq" data-on="lq" value="${esc(LIB.q)}" placeholder="ابحث بالعنوان أو المحتوى أو الوسم" dir="auto" autocomplete="off"></form>
        <button class="btn primary" data-act="new-note">${ic('plus')} جديد</button></div>
        <div class="chips" role="group" aria-label="النوع">${types.map(([k, n]) => `<button class="chip btn-chip${LIB.type === k ? ' on' : ''}" data-act="lib-type" data-t="${k}"${TYPES[k] ? ` style="--b:${TYPES[k].color}"` : ''}>${TYPES[k] ? '<i></i>' : ''}${n}</button>`).join('')}</div>
        ${tags.length ? `<div class="chips" role="group" aria-label="الوسوم">${tags.slice(0, 20).map(t => `<button class="chip btn-chip tagc${LIB.tag === t ? ' on' : ''}" data-act="lib-tag" data-t="${esc(t)}" dir="auto">#${esc(t)}</button>`).join('')}</div>` : ''}</div>
      <div id="lbody">${libBody()}</div>`;
  }
};
ON.lq = t => { LIB.q = t.value; $('#lbody').innerHTML = libBody(); };
FORMS.lq = () => { };
A['lib-type'] = d => { LIB.type = d.t; rerender(); };
A['lib-tag'] = d => { LIB.tag = LIB.tag === d.t ? '' : d.t; if (cur.name !== 'library') go('library'); else rerender(); };
A['lib-clear'] = () => { LIB.q = ''; LIB.type = ''; LIB.tag = ''; rerender(); };

/* ───── صفحة العنصر ───── */
V.note = {
  html(r) {
    const n = getNote(r.id); if (!n) return notFound();
    const t = TYPES[n.type], ref = { kind: 'note', id: n.id }, links = linksOf(ref), src = n.src || {};
    const back = src.ref ? resolve(src.ref) : null;
    let host = ''; if (src.url) { try { host = new URL(src.url).hostname; } catch (e) { host = src.url; } }
    const paras = esc(n.body).split(/\n{2,}/).map(p => `<p dir="auto">${p.replace(/\n/g, '<br>')}</p>`).join('');
    return `<div class="note-page" style="--b:${t.color};--bs:${t.soft}"><a class="back" href="#library">${ic('prev')} مكتبتي</a>
      <header class="phead"><div class="eyebrow"><span class="dot"></span>${t.name} · دوّنته ${fmtDate(n.created, { day: 'numeric', month: 'long', year: 'numeric' })}${n.updated && n.updated - n.created > 6e4 ? ` · عدّلته ${rel(n.updated)}` : ''}</div>
        <h1 dir="auto">${esc(noteTitle(n))}</h1><div class="threadline" aria-hidden="true"></div></header>
      <div class="note-grid"><article>
        ${n.type === 'quote' ? `<blockquote class="read quote" dir="auto">${paras}</blockquote>` : `<div class="prose read">${paras}</div>`}
        ${(src.label || host || back) ? `<p class="srcline">${ic('book')}<span>${src.label ? `<b dir="auto">${esc(src.label)}</b>` : ''}${host ? ` <a class="ltr" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(host)} ${ic('ext')}</a>` : ''}${back ? ` · <a href="#${back.route}">العودة إلى ${back.label === 'درس' ? 'الدرس' : 'الموضوع'}: ${esc(back.title)}</a>` : ''}</span></p>` : ''}
        ${(n.tags || []).length ? `<div class="chips">${n.tags.map(x => `<button class="chip btn-chip tagc" data-act="lib-tag" data-t="${esc(x)}" dir="auto">#${esc(x)}</button>`).join('')}</div>` : ''}
        <div class="row act-row"><button class="btn" data-act="note-edit" data-id="${n.id}">${ic('edit')} تعديل</button>
          <button class="btn" data-act="note-card" data-id="${n.id}">${ic('review')} حوّله لبطاقة</button>
          <button class="btn" data-act="link-new" data-k="note" data-i="${n.id}">${ic('link')} اربطه بفكرة</button>
          <button class="btn danger-q" data-act="note-del" data-id="${n.id}">${ic('trash')} حذف</button></div>
      </article><aside class="blk-s"><h3>روابطك</h3>${links.length ? `<ul class="nrows">${links.map(x => `<li><a href="#${x.other.route}">${bead(x.other.color)}<span><b dir="auto">${esc(x.other.title)}</b><small class="muted" dir="auto">${x.link.label ? esc(x.link.label) : x.other.label}</small></span></a><button class="tbtn sm" data-act="link-del" data-id="${x.link.id}" aria-label="حذف الرابط">${ic('x')}</button></li>`).join('')}</ul>`
        : `<p class="muted">ما اكو روابط بعد. اربط هالفكرة بفكرة ثانية لتظهر بشبكة المعرفة.</p>`}</aside></div></div>`;
  }
};
A['note-edit'] = d => openNoteEditor({ id: d.id });
A['note-card'] = d => { const n = getNote(d.id); if (n) openCardEditor({ q: n.title || '', a: excerpt(n.body, 400), origin: { kind: 'note', id: n.id } }); };
A['note-del'] = async d => {
  const n = getNote(d.id); if (!n) return;
  if (!await confirmDlg({ title: 'حذف هذا العنصر؟', text: 'راح ينحذف مع الروابط اللي عليه. البطاقات اللي أنشأتها منه تبقى.', ok: 'احذف', danger: true })) return;
  mutate(s => { s.notes = s.notes.filter(x => x.id !== n.id); s.links = s.links.filter(l => !((l.a.kind === 'note' && l.a.id === n.id) || (l.b.kind === 'note' && l.b.id === n.id))); });
  toast('انحذف.'); go('library');
};
