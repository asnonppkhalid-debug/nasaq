/* ═══ بناء مسار بالذكاء الاصطناعي ═══
   مرحلتان: (1) مخطط بأربع مراحل من التأسيس إلى الاحتراف، (2) كتابة كل درس بطلب منفصل.
   كل درس يُحفظ فور اكتماله، فأي انقطاع يخسّرك درساً واحداً لا المسار كله، وتكمّل من حيث وقفت. */
const GEN = { busy: false, cid: null, phase: '', ctl: null, stop: false, err: '', fails: 0, fin: 0, total: 0, active: new Set() };
const AI_NOTE = 'كتب هذا المسار الذكاء الاصطناعي بناءً على طلبك، ولم يراجعه محرر. قد تحتوي دروسه على أخطاء، فتحقّق من أي معلومة مهمة قبل ما تعتمد عليها.';

/* ───── المطالبات ───── */
const specBlock = s => `اسم المسار: «${s.name}»\nتفاصيل المتعلّم وهدفه: «${s.details || 'لم يذكر تفاصيل. افترض متعلّماً عربياً مبتدئاً يريد الوصول إلى مستوى احترافي.'}»`;
function outlinePrompt(spec) {
  const n = PS.SIZES[spec.size].n;
  return `أنت مصمّم مناهج تعليمية خبير. صمّم مخطط مسار تعليمي كامل بالعربية الفصحى المبسّطة، يأخذ المتعلّم من الصفر (التأسيس) إلى مستوى الاحتراف.

${specBlock(spec)}
عدد الدروس الكلي: نحو ${n} (لا يقل عن ${n - 2} ولا يزيد عن ${n + 2}).

القواعد:
- أربع مراحل بهذا الترتيب وهذه الأسماء بالضبط: التأسيس، البناء، التعمّق، الاحتراف. يتدرّج المستوى بلا قفزات، وكل درس يبني على ما قبله.
- كل درس يعلّم فكرة أو مهارة واحدة محددة. العناوين محددة (مثل «كيف تقرأ ملف CSV») وليست عامة (مثل «مقدمة»).
- مرحلة الاحتراف تتضمن تطبيقات عملية أو مشروعاً ختامياً، ومعايير الجودة وأخطاء المحترفين الشائعة.
- راعِ تفاصيل المتعلّم أعلاه في اختيار الأمثلة والتركيز، لكن لا تحذف التأسيس.
- لا تذكر إحصاءات أو أرقاماً غير مؤكدة.
- أضف حقل res: من 6 إلى 10 مصادر إضافية تعرفها يقيناً ويفيد المتعلّم: 3 إلى 4 كتب على الأقل، و3 إلى 4 مصادر مرئية (سلسلة فيديو أو قناة يوتيوب أو محاضرات مصوّرة معروفة)، ويجوز دورة أو موقع توثيق رسمي. لكل مصدر: العنوان الدقيق، والمؤلف أو القناة، وجملة قصيرة عن فائدته ولمن يناسب. فضّل الجيد بالعربية إن وُجد، وإلا الإنجليزي.
- لا تخترع عنوان كتاب أو مؤلفاً أو قناة، ولا تكتب روابط. إن لم تكن متأكداً من مصدر فاحذفه واكتب عدداً أقل.

أجب بكائن JSON واحد فقط، بلا أي نص خارجه، بهذا الشكل:
{"sub":"سطر يلخّص المسار","desc":"فقرة من جملتين أو ثلاث تصف المسار ولمن هو","units":[{"t":"التأسيس","goal":"ما سيتقنه المتعلّم بنهاية المرحلة","lessons":[{"t":"عنوان الدرس","brief":"جملتان: ماذا سيتعلّم وما أبرز ما يغطيه الدرس","min":6}]}],"res":[{"k":"book","t":"العنوان الدقيق للكتاب","by":"المؤلف","why":"فائدته ولمن يناسب"},{"k":"video","t":"اسم السلسلة أو الفيديو","by":"القناة أو المحاضر","why":"فائدته"}]}
قيم k المسموحة فقط: book, video, course, site.`;
}
function lessonPrompt(c, l, lite) {
  const all = []; let k = 0;
  c.units.forEach(u => { all.push(u.t + ':'); u.lessons.forEach(x => { k++; all.push(`  ${k}. ${x.t}${x.id === l.id ? '   ← هذا الدرس' : ''}`); }); });
  const u = c.units[l.unit], i = c.lessons.indexOf(l);
  return `أنت معلّم خبير. اكتب نص درس كامل بالعربية الفصحى المبسّطة ضمن مسار تعليمي.

المسار: «${c.title}»
${c.spec.details ? `المتعلّم وهدفه: «${c.spec.details}»\n` : ''}المرحلة: ${u.t}${u.goal ? ` — هدفها: ${u.goal}` : ''}
الدرس ${i + 1} من ${c.lessons.length}: «${l.t}»
ما يغطيه الدرس: ${l.brief}

فهرس المسار (للسياق وتجنّب تكرار ما في دروس أخرى):
${all.join('\n')}

المتطلبات:
- ما بين ${lite ? '280 و420' : '450 و750'} كلمة تقريباً، موزّعة على كتل.
- ابدأ بفقرة تمهّد للدرس وتربطه بما قبله، ثم ${lite ? 'قسمين' : 'قسمين إلى أربعة أقسام'} بعناوين، فيها شرح واضح وأمثلة ملموسة.
- ضع فكرة مركزية واحدة أو اثنتين في كتلة note، وقوائم ul أو ol حيث تفيد (خطوات، نقاط).
- إن كان الموضوع تقنياً أو برمجياً فاستعمل كتل code لأمثلة قصيرة وصحيحة.
- اختم بقسم بعنوان «تمرين» فيه تمرين عملي قصير قابل للتنفيذ، وفي مرحلة الاحتراف اجعله مشروعاً مصغّراً.
- المصطلح الأجنبي المعروف يُكتب بالإنجليزية بين قوسين عند أول ذكر.
- لا تخترع اقتباسات أو أرقاماً أو إحصاءات. إن لم تكن واثقاً من معلومة فعمّم ولا تجزم.
- في حقل refs اقترح من 1 إلى 3 مصادر للتوسّع في هذا الدرس بالذات (فصل من كتاب أو فيديو أو شرح مصوّر) تعرفها يقيناً: العنوان الدقيق والمؤلف أو القناة. لا تكتب روابط ولا تخترع عنواناً؛ إن لم تكن متأكداً فاترك refs قائمة فارغة [].
- من ثلاث إلى خمس بطاقات مراجعة (سؤال قصير وجواب قصير) تغطي أهم الأفكار.
- نص عادي بلا Markdown (لا نجوم ولا #)، ويُسمح بـ **تغليظ** لكلمات قليلة فقط.

أجب بكائن JSON واحد فقط، بلا أي نص خارجه، بهذا الشكل:
{"blocks":[["p","فقرة"],["h","عنوان قسم"],["p","فقرة"],["note","فكرة مركزية"],["ul",["نقطة","نقطة"]],["ol",["خطوة","خطوة"]],["code","مثال شيفرة"]],"cards":[["سؤال","جواب"]],"refs":[{"k":"book","t":"العنوان الدقيق","by":"المؤلف أو القناة"}]}
قيم k المسموحة فقط: book, video, course, site.
أنواع الكتل المسموحة فقط: p, h, note, ul, ol, code.`;
}

