/* ═══ الرئيسية: تحية، أبواب ثلاثة، ومساحة تعكس حالة معرفتك الحقيقية ═══ */
const WIKI = { q: '', d: '' };
const whenText = ts => ivText(Math.max(0, (ts - now()) / DAY));

function continueCourse() {
  const vis = visibleCourses();
  const last = S.progress.lastLesson && CAT.lessons[S.progress.lastLesson];
  let c = last ? CAT.courses[last.course] : null;
  if (c && (!vis.includes(c) || !nextLesson(c))) c = null;
  return c || vis.find(x => courseDone(x) > 0 && nextLesson(x)) || null;
}

function homeContinue(course) {
  if (course) {
    const nxt = nextLesson(course), done = courseDone(course);
    return `<section class="blk cont" aria-labelledby="h-cont">${sectionHead('<span id="h-cont">متابعة المسار</span>')}
      <p class="cont-title"><b>${esc(course.title)}</b> ${originBadge(course)}</p>
      <ol class="lbeads${course.lessons.length > 9 ? ' many' : ''}" aria-label="دروس المسار">${course.lessons.map(l => `<li class="${lessonDone(l.id) ? 'on' : ''}${nxt && l.id === nxt.id ? ' next' : ''}"><a href="#lesson-${l.id}" title="${esc(l.t)}"><span class="sr">${esc(l.t)}</span></a></li>`).join('')}</ol>
      <p class="muted">أنجزت <span class="num">${done}</span> من <span class="num">${course.lessons.length}</span>. الدرس التالي: <b>${esc(nxt.t)}</b>، يحتاج نحو <span class="num">${nxt.min}</span> دقائق.</p>
      <div class="row"><a class="btn primary" href="#lesson-${nxt.id}">تابع الدرس ${ic('next')}</a><a class="btn quiet" href="#course-${course.id}">كل دروس المسار</a></div></section>`;
  }
  const vis = visibleCourses();
  if (!vis.length) return `<section class="blk cont">${sectionHead('المسارات')}<p class="muted">ما اكو مسارات بعد. ابنِ مساراً بالذكاء الاصطناعي من الأكاديمية، أو شغّل المحتوى التجريبي من الإعدادات.</p><div class="row"><a class="btn primary" href="#academy">للأكاديمية</a><a class="btn" href="#prefs">الإعدادات</a></div></section>`;
  return `<section class="blk cont">${sectionHead('ابدأ مساراً')}
    <ul class="plist">${vis.map(c => `<li><a href="#course-${c.id}">${bead(dcol(c.d))}<span><b>${esc(c.title)}</b> ${c.user ? aiBadge() : ''}<small class="muted">${c.lessons.length ? num(c.lessons.length) + ' دروس' : 'قيد البناء'} · ${esc(c.level)}</small></span>${ic('next', 'go')}</a></li>`).join('')}</ul>
    ${sampleOn() ? `<p class="muted small">${sampleBadge()} ${pick(LINES.free, 'free')}</p>` : ''}</section>`;
}

function homeReview() {
  const due = dueCards().length;
  if (due) return `<section class="blk rev">${sectionHead('المراجعة')}<p class="big num">${due}</p><p>${esc(LINES.due(due))}</p><a class="btn primary" href="#review">ابدأ المراجعة ${ic('next')}</a></section>`;
  if (S.cards.length) {
    const nd = nextDue();
    return `<section class="blk rev">${sectionHead('المراجعة')}<p class="lead-s">ما عندك مراجعات هسه.</p><p class="muted">أقرب بطاقة تستحق ${isFinite(nd) ? whenText(nd) : 'قريباً'}.</p><a class="btn" href="#review">البطاقات (${num(S.cards.length)})</a></section>`;
  }
  return `<section class="blk rev">${sectionHead('المراجعة')}${buddy('curious', pick(LINES.emptyCards, 'ec'), { essential: true, cls: 'sm' })}<div class="row"><button class="btn" data-act="new-card">${ic('plus')} أنشئ بطاقة</button></div></section>`;
}

