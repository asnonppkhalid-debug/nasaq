/* ═══ الأكاديمية: المسارات، صفحة المسار، قراءة الدرس ═══ */
function touch() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
const notFound = () => `<div class="stack">${empty('curious', 'ما لكيت هالصفحة', 'يمكن انحذف المحتوى أو الرابط فيه خطأ.', '<a class="btn primary" href="#home">للرئيسية</a>')}</div>`;
const totalMin = c => c.lessons.reduce((s, l) => s + (l.min || 0), 0);
const aiBadge = () => `<span class="chip ai" title="كتبه الذكاء الاصطناعي ولم يراجعه محرر">ذكاء اصطناعي</span>`;
const originBadge = c => c.user ? aiBadge() : sampleBadge();
const lbeadsCls = n => 'lbeads sm' + (n > 9 ? ' many' : '');

/* ───── مصادر مقترحة (كتب وفيديوهات) ─────
   النموذج قد يخطئ بالعناوين، فلا نعرض منه أي رابط: الزر يفتح بحثاً نبنيه نحن (يوتيوب أو Google Books أو الويب). */
const RES_C = { book: 'var(--c-sky)', video: 'var(--c-rose)', course: 'var(--c-leaf)', site: 'var(--c-saffron)' };
const resUrl = r => {
  const q = encodeURIComponent((r.t + ' ' + (r.by || '')).trim());
  return r.k === 'video' ? 'https://www.youtube.com/results?search_query=' + q : (r.k === 'book' ? 'https://www.google.com/search?tbm=bks&q=' + q : 'https://www.google.com/search?q=' + q);
};
const resLabel = r => r.k === 'video' ? 'ابحث في يوتيوب' : (r.k === 'book' ? 'ابحث عن الكتاب' : 'ابحث في الويب');
const resSaved = r => S.notes.some(n => n.type === 'source' && n.title === r.t);
function resItem(r, key) {
  return `<li class="resi" style="--b:${RES_C[r.k] || RES_C.site}"><div class="resi-m"><span class="chip"><i></i>${PS.RES_KINDS[r.k] || 'مصدر'}</span>
    <b dir="auto">${esc(r.t)}</b>${r.by ? `<small class="muted" dir="auto">${esc(r.by)}</small>` : ''}${r.why ? `<p class="muted" dir="auto">${esc(r.why)}</p>` : ''}</div>
    <div class="resi-a"><a class="btn sm" href="${resUrl(r)}" target="_blank" rel="noopener noreferrer">${ic('ext')} ${resLabel(r)}</a>${resSaved(r) ? `<span class="chip ok">${ic('check')} بمكتبتك</span>` : `<button class="btn sm quiet" data-act="res-save" data-k="${key}">${ic('library')} احفظ بمكتبتي</button>`}</div></li>`;
}
const RES_NOTE = 'هذي اقتراحات من الذكاء الاصطناعي وقد يخطئ بالعناوين أو أسماء المؤلفين. الزر يفتح بحثاً عن المصدر (يوتيوب أو Google Books أو الويب) ولا يفتح صفحة محددة، فتأكد أنه موجود قبل ما تعتمد عليه.';
function courseRes(c) {
  const busy = GEN.busy && GEN.cid === c.id;
  if (c.res && c.res.length) return `<section class="course-res" id="cres" aria-label="مصادر إضافية">${sectionHead('مصادر إضافية: كتب وفيديوهات')}<p class="notice small">${RES_NOTE}</p>
    <ul class="resl">${c.res.map((r, i) => resItem(r, 'c:' + c.id + ':' + i)).join('')}</ul>
    ${busy ? '' : `<div class="row"><button class="btn quiet" data-act="gen-res" data-id="${c.id}">${ic('spark')} اقترح مصادر من جديد</button></div>`}</section>`;
  if (!c.units.length || busy) return '';
  return `<section class="course-res" id="cres" aria-label="مصادر إضافية">${sectionHead('مصادر إضافية')}<div class="resbox"><div><p><b>ما اكو مصادر مقترحة لهذا المسار بعد</b></p><p class="muted">نقترح لك كتباً وفيديوهات تكمّل الدروس. طلب واحد فقط.</p>
    <div class="row"><button class="btn primary" data-act="gen-res" data-id="${c.id}">${ic('spark')} اقترح كتباً وفيديوهات</button></div></div></div></section>`;
}
function lessonRefs(l) {
  return l.refs && l.refs.length ? `<section class="course-res lesson-res" aria-label="للتوسّع في هذا الدرس"><h2 class="resh">للتوسّع في هذا الدرس</h2><p class="notice small">${RES_NOTE}</p>
    <ul class="resl">${l.refs.map((r, i) => resItem(r, 'l:' + l.id + ':' + i)).join('')}</ul></section>` : '';
}
A['res-save'] = d => {
  const [t, id, i] = String(d.k || '').split(':'); let r, c, l = null;
  if (t === 'c') { c = CAT.courses[id]; r = c && c.res && c.res[+i]; }
  else { l = CAT.lessons[id]; c = l && CAT.courses[l.course]; r = l && l.refs && l.refs[+i]; }
  if (!r || !c) return;
  if (resSaved(r)) { toast('هذا المصدر موجود بمكتبتك.'); return; }
  const nid = uid('n');
  const body = [PS.RES_KINDS[r.k] + (r.by ? ' · ' + r.by : ''), r.why, `اقترحه الذكاء الاصطناعي ضمن مسار «${c.title}». تأكد من وجوده قبل ما تعتمد عليه، والرابط المحفوظ يفتح بحثاً وليس صفحة محددة.`].filter(Boolean).join('\n\n');
  mutate(s => {
    s.notes.unshift({ id: nid, type: 'source', title: r.t, body, tags: [PS.RES_KINDS[r.k]], src: { label: 'اقتراح ذكاء اصطناعي · ' + c.title, url: resUrl(r), ref: l ? { kind: 'lesson', id: l.id } : null }, created: now(), updated: now() });
    log('note', 'حفظت مصدراً: ' + r.t, 'note-' + nid);
  });
  toast('انحفظ بمكتبتك.', { act: 'فتح', fn: () => go('note-' + nid) }); rerender();
};