function resPrompt(c) {
  const all = c.units.map(u => u.t + ': ' + u.lessons.map(x => x.t).join('، ')).join('\n');
  return `اقترح مصادر إضافية (كتباً ومصادر مرئية) تناسب مساراً تعليمياً بالعربية. أنت أمين مكتبة ومرشد تعليمي خبير.

المسار: «${c.title}»
${c.spec.details ? `المتعلّم وهدفه: «${c.spec.details}»\n` : ''}مراحل المسار ودروسه:
${all}

المطلوب: من 6 إلى 10 مصادر تعرفها يقيناً: 3 إلى 4 كتب على الأقل، و3 إلى 4 مصادر مرئية (سلسلة فيديو أو قناة يوتيوب أو محاضرات مصوّرة معروفة)، ويجوز دورة أو موقع توثيق رسمي. لكل مصدر: العنوان الدقيق، والمؤلف أو القناة، وجملة قصيرة عن فائدته ولمن يناسب. فضّل الجيد بالعربية إن وُجد، وإلا الإنجليزي.
لا تخترع عنوان كتاب أو مؤلفاً أو قناة، ولا تكتب روابط. إن لم تكن متأكداً من مصدر فاحذفه واكتب عدداً أقل.

أجب بكائن JSON واحد فقط، بلا أي نص خارجه، بهذا الشكل:
{"res":[{"k":"book","t":"العنوان الدقيق","by":"المؤلف أو القناة","why":"فائدته ولمن يناسب"}]}
قيم k المسموحة فقط: book, video, course, site.`;
}

