/* ═══ المراجعة المتباعدة: جلسة يومية + إدارة البطاقات ═══ */
const REV = { tab: 'session', active: false, queue: [], i: 0, shown: false, total: 0, n: 0, again: 0 };
const cardById = id => S.cards.find(c => c.id === id);
function revStart() {
  REV.queue = dueCards().map(c => c.id); REV.i = 0; REV.shown = false; REV.total = REV.queue.length; REV.n = 0; REV.again = 0; REV.active = true;
}
function revSession() {
  if (!REV.active) revStart();
  if (!S.cards.length) {
    return empty('curious', 'ما عندك بطاقات بعد', pick(LINES.emptyCards, 'rc'),
      `<button class="btn primary" data-act="new-card">${ic('plus')} أنشئ بطاقة</button>${visibleCourses().length ? '<a class="btn" href="#academy">افتح درساً</a>' : ''}`);
  }
  if (REV.i >= REV.queue.length) {
    const nd = nextDue();
    return `<section class="rv-done">${buddy(REV.n ? 'cheer' : 'calm', REV.n ? `راجعنا ${ar(REV.n, 'بطاقة', 'بطاقتين', 'بطاقات', 'بطاقة')}. ${pick(LINES.allDone, 'ad')}` :'ما عندك مراجعات مستحقة هسه.', { essential: true, cls: 'lg' })}
      <p class="muted">${isFinite(nd) ? 'أقرب بطاقة تستحق ' + whenText(nd) + '.' : ''}</p>
      <div class="row"><a class="btn primary" href="#home">للرئيسية</a><button class="btn" data-act="rv-tab" data-t="all">كل البطاقات</button></div></section>`;
  }
  const c = cardById(REV.queue[REV.i]); if (!c) { REV.i++; return revSession(); }
  const pv = SRS.preview(c), pct = Math.round(REV.i / REV.queue.length * 100);
  return `<section class="rv" aria-live="polite">
    <div class="rv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${REV.queue.length}" aria-valuenow="${REV.i}" aria-label="تقدّم الجلسة"><i style="width:${pct}%"></i></div>
    <p class="eyebrow num">البطاقة ${REV.i + 1} من ${REV.queue.length}</p>
    <div class="rv-card"><p class="eyebrow">السؤال</p><p class="rv-q read" dir="auto">${esc(c.q).replace(/\n/g, '<br>')}</p>
      ${REV.shown ? `<div class="rv-a"><p class="eyebrow">الجواب</p><p class="read" dir="auto">${esc(c.a).replace(/\n/g, '<br>')}</p></div>` : ''}</div>
    ${REV.shown ? `<p class="muted center">شلون كان تذكّرك؟</p><div class="grades">${SRS.GRADES.map(g => `<button class="gr g${g.g}" data-act="rv-grade" data-g="${g.g}"><b>${g.name}</b><small>${ivText(pv[g.g])}</small><kbd>${g.key}</kbd></button>`).join('')}</div>`
      : `<button class="btn primary big-btn" data-act="rv-show">${ic('flip')} اكشف الإجابة <kbd>مسافة</kbd></button>`}</section>`;
}
function revAll() {
  const due = dueCards().length;
  return `<div class="row between"><p class="muted">${num(S.cards.length)} بطاقة · ${due ? `<b>${due} مستحقة</b>` : 'ما اكو مستحقة'}</p><button class="btn" data-act="new-card">${ic('plus')} بطاقة جديدة</button></div>
    ${S.cards.length ? `<ul class="clist">${S.cards.slice().sort((a, b) => a.due - b.due).map(c => {
      const o = c.origin ? resolve(c.origin) : null, isDue = c.due <= now();
      return `<li><div><b dir="auto">${esc(excerpt(c.q, 90))}</b><small class="muted" dir="auto">${esc(excerpt(c.a, 110))}</small>
        <span class="eyebrow">${isDue ? '<span class="chip due">مستحقة</span>' : 'تستحق ' + whenText(c.due)}${o ? ` · <a href="#${o.route}">${esc(o.title)}</a>` : ''}</span></div>
        <button class="tbtn sm" data-act="card-del" data-id="${c.id}" aria-label="حذف البطاقة">${ic('trash')}</button></li>`;
    }).join('')}</ul>` : empty('curious', 'ما عندك بطاقات', pick(LINES.emptyCards, 'rc2'), `<button class="btn primary" data-act="new-card">${ic('plus')} أنشئ بطاقة</button>`)}`;
}
V.review = {
  html() {
    const due = dueCards().length;
    return phead('المراجعة', REV.tab === 'session' && REV.active && REV.i < REV.queue.length ? 'جلسة اليوم' : 'ثبّت اللي تعلّمته', due ? esc(LINES.due(due)) : 'البطاقات تظهر هنا بالوقت المناسب لتذكّرها قبل أن تنساها.')
      + `<div class="seg tabs" role="tablist"><button role="tab" class="seg-b${REV.tab === 'session' ? ' on' : ''}" aria-selected="${REV.tab === 'session'}" data-act="rv-tab" data-t="session">الجلسة</button><button role="tab" class="seg-b${REV.tab === 'all' ? ' on' : ''}" aria-selected="${REV.tab === 'all'}" data-act="rv-tab" data-t="all">كل البطاقات <span class="num">(${S.cards.length})</span></button></div>`
      + (REV.tab === 'session' ? revSession() : revAll());
  },
  key(e) {
    if (REV.tab !== 'session' || !REV.active || REV.i >= REV.queue.length) return;
    if ((e.key === ' ' || e.key === 'Enter') && !REV.shown && !e.target.closest('button,a')) { e.preventDefault(); A['rv-show'](); }
    else if (REV.shown && /^[1-4]$/.test(e.key)) A['rv-grade']({ g: +e.key - 1 });
  }
};
A['rv-tab'] = d => { REV.tab = d.t; if (d.t === 'session') REV.active = false; rerender(); };
const focusCard = () => { const c = $('.rv-card'); if (c) { c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: true }); } };
A['rv-show'] = () => { REV.shown = true; rerender(); focusCard(); };
A['rv-grade'] = d => {
  const c = cardById(REV.queue[REV.i]); if (!c) return;
  const g = +d.g, nx = SRS.next(c, g, now());
  mutate(s => {
    Object.assign(s.cards.find(x => x.id === c.id), nx);
    s.reviews.push({ t: now(), c: c.id, g });
    if (s.reviews.length > 3000) s.reviews.splice(0, s.reviews.length - 3000);
  });
  REV.n++; if (g === 0) { REV.again++; REV.queue.push(c.id); }
  REV.i++; REV.shown = false;
  if (REV.i >= REV.queue.length) mutate(() => log('review', 'راجعت ' + ar(REV.n, 'بطاقة', 'بطاقتين', 'بطاقات', 'بطاقة'), 'review'));
  rerender(); focusCard();
};
A['card-del'] = async d => {
  if (!await confirmDlg({ title: 'حذف البطاقة؟', text: 'تنحذف البطاقة وجدولها. سجل المراجعات السابقة يبقى.', ok: 'احذف', danger: true })) return;
  mutate(s => { s.cards = s.cards.filter(c => c.id !== d.id); }); REV.active = false; toast('انحذفت البطاقة.'); rerender();
};