function homeRecent() {
  const rows = S.notes.slice().sort((a, b) => (b.updated || b.created) - (a.updated || a.created)).slice(0, 3);
  if (!rows.length) return `<section class="blk">${sectionHead('آخر ما دوّنت')}${buddy('happy', pick(LINES.emptyLib, 'el'), { essential: true, cls: 'sm' })}<div class="row"><button class="btn primary" data-act="new-note">${ic('plus')} دوّن أول فكرة</button></div></section>`;
  return `<section class="blk">${sectionHead('آخر ما دوّنت', '<a class="more-l" href="#library">كل مكتبتي</a>')}<ul class="nrows">${rows.map(n => `<li><a href="#note-${n.id}">${bead(TYPES[n.type].color)}<span><b dir="auto">${esc(noteTitle(n))}</b><small class="muted" dir="auto">${esc(excerpt(n.body, 80))}</small></span><time class="muted">${rel(n.updated || n.created)}</time></a></li>`).join('')}</ul></section>`;
}

function homeExplore() {
  if (!sampleOn()) return '';
  const day = Math.floor(now() / DAY), picks = [0, 1, 2].map(i => TOPICS[(day * 3 + i * 7) % TOPICS.length]);
  return `<section class="blk">${sectionHead('للاستكشاف', sampleBadge())}<ul class="nrows">${picks.map(t => `<li><a href="#topic-${t.id}">${bead(dcol(t.d))}<span><b>${esc(t.t)}</b><small class="muted">${esc(t.def)}</small></span></a></li>`).join('')}</ul></section>`;
}

function homeState() {
  const beads = knowledgeBeads(), nLessons = Object.keys(S.progress.done).filter(id => CAT.lessons[id]).length;
  const facts = [[nLessons, 'درساً مكتملاً'], [S.notes.length, 'عنصراً في مكتبتك'], [Object.keys(S.saved).length, 'موضوعاً محفوظاً'], [S.cards.length, 'بطاقة مراجعة'], [S.links.length, 'رابطاً بين أفكارك']].filter(f => f[0] > 0);
  const nudge = S.backup.changes >= 15 ? `<p class="nudge">${ic('copy')}<span>عندك <span class="num">${S.backup.changes}</span> تغييراً بعد آخر نسخة احتياطية. <a href="#prefs">خذ نسخة هسه</a>.</span></p>` : '';
  return `<section class="blk state" aria-labelledby="h-st">${sectionHead('<span id="h-st">خيط معرفتك</span>', beads.length ? '<a class="more-l" href="#progress">تقدّمي</a>' : '')}
    ${strand(beads)}
    ${facts.length ? `<ul class="facts">${facts.map(f => `<li><b class="num">${num(f[0])}</b> ${f[1]}</li>`).join('')}</ul>`
      : '<p class="muted">الخيط فاضي لأنك لسه بالبداية. كل درس تكمله وكل فكرة تدوّنها تصير خرزة حقيقية عليه.</p>'}${nudge}</section>`;
}

V.home = {
  html() {
    const due = dueCards().length, course = continueCourse(), nxt = course && nextLesson(course);
    const date = fmtDate(now(), { weekday: 'long', day: 'numeric', month: 'long' });
    return `<section class="hero">
      ${S.settings.mascot ? `<div class="hero-buddy">${mascot(due ? 'curious' : 'happy')}</div>` : ''}
      <div class="hero-main">
        <div class="eyebrow">${date}</div>
        <h1 class="hero-h">${esc(greeting())}</h1>
        <form class="hero-q" data-form="hq" role="search"><label class="sr" for="hq">ابحث في الموسوعة</label>${ic('search')}<input id="hq" name="q" placeholder="ابحث عن مفهوم…" dir="auto" autocomplete="off"><button class="btn primary" type="submit">استكشف</button></form>
        <div class="doors">
          <a class="door main" href="#${nxt ? 'lesson-' + nxt.id : 'academy'}">${ic('academy')}<span><b>${nxt ? 'كمّل من وين وقفت' : 'ابدأ مساراً تعليمياً'}</b><small>${nxt ? esc(nxt.t) : 'اختر من الأكاديمية'}</small></span></a>
          <a class="door" href="#wiki">${ic('wiki')}<span><b>استكشف بحرية</b><small>تصفّح الموسوعة</small></span></a>
          <button class="door" data-act="new-note">${ic('plus')}<span><b>دوّن فكرة</b><small>تنحفظ بمكتبتك</small></span></button>
        </div>
      </div></section>
      <div class="split a">${homeContinue(course)}${homeReview()}</div>
      <div class="split b">${homeRecent()}${homeExplore()}</div>
      ${homeState()}`;
  }
};
FORMS.hq = f => { WIKI.q = String(new FormData(f).get('q') || '').trim(); WIKI.d = ''; go('wiki'); };