/* ───── المشغّل ───── */
const findStored = (s, lid) => { for (const c of s.courses) for (const u of c.units) for (const l of u.lessons) if (l.id === lid) return l; return null; };
const onCourse = cid => cur && cur.name === 'course' && cur.id === cid;
const stageUnits = (units, cid) => { let k = 0; return units.map(u => ({ t: u.t, goal: u.goal, lessons: u.lessons.map(l => ({ id: cid + '-' + (++k), t: l.t, brief: l.brief, min: l.min, ok: false, blocks: [], cards: [], topics: [] })) })); };

function genStop() { if (GEN.busy) { GEN.stop = true; try { GEN.ctl.abort(); } catch (e) { } } }
A['gen-stop'] = () => genStop();

async function runBuild(cid, only, regen) {
  if (GEN.busy || !S.courses.some(x => x.id === cid)) return;
  Object.assign(GEN, { busy: true, cid, ctl: new AbortController(), stop: false, err: '', fails: 0, fin: 0, total: 0 });
  GEN.active.clear();
  GEN.phase = S.courses.find(x => x.id === cid).units.length ? 'lessons' : 'outline';
  paintGen();
  try {
    if (GEN.phase === 'outline') {
      const c = S.courses.find(x => x.id === cid);
      const raw = await AI.ask(outlinePrompt(c.spec), { json: true, signal: GEN.ctl.signal, command: 'build-path-outline', label: c.title });
      const r = PS.outline(raw, PS.SIZES[c.spec.size].n);
      if (r.err) throw { code: r.err };
      mutate(s => { const x = s.courses.find(y => y.id === cid); if (x) Object.assign(x, { sub: r.data.sub, desc: r.data.desc, res: r.data.res, units: stageUnits(r.data.units, cid) }); });
      indexUserCourses();
      /* النموذج أحياناً ينسى حقل المصادر بالمخطط: نطلبها بطلب مستقل صغير بدل ما نترك المسار بلا مصادر (الفشل هنا لا يوقف البناء) */
      if (!r.data.res.length && !GEN.stop) {
        GEN.phase = 'res'; paintGen();
        try {
          const v = CAT.courses[cid];
          const raw2 = await AI.ask(resPrompt(v), { json: true, signal: GEN.ctl.signal, tier: 'quick', command: 'suggest-resources', label: v.title });
          const r2 = PS.resOnly(raw2);
          if (!r2.err) { mutate(s => { const x = s.courses.find(y => y.id === cid); if (x) x.res = r2.res; }); indexUserCourses(); }
        } catch (e2) { if (e2 && e2.code === 'cancelled') GEN.stop = true; }
      }
      GEN.phase = 'lessons';
      if (onCourse(cid)) rerender();
    }
    if (!GEN.stop) await writeLessons(cid, only, regen);
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    if (code === 'cancelled') GEN.stop = true; else GEN.err = GEN.err || code;
  }
  GEN.busy = false; GEN.phase = '';
  finishBuild(cid);
}

