/* ═══ المساعد المعرفي ═══
   يجيب فعلاً إذا وُجد مصدر (انظر 23-ai.js): مزوّد مسجَّل أو Claude عبر منصة العرض. وإلا يبقى نموذجاً توضيحياً صريحاً.
   للربط: NASAQ.setAssistantProvider(async ({ command, question, context, prompt }) => 'نص الجواب') */
const ASSIST = { provider: null, cmd: 'summarize' };
const CMDS = [['summarize', 'لخّص'], ['explain', 'اشرح ببساطة'], ['compare', 'قارن'], ['quiz', 'اقترح أسئلة مراجعة']];
const cmdName = k => (CMDS.find(c => c[0] === k) || CMDS[0])[1];

A.assistant = async () => {
  await AI.ready;
  const live = AI.available();
  openDlg(`<div class="a-head">${mascot('calm')}<div><h3>المساعد المعرفي</h3><p class="muted">${esc(pick(LINES.assistant, 'as'))}</p></div><button class="tbtn" data-act="dlg-close" aria-label="إغلاق">${ic('x')}</button></div>
    ${live ? `<p class="notice"><span class="chip ok">${esc(AI.label())}</span> الجواب يولّده ذكاء اصطناعي وقد يخطئ، فتحقق من المعلومات المهمة. ${AI.source() === 'claude' ? 'كل سؤال يُحسب من استخدام حسابك.' : (AI.source() === 'custom' && !AI.local() ? 'كل سؤال يُحسب عند المزوّد.' : '')}</p>` : `<p class="notice"><span class="chip sample">نموذج توضيحي</span> ما في ذكاء اصطناعي مربوط بنَسَق هنا. التنفيذ الحقيقي يحتاج ربطاً بخدمة مناسبة. اللي تشوفه هو شكل الطلب الذي سيُرسل إليها.</p>`}
    <form data-form="assist">
      <fieldset class="seg wrapseg"><legend class="sr">ماذا تريد؟</legend>${CMDS.map(c => `<label class="seg-i"><input type="radio" name="cmd" value="${c[0]}"${c[0] === ASSIST.cmd ? ' checked' : ''}><span>${c[1]}</span></label>`).join('')}</fieldset>
      <label class="fld"><span>سؤالك</span><textarea name="q" rows="3" dir="auto" placeholder="مثلاً: وضّح لي الفرق بين الارتباط والسببية" required></textarea></label>
      <details class="ctx"><summary>أدرج من مكتبتي <span class="num">(${S.notes.length})</span></summary>${S.notes.length ? `<ul>${S.notes.slice(0, 40).map(n => `<li><label><input type="checkbox" name="ctx" value="${n.id}"><span dir="auto">${esc(noteTitle(n))}</span></label></li>`).join('')}</ul>` : '<p class="muted">مكتبتك فاضية هسه. أي ملاحظة تدوّنها تكدر تدرجها هنا.</p>'}</details>
      <div class="row end"><button class="btn primary" type="submit">${ic('assistant')} ${live ? 'اسأل' : 'جهّز الطلب'}</button></div></form>
    <div id="a-out" aria-live="polite"></div>`, { label: 'المساعد المعرفي', cls: 'drawer', sheet: true });
  setTimeout(() => { const q = $('.drawer textarea[name="q"]'); if (q) q.focus(); }, 40);
};
FORMS.assist = async f => {
  const fd = new FormData(f), q = String(fd.get('q') || '').trim(), cmd = String(fd.get('cmd') || 'summarize');
  if (!q) return;
  ASSIST.cmd = cmd;
  const ctx = fd.getAll('ctx').map(id => getNote(id)).filter(Boolean).map(n => ({ title: noteTitle(n), body: n.body }));
  const prompt = `المهمة: ${cmdName(cmd)}\nالسؤال: ${q}` + (ctx.length ? '\n\nمن مكتبتي:\n' + ctx.map(c => `- ${c.title}: ${excerpt(c.body, 600)}`).join('\n') : '');
  const out = $('#a-out');
  if (AI.available()) {
    const btn = f.querySelector('button[type="submit"]'); if (btn) btn.disabled = true;
    out.innerHTML = `<p class="muted">${AI.cfg() && AI.cfg().kind === 'webllm' && !AI.web.engine ? 'نحمّل النموذج المحلي أول مرة، وقد ياخذ دقائق…' : 'لحظة…'}</p>`;
    try {
      const full = 'أنت مساعد معرفي داخل منصة تعلّم عربية اسمها نَسَق. أجب بالعربية بوضوح وإيجاز (حتى نحو 250 كلمة) بلا Markdown. إن لم تكن واثقاً فقل ذلك، ولا تخترع مصادر.\n\n' + prompt;
      const txt = await AI.ask(full, { tier: 'quick', command: cmd, payload: { command: cmd, question: q, context: ctx, prompt } });
      out.innerHTML = `<div class="a-out"><span class="chip ok">من ${esc(AI.label())}</span><div class="prose" dir="auto">${esc(String(txt)).split(/\n+/).map(p => `<p>${p}</p>`).join('')}</div></div>`;
    } catch (e) { out.innerHTML = `<p class="err" role="alert">${esc(AI.errText(e && e.code))}</p>`; }
    finally { if (btn) btn.disabled = false; }
    return;
  }
  out.innerHTML = `<div class="a-out"><span class="chip sample">نموذج توضيحي</span><p>هذا ليس جواباً ذكياً. هكذا سيبدو الطلب بعد ربط خدمة حقيقية:</p><pre dir="auto">${esc(prompt)}</pre>
    <p class="muted small">لتفعيل المساعد: اربط نَسَق بخدمة نموذج لغوي، ثم سجّل دالتها عبر <span class="ltr">NASAQ.setAssistantProvider</span>.</p></div>`;
};