function renderBlocks(bl) {
  return bl.map(([t, x]) => {
    if (t === 'h') return `<h3>${inline(x)}</h3>`;
    if (t === 'p') return `<p>${inline(x)}</p>`;
    if (t === 'note') return `<aside class="callout"><span class="callout-t">${ic('bolt')} فكرة</span><p>${inline(x)}</p></aside>`;
    if (t === 'ul') return `<ul class="rlist">${x.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
    if (t === 'ol') return `<ol class="rlist ord">${x.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`;
    if (t === 'code') return `<pre class="code" dir="ltr" tabindex="0"><code>${esc(x)}</code></pre>`;
    return '';
  }).join('');
}

function courseRow(c) {
  const done = courseDone(c), n = c.lessons.length, pend = c.lessons.filter(l => !lessonReady(l)).length;
  const status = !n ? 'المخطط غير مكتمل، افتح المسار لتكمله' : (pend ? `${num(n - pend)} من ${num(n)} دروس مكتوبة` : `${num(totalMin(c))} دقيقة تقريباً`);
  return `<article class="crow" style="--b:${dcol(c.d)};--bs:${dsoft(c.d)}">
    <div class="disc" aria-hidden="true"><b class="num">${n ? (done ? done + '/' + n : n) : '…'}</b><span>${n ? (done ? 'أنجزت' : 'دروس') : 'يُبنى'}</span></div>
    <div class="crow-main">
      <div class="eyebrow">${esc(c.level)} · ${domName(c)} ${originBadge(c)}</div>
      <h2><a href="#course-${c.id}">${esc(c.title)}</a></h2>
      <p class="muted">${esc(c.desc || (c.spec && excerpt(c.spec.details, 140)) || '')}</p>
      ${n ? `<ol class="${lbeadsCls(n)}" aria-label="تقدّم المسار">${c.lessons.map(l => `<li class="${lessonDone(l.id) ? 'on' : ''}"></li>`).join('')}</ol>` : ''}
      <p class="eyebrow">${status}</p>
    </div></article>`;
}

V.academy = {
  html() {
    const cs = visibleCourses();
    return phead('الأكاديمية', 'مسارات تتدرّج بك خطوة خطوة', 'اختر مساراً أو افتح أي درس بلا ترتيب. التقدم يُحسب من الدروس التي تكملها فعلاً.')
      + forgeCard()
      + (cs.length ? `<div class="courses">${cs.map(courseRow).join('')}</div>`
        : empty('curious', 'ما اكو مسارات بعد', 'ابنِ مسارك الأول بالذكاء الاصطناعي من الزر أعلاه، أو شغّل المحتوى التجريبي من الإعدادات.', '<a class="btn primary" href="#prefs">فتح الإعدادات</a>'));
  }
};

function courseSide(c) {
  const n = c.lessons.length; if (!n) return '';
  const done = courseDone(c), nxt = nextLesson(c);
  return `<p class="big num">${done}<small>/${n}</small></p><p class="muted">دروس مكتملة</p>`
    + (nxt ? `<a class="btn primary" href="#lesson-${nxt.id}">${done ? 'تابع' : 'ابدأ'}: ${esc(nxt.t)}</a>` : (done >= n ? buddy('cheer', 'خلّصت المسار كله! عفية.', { essential: true, cls: 'sm' }) : ''));
}
function lessonLi(l, nxt) {
  const d = lessonDone(l.id), ready = lessonReady(l), busy = GEN.busy && GEN.active.has(l.id);
  const cls = [d ? 'done' : '', nxt && nxt.id === l.id ? 'next' : '', ready ? '' : (busy ? 'act' : (l.err ? 'fail' : 'pend'))].filter(Boolean).join(' ');
  const sub = ready ? `${num(l.min)} دقائق قراءة · ${l.cards.length} بطاقات مقترحة` : (busy ? 'يُكتب الآن…' : (l.err ? 'فشلت كتابته. افتحه وأعد المحاولة' : 'لم يُكتب بعد'));
  return `<li class="${cls}"><a href="#lesson-${l.id}"><span class="rail-b">${d ? ic('check') : ''}</span><span><b>${esc(l.t)}</b><small class="muted">${sub}</small></span>${ic('next', 'go')}</a></li>`;
}
function unitsHtml(c) {
  const nxt = nextLesson(c);
  return c.units.map(u => `<section><h2 class="unit-h">${esc(u.t)}</h2>${u.goal ? `<p class="muted unit-g">${esc(u.goal)}</p>` : ''}<ol class="rail">${u.lessons.map(l => lessonLi(l, nxt)).join('')}</ol></section>`).join('');
}

V.course = {
  html(r) {
    const c = CAT.courses[r.id]; if (!c) return notFound();
    return `<div class="stack" style="--b:${dcol(c.d)};--bs:${dsoft(c.d)}"><a class="back" href="#academy">${ic('prev')} كل المسارات</a>
      ${phead(`${esc(c.level)} · ${domName(c)} ${originBadge(c)}`, esc(c.title), esc(c.sub))}
      ${c.user ? `<p class="notice">${AI_NOTE}</p><div id="genp" aria-live="polite">${genPanelInner(c)}</div>` : ''}
      ${c.desc || c.lessons.length ? `<div class="course-top"><p class="read">${esc(c.desc)}</p><div class="course-side" id="cside">${courseSide(c)}</div></div>` : ''}
      <div id="genl">${unitsHtml(c)}</div>
      ${c.user ? courseRes(c) : ''}
      ${c.user ? `<div class="row"><button class="btn quiet" data-act="gen-del" data-id="${c.id}">${ic('trash')} حذف هذا المسار</button></div>` : ''}</div>`;
  }
};

function lessonPending(l) {
  const busy = GEN.busy && GEN.active.has(l.id);
  if (busy) return `<div class="lpend gpanel busy">${S.settings.mascot ? mascot('think') : ''}<div><p><b>نكتب هذا الدرس الآن</b></p><p class="muted">ياخذ نحو دقيقة. تقدر تتنقل بنَسَق، بس لا تسكّر التبويب.</p><div class="row"><button class="btn" data-act="gen-stop">إيقاف</button></div></div></div>`;
  return `<div class="lpend gpanel"><div><p><b>هذا الدرس لم يُكتب بعد</b></p>${l.err ? `<p class="muted">${esc(AI.errText(l.err))}</p>` : ''}<p class="muted">${esc(l.brief)}</p>
    <div class="row"><button class="btn primary" data-act="gen-lesson" data-id="${l.id}">${ic('spark')} اكتب هذا الدرس</button></div></div></div>`;
}

V.lesson = {
  html(r) {
    const l = CAT.lessons[r.id]; if (!l) return notFound();
    const c = CAT.courses[l.course], i = c.lessons.indexOf(l), prev = c.lessons[i - 1], next = c.lessons[i + 1], d = lessonDone(l.id), ready = lessonReady(l);
    const cardKey = k => 'lesson:' + l.id + ':' + k;
    const rail = c.lessons.map(x => `<li class="${lessonDone(x.id) ? 'done' : ''}${x.id === l.id ? ' here' : ''}"><a href="#lesson-${x.id}"${x.id === l.id ? ' aria-current="page"' : ''}><span class="rail-b">${lessonDone(x.id) ? ic('check') : ''}</span><span>${esc(x.t)}</span></a></li>`).join('');
    const after = !ready ? '' : `<section class="after" aria-labelledby="h-after">
          <h2 id="h-after" class="sr">بعد الدرس</h2>
          ${d ? `<div class="done-box">${buddy('cheer', pick(LINES.lessonDone, 'ld'), { essential: true })}${next && lessonReady(next) ? `<a class="btn primary" href="#lesson-${next.id}">الدرس التالي: ${esc(next.t)} ${ic('next')}</a>` : `<a class="btn primary" href="#course-${c.id}">رجوع للمسار</a>`}<button class="btn quiet" data-act="lesson-done" data-id="${l.id}">إلغاء الإكمال</button></div>`
        : `<button class="btn primary big-btn" data-act="lesson-done" data-id="${l.id}">${ic('check')} أكملت هذا الدرس</button>`}
          ${l.cards.length ? `<div class="cards-sug"><h3>بطاقات مقترحة للمراجعة</h3><ul>${l.cards.map((q, k) => {
            const has = S.cards.some(x => x.key === cardKey(k));
            return `<li><div><b dir="auto">${esc(q[0])}</b><small class="muted" dir="auto">${esc(q[1])}</small></div>${has ? `<span class="chip ok">${ic('check')} أُضيفت</span>` : `<button class="btn sm" data-act="lesson-card" data-id="${l.id}" data-k="${k}">${ic('plus')} أضف</button>`}</li>`;
          }).join('')}</ul></div>` : ''}
          <div class="row"><button class="btn" data-act="lesson-note" data-id="${l.id}">${ic('edit')} دوّن ملاحظة عن الدرس</button>${c.user ? `<button class="btn quiet" data-act="gen-lesson" data-id="${l.id}" data-regen="1">${ic('spark')} أعد كتابة الدرس</button>` : ''}</div>
          ${l.topics.length ? `<div class="rel"><h3>مواضيع مرتبطة</h3><div class="chips">${l.topics.map(t => `<a class="chip link" href="#topic-${t}" style="--b:${dcol(CAT.topics[t].d)}"><i></i>${esc(CAT.topics[t].t)}</a>`).join('')}</div></div>` : ''}
        </section>`;
    return `<div class="lesson" style="--b:${dcol(c.d)};--bs:${dsoft(c.d)}">
      <article class="lesson-main">
        <a class="back" href="#course-${c.id}">${ic('prev')} ${esc(c.title)}</a>
        <header class="phead"><div class="eyebrow"><span class="dot"></span>الدرس ${num(i + 1)} من ${num(c.lessons.length)}${ready ? ` · ${num(l.min)} دقائق` : ''} ${originBadge(c)}</div><h1>${esc(l.t)}</h1><div class="threadline" aria-hidden="true"></div></header>
        ${c.user ? `<p class="notice small">${AI_NOTE}</p>` : ''}
        ${ready ? `<div class="prose read">${renderBlocks(l.blocks)}</div>` : lessonPending(l)}
        ${ready ? lessonRefs(l) : ''}
        ${after}
        <nav class="pn" aria-label="التنقل بين الدروس">${next ? `<a href="#lesson-${next.id}"><small class="muted">التالي</small><b>${esc(next.t)}</b></a>` : '<span></span>'}${prev ? `<a href="#lesson-${prev.id}"><small class="muted">السابق</small><b>${esc(prev.t)}</b></a>` : '<span></span>'}</nav>
      </article>
      <aside class="lesson-rail" aria-label="دروس المسار"><p class="eyebrow">${esc(c.title)}</p><ol class="rail">${rail}</ol></aside></div>`;
  },
  mount(r) { const l = CAT.lessons[r.id]; if (l && lessonReady(l)) { S.progress.lastLesson = l.id; S.progress.last[l.course] = l.id; touch(); } }
};
A['lesson-done'] = d => {
  const l = CAT.lessons[d.id]; if (!l) return;
  const was = lessonDone(l.id);
  mutate(s => { if (was) delete s.progress.done[l.id]; else { s.progress.done[l.id] = now(); log('lesson', 'أكملت درس: ' + l.t, 'lesson-' + l.id); } });
  if (!was) toast('عفية! انحسب الدرس بتقدمك.');
  rerender();
};
A['lesson-card'] = d => {
  const l = CAT.lessons[d.id], q = l && l.cards[+d.k]; if (!q) return;
  if (addCard(q[0], q[1], { kind: 'lesson', id: l.id }, 'lesson:' + l.id + ':' + d.k)) { toast('انضافت للمراجعة.', { act: 'للمراجعة', fn: () => go('review') }); rerender(); }
};
A['lesson-note'] = d => {
  const l = CAT.lessons[d.id]; if (!l) return;
  openNoteEditor({ type: 'note', title: 'ملاحظتي عن: ' + l.t, src: { label: 'درس: ' + l.t }, ref: { kind: 'lesson', id: l.id } });
};