async function writeLessons(cid, only, regen) {
  const v = CAT.courses[cid]; if (!v) return;
  const queue = v.lessons.filter(l => only ? only.includes(l.id) : !l.ok).map(l => l.id);
  GEN.total = queue.length; GEN.fin = 0;
  const worker = async () => { while (queue.length && !GEN.stop && !GEN.err) await writeOne(cid, queue.shift(), !!regen); };
  await Promise.all(Array.from({ length: Math.min(AI.concurrency(), queue.length) }, worker));
}

async function writeOne(cid, lid, regen) {
  const v = CAT.courses[cid], l = CAT.lessons[lid]; if (!v || !l) return;
  GEN.active.add(lid); paintGen(); if (cur.name === 'lesson' && cur.id === lid) rerender();
  try {
    const raw = await AI.ask(lessonPrompt(v, l, AI.lite()), { json: true, signal: GEN.ctl.signal, command: 'build-path-lesson', label: l.t });
    const r = PS.lesson(raw); if (r.err) throw { code: r.err };
    if (GEN.stop) throw { code: 'cancelled' };
    mutate(s => { const x = findStored(s, lid); if (x) { Object.assign(x, { blocks: r.blocks, cards: r.cards, refs: r.refs, min: r.min, ok: true }); delete x.err; } });
    GEN.fails = 0;
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    if (code !== 'cancelled') {
      if (l.ok) toast(AI.errText(code));                       // إعادة كتابة فاشلة: القديم يبقى كما هو
      else mutate(s => { const x = findStored(s, lid); if (x) x.err = code; });
      if (AI.FATAL.has(code)) { GEN.err = GEN.err || code; try { GEN.ctl.abort(); } catch (z) { } }   // لا فائدة من تكرار الطلب
      else if (++GEN.fails >= 3) { GEN.err = 'repeated'; try { GEN.ctl.abort(); } catch (z) { } }
    }
  } finally {
    GEN.active.delete(lid); GEN.fin++; paintGen();
    if (cur.name === 'lesson' && cur.id === lid) rerender();
  }
}

function finishBuild(cid) {
  const v = CAT.courses[cid], pend = v ? v.lessons.filter(l => !lessonReady(l)).length : 0;
  if (v && v.lessons.length && !pend && !GEN.err && !GEN.stop) {
    mutate(() => log('course', 'اكتمل بناء مسار: ' + v.title, 'course-' + cid));
    toast('اكتمل بناء «' + v.title + '».', { act: 'فتح', fn: () => go('course-' + cid) });
  } else if (GEN.stop) toast('أوقفت البناء. تكدر تكمّله بأي وقت من صفحة المسار.');
  else if (v && GEN.err) toast(AI.errText(GEN.err));
  if (onCourse(cid)) rerender();
}

/* اقتراح مصادر (كتب وفيديوهات) لمسار موجود: طلب واحد */
async function runRes(cid) {
  const c0 = S.courses.find(x => x.id === cid);
  if (GEN.busy || !c0 || !c0.units.length) return;
  Object.assign(GEN, { busy: true, cid, ctl: new AbortController(), stop: false, err: '', fails: 0, fin: 0, total: 0, phase: 'res' });
  GEN.active.clear(); paintGen();
  try {
    const v = CAT.courses[cid];
    const raw = await AI.ask(resPrompt(v), { json: true, signal: GEN.ctl.signal, tier: 'quick', command: 'suggest-resources', label: v.title });
    const r = PS.resOnly(raw); if (r.err) throw { code: r.err };
    if (GEN.stop) throw { code: 'cancelled' };
    mutate(s => { const x = s.courses.find(y => y.id === cid); if (x) x.res = r.res; });
    indexUserCourses();
    toast('جمعنا لك ' + ar(r.res.length, 'مصدراً واحداً', 'مصدرين', 'مصادر', 'مصدراً') + '. تحقق منها قبل ما تعتمد عليها.');
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    toast(code === 'cancelled' ? 'أوقفت اقتراح المصادر.' : AI.errText(code));
  }
  GEN.busy = false; GEN.phase = '';
  if (onCourse(cid)) rerender();
}
AI.hooks.add(() => { if (GEN.busy) paintGen(); });

