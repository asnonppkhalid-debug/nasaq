/* ═══ الموسوعة: بحث، فهرس حسب المجال، صفحات قراءة ═══ */
function wikiResults() {
  const n = norm(WIKI.q);
  let list = TOPICS.filter(t => !WIKI.d || t.d === WIKI.d);
  if (n) list = list.map(t => [norm(t.t).includes(n) ? 0 : norm(t.def + ' ' + t.body.join(' ')).includes(n) ? 1 : 9, t]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  else list = list.slice().sort((a, b) => a.t.localeCompare(b.t, 'ar'));
  return list;
}
const wikiRow = t => `<li><a href="#topic-${t.id}">${bead(dcol(t.d))}<span><b>${esc(t.t)}</b><small class="muted">${esc(t.def)}</small></span>${S.saved[t.id] ? `<span class="chip ok" title="محفوظ في مكتبتك">${ic('check')}</span>` : ''}</a></li>`;
function wikiList() {
  const list = wikiResults();
  if (!list.length) return `<div class="empty-in">${buddy('curious', pick(LINES.noResult, 'wnr'), { essential: true, always: true })}<button class="btn" data-act="wiki-clear">مسح البحث</button></div>`;
  if (WIKI.q || WIKI.d) return `<p class="muted count" aria-live="polite">${list.length === 1 ? 'نتيجة واحدة' : num(list.length) + ' نتيجة'}</p><ul class="index">${list.map(wikiRow).join('')}</ul>`;
  return Object.entries(DOMAINS).map(([k, dm]) => {
    const g = list.filter(t => t.d === k); if (!g.length) return '';
    return `<section class="dgroup" style="--b:var(${dm.color});--bs:var(${dm.soft})"><h2><span class="dot"></span>${dm.name} <small class="muted num">${g.length}</small></h2><ul class="index">${g.map(wikiRow).join('')}</ul></section>`;
  }).join('');
}
V.wiki = {
  html() {
    if (!sampleOn()) return phead('الموسوعة', 'الموضوعات والمفاهيم', 'ابحث عن أي مفهوم وانتقل بين الأفكار المرتبطة.')
      + empty('curious', 'الموسوعة فاضية', 'المحتوى التجريبي مطفأ. شغّله من الإعدادات لتشوف موضوعات تجريبية.', '<a class="btn primary" href="#prefs">فتح الإعدادات</a>');
    return phead('الموسوعة', 'الموضوعات والمفاهيم', 'ابحث عن أي مفهوم وانتقل بين الأفكار المرتبطة. المحتوى هنا تجريبي ولم يُراجَع تحريرياً.')
      + `<div class="wiki-tools"><form class="searchbox" data-form="wq" role="search">${ic('search')}<label class="sr" for="wq">ابحث في الموسوعة</label><input id="wq" data-on="wq" value="${esc(WIKI.q)}" placeholder="مثلاً: ذاكرة، حجة، جبر…" dir="auto" autocomplete="off"></form>
        <div class="chips" role="group" aria-label="المجال"><button class="chip btn-chip${!WIKI.d ? ' on' : ''}" data-act="wiki-d" data-d="">الكل</button>${Object.entries(DOMAINS).map(([k, dm]) => `<button class="chip btn-chip${WIKI.d === k ? ' on' : ''}" data-act="wiki-d" data-d="${k}" style="--b:var(${dm.color})"><i></i>${dm.name}</button>`).join('')}</div></div>
      <div id="wlist">${wikiList()}</div>`;
  }
};
ON.wq = t => { WIKI.q = t.value; $('#wlist').innerHTML = wikiList(); };
FORMS.wq = () => { const a = $('#wlist .index a'); if (a) go(a.getAttribute('href').slice(1)); };
A['wiki-d'] = d => { WIKI.d = d.d; rerender(); };
A['wiki-clear'] = () => { WIKI.q = ''; WIKI.d = ''; rerender(); };

V.topic = {
  html(r) {
    const t = CAT.topics[r.id]; if (!t) return notFound();
    const dm = DOMAINS[t.d], saved = !!S.saved[t.id], ref = { kind: 'topic', id: t.id };
    const links = linksOf(ref);
    const inLessons = Object.values(CAT.lessons).filter(l => l.topics.includes(t.id));
    return `<div class="topic" style="--b:var(${dm.color});--bs:var(${dm.soft})"><a class="back" href="#wiki">${ic('prev')} الموسوعة</a>
      ${phead(`${dm.name} ${sampleBadge()}`, esc(t.t))}
      <div class="topic-grid"><article class="topic-main">
        <p class="lead">${esc(t.def)}</p>
        <div class="prose read">${t.body.map(p => `<p>${inline(p)}</p>`).join('')}</div>
        <div class="row act-row"><button class="btn ${saved ? '' : 'primary'}" data-act="topic-save" data-id="${t.id}">${ic(saved ? 'check' : 'library')} ${saved ? 'محفوظ في مكتبتك' : 'احفظ في مكتبتي'}</button>
          <button class="btn" data-act="topic-card" data-id="${t.id}">${ic('review')} أضف بطاقة</button>
          <button class="btn" data-act="link-new" data-k="topic" data-i="${t.id}">${ic('link')} اربطه بفكرة</button></div>
        ${!saved ? `<p class="muted small">${esc(pick(LINES.save, 'sv'))}</p>` : ''}
        ${links.length ? `<section class="blk-s"><h3>روابطك</h3><ul class="nrows">${links.map(x => `<li><a href="#${x.other.route}">${bead(x.other.color)}<span><b dir="auto">${esc(x.other.title)}</b><small class="muted">${x.link.label ? esc(x.link.label) : x.other.label}</small></span></a></li>`).join('')}</ul></section>` : ''}
      </article>
      <aside class="topic-side">
        <section><h3>موضوعات مرتبطة</h3><ul class="nrows">${t.rel.filter(x => CAT.topics[x]).map(x => `<li><a href="#topic-${x}">${bead(dcol(CAT.topics[x].d))}<span><b>${esc(CAT.topics[x].t)}</b></span></a></li>`).join('')}</ul></section>
        ${inLessons.length ? `<section><h3>يرد في الدروس</h3><ul class="nrows">${inLessons.map(l => `<li><a href="#lesson-${l.id}">${bead('var(--c-teal)')}<span><b>${esc(l.t)}</b></span></a></li>`).join('')}</ul></section>` : ''}
        <section><h3>المصادر</h3>${t.src.length ? `<ul class="srcs">${t.src.map(s => `<li class="ltr-t" dir="ltr">${esc(s)}</li>`).join('')}</ul><p class="muted small">مراجع للاستزادة. لم يُتحقق من الاقتباس منها داخل المنصة.</p>` : '<p class="muted small">لا يوجد مصدر موثّق لهذا الموضوع التجريبي.</p>'}</section>
      </aside></div></div>`;
  }
};
A['topic-save'] = d => {
  const t = CAT.topics[d.id]; if (!t) return;
  if (S.saved[t.id]) { mutate(s => { delete s.saved[t.id]; }); toast('انشال من مكتبتك.'); }
  else { mutate(s => { s.saved[t.id] = now(); log('save', 'حفظت موضوع: ' + t.t, 'topic-' + t.id); }); toast('انحفظ بمكتبتك.', { act: 'مكتبتي', fn: () => go('library') }); }
  rerender();
};
A['topic-card'] = d => {
  const t = CAT.topics[d.id]; if (t) openCardEditor({ q: 'ما ' + t.t + '؟', a: t.def, origin: { kind: 'topic', id: t.id }, key: 'topic:' + t.id });
};