/* ───── العرض ───── */
function paintGen() {
  const c = GEN.cid && CAT.courses[GEN.cid]; if (!c || !onCourse(c.id)) return;
  const p = $('#genp');
  if (p) {
    const f = document.activeElement, act = f && p.contains(f) && f.dataset ? f.dataset.act : '';
    p.innerHTML = genPanelInner(c);
    if (act) { const el = $(`#genp [data-act="${act}"]`); if (el) el.focus({ preventScroll: true }); }
  }
  const s = $('#cside'); if (s) s.innerHTML = courseSide(c);
  const l = $('#genl'); if (l) l.innerHTML = unitsHtml(c);
}

function genPanelInner(c) {
  const n = c.lessons.length, pend = c.lessons.filter(l => !lessonReady(l)).length, ready = n - pend, face = S.settings.mascot ? mascot('think') : '';
  if (GEN.busy && GEN.cid === c.id) {
    const act = c.lessons.filter(l => GEN.active.has(l.id)).map(l => l.t);
    const W = AI.web, load = W.loading ? `<p class="muted">نحمّل النموذج المحلي إلى المتصفح (مرة وحدة، ينحفظ بعدها): <span class="num">${Math.round((W.p || 0) * 100)}%</span></p><div class="gbar det" aria-hidden="true"><i style="width:${Math.round((W.p || 0) * 100)}%"></i></div>` : '';
    const body = GEN.phase === 'res'
      ? `<p><b>نجمع كتباً وفيديوهات تناسب المسار</b></p>${load}<div class="gbar" aria-hidden="true"><i></i></div>`
      : GEN.phase === 'outline'
      ? `<p><b>نصمّم مخطط المسار</b></p><p class="muted">نرتّب المراحل الأربع من التأسيس إلى الاحتراف ونوزّع الدروس عليها. ياخذ نحو دقيقة.</p>${load}<div class="gbar" aria-hidden="true"><i></i></div>`
      : `<p><b>كتبنا <span class="num">${num(ready)}</span> من <span class="num">${num(n)}</span> درساً</b></p>${load}${act.length ? `<p class="muted">نكتب الآن: ${act.map(esc).join('، ')}</p>` : ''}
         <ol class="gbeads" aria-hidden="true">${c.lessons.map(l => `<li class="${lessonReady(l) ? 'on' : (GEN.active.has(l.id) ? 'act' : (l.err ? 'fail' : ''))}"></li>`).join('')}</ol>`;
    return `<div class="gpanel busy">${face}<div>${body}<p class="muted small">النموذج: ${esc(AI.label())}. البناء شغّال داخل هذه الصفحة. تكدر تتنقل بين أقسام نَسَق، بس لا تسكّر التبويب لحد ما يخلص.</p>
      <div class="row"><button class="btn" data-act="gen-stop">إيقاف البناء</button></div></div></div>`;
  }
  const code = (GEN.cid === c.id && GEN.err) || (c.lessons.find(l => l.err) || {}).err || '';
  if (!n) return `<div class="gpanel">${face}<div><p><b>ما اكتمل تصميم المخطط</b></p><p class="muted">${esc(code ? AI.errText(code) : 'انقطع البناء قبل ما يخلص المخطط.')}</p>
      <div class="row"><button class="btn primary" data-act="gen-resume" data-id="${c.id}">${ic('spark')} أعد المحاولة</button></div></div></div>`;
  if (pend) return `<div class="gpanel">${face}<div><p><b>تبقّى ${ar(pend, 'درس واحد', 'درسان', 'دروس', 'درساً')} لم يُكتب</b></p>${code ? `<p class="muted">${esc(AI.errText(code))}</p>` : '<p class="muted">الدروس اللي انكتبت محفوظة. كمّل من حيث وقفت.</p>'}
      <div class="row"><button class="btn primary" data-act="gen-resume" data-id="${c.id}">${ic('spark')} كمّل كتابة الدروس</button></div></div></div>`;
  return '';
}

function forgeCard() {
  return `<section class="forge" aria-labelledby="h-forge"><div class="forge-t">${ic('spark')}<div><h2 id="h-forge">ابنِ مسارك بالذكاء الاصطناعي</h2>
    <p class="muted">اكتب اسم المسار وتفاصيلك، ونبني لك مساراً كاملاً من التأسيس إلى الاحتراف: مراحل مرتّبة، دروس، تمارين، وبطاقات مراجعة.</p></div></div>
    <button class="btn primary" data-act="gen-new">${ic('plus')} مسار جديد</button></section>`;
}

/* ───── الحوارات والأحداث ───── */
function openGenDialog() {
  const sz = Object.entries(PS.SIZES).map(([k, v]) => `<label class="seg-i"><input type="radio" name="size" value="${k}"${k === 'm' ? ' checked' : ''}><span>${v.name} · نحو ${v.n}</span></label>`).join('');
  const src = AI.source(), custom = AIC.list.length > 0;
  const who = src === 'claude' ? 'كل طلب يُحسب من استخدام حسابك في Claude.' : (src === 'custom' ? `كل طلب يُحسب عند المزوّد حسب تسعيرته${AI.local() ? ' (وعلى جهازك إن كان النموذج محلياً)' : ''}، وعدد الطلبات = عدد الدروس + 2.` : 'الطلبات تُرسل للخدمة المربوطة بنَسَق.');
  const autoName = (typeof ASSIST !== 'undefined' && ASSIST.provider) ? 'خدمة مربوطة' : (AI.sample ? 'Claude عبر المنصة' : null);
  const opts = (autoName ? [['auto', autoName]] : []).concat(AIC.list.map(m => [m.id, m.name]));
  const pickM = custom ? `<label class="fld"><span>النموذج</span><select name="ai">${opts.map(([id, n]) => `<option value="${esc(id)}"${(AI.cfg() ? AI.cfg().id : 'auto') === id ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : '';
  const liteNote = AI.lite() ? ' النموذج داخل المتصفح يكتب دروساً أقصر ويشتغل طلباً بعد طلب، فهو أبطأ.' : '';
  openDlg(`<form data-form="gen" novalidate><h3>${ic('spark')} مسار جديد بالذكاء الاصطناعي</h3>
    <p class="muted">اكتب اسم المسار وتفاصيلك، وهو يبني مساراً كاملاً من التأسيس إلى الاحتراف.</p>
    <label class="fld"><span>اسم المسار</span><input name="name" required maxlength="80" dir="auto" autocomplete="off" placeholder="مثلاً: التسويق الرقمي، البرمجة بـ Python، الخط العربي"></label>
    <label class="fld"><span>التفاصيل <small>اختياري، لكنه يحسّن النتيجة</small></span><textarea name="details" rows="4" maxlength="1200" dir="auto" placeholder="خبرتك الحالية، هدفك من المسار، وقتك، والشي اللي تريد تركّز عليه…"></textarea></label>
    <fieldset class="seg wrapseg"><legend class="sr">حجم المسار بالدروس</legend>${sz}</fieldset>
    ${pickM}
    <p class="notice">يشتغل على مرحلتين: مخطط المسار (مع كتب وفيديوهات مقترحة)، ثم كتابة كل درس بطلب منفصل، وكل درس ياخذ نحو دقيقة. ${who}${liteNote} المحتوى يولّده الذكاء الاصطناعي بدون مراجعة، فتحقق من أي معلومة مهمة.</p>
    <div class="row end"><button type="button" class="btn quiet" data-act="dlg-close">إلغاء</button><button class="btn primary" type="submit">${ic('spark')} ابنِ المسار</button></div></form>`,
    { label: 'مسار جديد بالذكاء الاصطناعي', sheet: true });
  setTimeout(() => { const i = $('form[data-form="gen"] input[name="name"]'); if (i) i.focus(); }, 40);
}
function openGenUnavailable() {
  openDlg(`<h3>${ic('spark')} بناء المسارات بالذكاء الاصطناعي</h3>
    <p class="notice">ما اكو ذكاء اصطناعي مربوط بنَسَق هنا، فما أكدر أبني المسار. تكدر تضيف نموذجاً من الإعدادات: مفتاح API، أو خادم محلي مثل Ollama، أو نموذج يشتغل داخل المتصفح. وداخل منصة عرض تدعم Claude تشتغل الميزة مباشرة.</p>
    <div class="row end"><button class="btn quiet" data-act="dlg-close">إغلاق</button><a class="btn primary" href="#prefs">${ic('sliders')} افتح الإعدادات</a></div>`, { label: 'الذكاء الاصطناعي غير متاح', cls: 'narrow' });
}
A['gen-new'] = async () => { await AI.ready; if (AI.available()) openGenDialog(); else openGenUnavailable(); };

FORMS.gen = f => {
  const fd = new FormData(f), name = PS.clean(String(fd.get('name') || ''), 80), details = PS.clean(String(fd.get('details') || ''), 1200);
  const size = PS.SIZES[fd.get('size')] ? String(fd.get('size')) : 'm';
  if (name.length < 2) { toast('اكتب اسم المسار أول.'); const i = $('input[name="name"]', f); if (i) i.focus(); return; }
  if (GEN.busy) { toast('فيه مسار قيد البناء هسه. انتظره يخلص أو أوقفه أول.'); return; }
  if (S.courses.length >= 40) { toast('وصلت الحد الأقصى (٤٠ مساراً). احذف مساراً قديماً أول.'); return; }
  const pm = String(fd.get('ai') || '');
  if (pm && pm !== (AI.cfg() ? AI.cfg().id : 'auto') && (pm === 'auto' || AIC.list.some(m => m.id === pm))) { AIC.active = pm; aiSave(); }
  if (!AI.available()) { toast(AI.errText('unavailable')); return; }
  const id = uid('ai');
  mutate(s => { s.courses.unshift({ id, user: true, title: name, sub: '', desc: '', level: 'من التأسيس إلى الاحتراف', d: PS.colorFor(id), created: now(), spec: { name, details, size }, units: [] }); log('course', 'بدأت بناء مسار: ' + name, 'course-' + id); });
  indexUserCourses(); closeDlg(); go('course-' + id); runBuild(id);
};

A['gen-resume'] = async d => {
  await AI.ready;
  if (!AI.available()) { toast(AI.errText('unavailable')); return; }
  if (GEN.busy) { toast('فيه بناء شغّال هسه. انتظره يخلص.'); return; }
  runBuild(d.id);
};
A['gen-res'] = async d => {
  await AI.ready;
  if (!AI.available()) { toast(AI.errText('unavailable')); return; }
  if (GEN.busy) { toast('فيه بناء شغّال هسه. انتظره يخلص.'); return; }
  const c = CAT.courses[d.id]; if (!c || !c.user) return;
  runRes(c.id);
};
A['gen-lesson'] = async d => {
  await AI.ready;
  if (!AI.available()) { toast(AI.errText('unavailable')); return; }
  const l = CAT.lessons[d.id]; if (!l || !l.course) return;
  if (GEN.busy) { toast('فيه بناء شغّال هسه. انتظره يخلص.'); return; }
  if (d.regen && !await confirmDlg({ title: 'نعيد كتابة الدرس؟', text: 'يتبدّل نص الدرس بنسخة جديدة. بطاقات المراجعة اللي أضفتها قبل تبقى كما هي.', ok: 'أعد الكتابة' })) return;
  runBuild(l.course, [l.id], !!d.regen);
};
A['gen-del'] = async d => {
  const c = CAT.courses[d.id]; if (!c || !c.user) return;
  if (!await confirmDlg({ title: 'حذف المسار؟', text: 'ينحذف المسار ودروسه من جهازك. البطاقات اللي أضفتها للمراجعة تبقى.', ok: 'احذف', danger: true })) return;
  if (GEN.busy && GEN.cid === c.id) genStop();
  mutate(s => {
    s.courses = s.courses.filter(x => x.id !== c.id);
    if (s.progress.lastLesson && s.progress.lastLesson.startsWith(c.id + '-')) delete s.progress.lastLesson;
    delete s.progress.last[c.id];
  });
  indexUserCourses(); toast('انحذف المسار.'); go('academy');
};
