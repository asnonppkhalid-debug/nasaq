/* ═══ إعدادات: نماذج الذكاء الاصطناعي ═══
   يضيف المستخدم نموذجاً بمفتاح API (OpenAI-compatible، Anthropic، Gemini) أو خادماً محلياً (Ollama، LM Studio) أو نموذجاً داخل المتصفح (WebGPU).
   الإعدادات والمفاتيح في مخزن مستقل (انظر 23-ai.js) ولا تدخل النسخ الاحتياطي. */
const presetById = id => AI.PRESETS.find(p => p.id === id) || AI.PRESETS[0];
const presetOf = m => m.kind === 'webllm' ? 'webllm' : ((AI.PRESETS.find(p => p.kind === m.kind && p.base && p.base.replace(/\/+$/, '') === m.base) || {}).id || (m.kind === 'openai' ? 'custom' : m.kind));
const hostOf = u => { try { return new URL(u).host; } catch (e) { return u; } };

function aiSection() {
  const act = AI.cfg(), auto = (typeof ASSIST !== 'undefined' && ASSIST.provider) ? 'خدمة مربوطة' : (AI.sample ? 'Claude عبر المنصة' : null);
  const rows = AIC.list.map(m => `<li class="aim"><label class="aim-r"><input type="radio" name="aimodel" data-change="aimodel" value="${esc(m.id)}"${act && act.id === m.id ? ' checked' : ''}>
      <span class="aim-t"><b dir="auto">${esc(m.name)}</b><small class="muted" dir="auto">${esc(AIKINDS[m.kind])} · <span dir="ltr">${esc(m.model)}</span>${m.kind === 'webllm' ? '' : ' · <span dir="ltr">' + esc(hostOf(m.base)) + '</span> · ' + esc(aiMask(m.key))}</small></span></label>
      <div class="row"><button class="btn sm" data-act="ai-edit" data-id="${esc(m.id)}">${ic('edit')} تعديل</button><button class="btn sm quiet" data-act="ai-del" data-id="${esc(m.id)}" aria-label="حذف ${esc(m.name)}">${ic('trash')} حذف</button></div></li>`).join('');
  return `<section id="ai-models"><h2>نماذج الذكاء الاصطناعي</h2>
    <p class="muted">المستخدم الآن: <b>${esc(AI.label())}</b>. يبني نَسَق المسارات ويجيب المساعد بالنموذج اللي تختاره هنا. تكدر تضيف نموذجاً بمفتاح API، أو خادماً يشتغل على جهازك، أو نموذجاً يشتغل داخل المتصفح.</p>
    ${IN_VIEWER ? `<p class="notice"><b>تنبيه:</b> أنت تفتح نَسَق داخل منصة عرض تحجب الاتصال بأي موقع خارجها، فالنماذج المضافة هنا (API أو محلية) <b>ما راح تتصل</b>. هذا القسم يشتغل لما تفتح نَسَق كملف مستقل أو على استضافتك. داخل المنصة يشتغل Claude تلقائياً بدون مفتاح.</p>` : ''}
    <ul class="aim-list" role="radiogroup" aria-label="النموذج المستخدم">
      <li class="aim"><label class="aim-r"><input type="radio" name="aimodel" data-change="aimodel" value="auto"${!act ? ' checked' : ''}><span class="aim-t"><b>تلقائي</b><small class="muted">${auto ? 'يستخدم: ' + esc(auto) : 'ما اكو مصدر متاح حالياً. أضف نموذجاً.'}</small></span></label></li>
      ${rows}</ul>
    <div class="row"><button class="btn primary" data-act="ai-add"${AIC.list.length >= 8 ? ' disabled' : ''}>${ic('plus')} أضف نموذجاً</button></div>
    <p class="muted small">المفاتيح تنحفظ نصاً عادياً في هذا المتصفح فقط، ولا تدخل النسخة الاحتياطية، ولا تُرسل إلا للعنوان اللي تحدده. لا تضيفها على جهاز مشترك، واستعمل مفتاحاً بحد صرف أو صلاحيات محدودة. التكلفة تُحسب عند المزوّد حسب تسعيرته، وبعضهم يقدّم أسعاراً منخفضة أو مستوى مجانياً، فراجع صفحة الأسعار عندهم.</p></section>`;
}

ON.aimodel = t => {
  AIC.active = t.value === 'auto' || AIC.list.some(m => m.id === t.value) ? t.value : 'auto'; aiSave();
  toast(AIC.active === 'auto' ? 'رجعنا للمصدر التلقائي.' : 'صار المستخدم: ' + AI.cfg().name);
  const p = $('#ai-models > p.muted'); if (p) p.innerHTML = `المستخدم الآن: <b>${esc(AI.label())}</b>. يبني نَسَق المسارات ويجيب المساعد بالنموذج اللي تختاره هنا. تكدر تضيف نموذجاً بمفتاح API، أو خادماً يشتغل على جهازك، أو نموذجاً يشتغل داخل المتصفح.`;
};

/* ───── نافذة الإضافة والتعديل ───── */
function openAiDialog(id) {
  const m = id ? AIC.list.find(x => x.id === id) : null, pid = m ? presetOf(m) : 'openrouter';
  openDlg(`<form data-form="aimodel" data-id="${m ? esc(m.id) : ''}" novalidate>
    <h3>${ic('spark')} ${m ? 'تعديل نموذج' : 'إضافة نموذج ذكاء اصطناعي'}</h3>
    <label class="fld"><span>المزوّد</span><select name="preset" data-change="aipreset">${AI.PRESETS.map(p => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <p class="muted small" id="ai-hint"></p>
    <label class="fld f-base"><span>عنوان الخدمة</span><input name="base" dir="ltr" inputmode="url" autocapitalize="off" spellcheck="false" autocomplete="off" value="${m ? esc(m.base) : ''}" placeholder="https://…/v1"></label>
    <label class="fld f-model"><span>اسم النموذج</span><input name="model" list="ai-dl" dir="ltr" autocapitalize="off" spellcheck="false" autocomplete="off" value="${m && m.kind !== 'webllm' ? esc(m.model) : ''}" placeholder="كما يظهر عند المزوّد"><datalist id="ai-dl"></datalist></label>
    <div class="row f-list"><button type="button" class="btn sm" data-act="ai-list">${ic('list')} اجلب النماذج المتاحة</button><small class="muted" id="ai-list-res" aria-live="polite"></small></div>
    <label class="fld f-web"><span>النموذج</span><select name="webmodel">${AI.WEB.map(([wid, n, gb]) => `<option value="${wid}"${m && m.model === wid ? ' selected' : ''}>${esc(n)} · نحو ${gb} GB</option>`).join('')}</select></label>
    <label class="fld f-key"><span>مفتاح API <small id="ai-keyreq"></small></span><input name="key" type="password" dir="ltr" autocomplete="new-password" autocapitalize="off" spellcheck="false" placeholder="${m && m.key ? 'اتركه فارغاً ليبقى المفتاح الحالي (' + esc(aiMask(m.key)) + ')' : ''}"></label>
    <label class="fld"><span>اسم للعرض <small>اختياري</small></span><input name="name" maxlength="60" dir="auto" autocomplete="off" value="${m ? esc(m.name) : ''}"></label>
    <details class="ctx"><summary>خيارات متقدمة</summary><label class="fld"><span>الحد الأقصى للرموز بكل رد <small>اختياري. ارفعه إذا الدروس تنقطع</small></span><input name="max" type="number" min="256" max="64000" step="1" inputmode="numeric" dir="ltr" value="${m && m.max ? m.max : ''}"></label></details>
    <div id="ai-test-res" aria-live="polite"></div>
    <div class="row end"><button type="button" class="btn quiet" data-act="dlg-close">إلغاء</button><button type="button" class="btn" data-act="ai-test">جرّب الاتصال</button><button class="btn primary" type="submit">${m ? 'احفظ التعديل' : 'احفظ واستخدمه'}</button></div></form>`,
    { label: m ? 'تعديل نموذج' : 'إضافة نموذج', sheet: true });
  const f = $('form[data-form="aimodel"]'); if (f) syncAiForm(f, true);
}
function syncAiForm(f, init) {
  const pr = presetById(f.elements.preset.value), web = pr.kind === 'webllm', show = (c, on) => { const e = $(c, f); if (e) e.hidden = !on; };
  show('.f-base', !web); show('.f-model', !web); show('.f-list', !web); show('.f-web', web); show('.f-key', !web && pr.key !== 'none');
  const keyReq = $('#ai-keyreq', f); if (keyReq) keyReq.textContent = pr.key === 'req' ? 'مطلوب' : 'اختياري';
  if (!init && !web) f.elements.base.value = pr.base || '';
  if (init && !f.dataset.id && !web && !f.elements.base.value) f.elements.base.value = pr.base || '';
  const warn = web && !navigator.gpu ? ' ⚠ متصفحك الحالي ما يدعم WebGPU، فما راح يشتغل هذا الخيار هنا.' : '';
  if (f.elements.model && !web) f.elements.model.placeholder = pr.ph || 'كما يظهر عند المزوّد'; const dl = $('#ai-dl', f); if (dl && !init) dl.innerHTML = '';
  const h = $('#ai-hint', f); if (h) h.textContent = (pr.hint || '') + warn;
}
ON.aipreset = t => syncAiForm(t.form, false);

/* يقرأ حقول النموذج ويرجع { cfg } أو { err } */
function aiFormCfg(f, ex) {
  const fd = new FormData(f), pr = presetById(fd.get('preset')), web = pr.kind === 'webllm';
  let key = web ? '' : String(fd.get('key') || '').replace(/\s+/g, '');
  const model = web ? String(fd.get('webmodel') || '') : String(fd.get('model') || '').trim().replace(/\s+/g, '');
  const base = web ? '' : String(fd.get('base') || '').trim();
  if (!web) {
    if (!base) return { err: 'اكتب عنوان الخدمة.', f: 'base' };
    let u; try { u = new URL(base); if (!/^https?:$/.test(u.protocol)) throw 0; } catch (e) { return { err: 'عنوان الخدمة غير صالح. لازم يبدأ بـ http أو https.', f: 'base' }; }
    if (location.protocol === 'https:' && u.protocol === 'http:' && !isLocalHost(u.hostname)) return { err: 'المتصفح يمنع الاتصال بعنوان http من صفحة https. استخدم عنوان https.', f: 'base' };
    if (!key && ex && ex.kind === pr.kind && ex.base === u.href.replace(/\/+$/, '')) key = ex.key;   // نبقي المفتاح القديم فقط إذا بقي العنوان نفسه
  }
  if (!model) return { err: web ? 'اختر نموذجاً.' : 'اكتب اسم النموذج. إذا ما تعرفه اضغط «اجلب النماذج المتاحة».', f: 'model' };
  if (pr.key === 'req' && !key) return { err: 'هذا المزوّد يحتاج مفتاح API. الصقه بخانة المفتاح.', f: 'key' };
  const wl = web ? AI.WEB.find(x => x[0] === model) : null;
  const name = PS.clean(fd.get('name'), 60) || (web ? 'داخل المتصفح · ' + (wl ? wl[1] : model) : (pr.id === 'custom' ? hostOf(base) : pr.name) + ' · ' + model);
  const cfg = aiNorm({ id: ex ? ex.id : uid('m'), kind: pr.kind, base, model, key, name, max: fd.get('max') });
  return cfg ? { cfg } : { err: 'بيانات النموذج غير صالحة. راجع العنوان والاسم.' };
}

function aiShowErr(f, r) {
  const box = $('#ai-test-res'); if (box) box.innerHTML = `<p class="err" role="alert">${esc(r.err)}</p>`;
  const el = r.f && f.elements[r.f]; if (el) { try { el.focus(); el.setAttribute('aria-invalid', 'true'); el.addEventListener('input', () => el.removeAttribute('aria-invalid'), { once: true }); } catch (e) { } }
}
A['ai-add'] = () => { if (AIC.list.length >= 8) { toast('وصلت الحد الأقصى (٨ نماذج). احذف نموذجاً قديماً.'); return; } openAiDialog(''); };
A['ai-edit'] = d => openAiDialog(d.id);
A['ai-del'] = async d => {
  const m = AIC.list.find(x => x.id === d.id); if (!m) return;
  if (!await confirmDlg({ title: 'حذف النموذج؟', text: `ينحذف «${m.name}» ومفتاحه من هذا المتصفح. ما يتأثر شي ثاني.`, ok: 'احذف', danger: true })) return;
  AIC.list = AIC.list.filter(x => x.id !== m.id); if (AIC.active === m.id) AIC.active = 'auto';
  aiSave(); toast('انحذف النموذج.'); rerender();
};
FORMS.aimodel = f => {
  const ex = f.dataset.id ? AIC.list.find(x => x.id === f.dataset.id) : null;
  const r = aiFormCfg(f, ex); if (r.err) { aiShowErr(f, r); return; }
  if (!ex && AIC.list.length >= 8) { toast('وصلت الحد الأقصى (٨ نماذج).'); return; }
  if (ex) AIC.list = AIC.list.map(x => x.id === ex.id ? r.cfg : x); else { AIC.list.push(r.cfg); AIC.active = r.cfg.id; }
  const saved = aiSave();
  closeDlg(); toast(saved ? (ex ? 'انحفظ التعديل.' : 'انضاف النموذج وصار هو المستخدم. جرّب بناء مسار.') : 'انضاف للجلسة الحالية بس، لأن المتصفح ما يسمح بالحفظ.'); rerender();
};
A['ai-test'] = async (d, btn) => {
  const f = btn.closest('form'), ex = f.dataset.id ? AIC.list.find(x => x.id === f.dataset.id) : null, box = $('#ai-test-res');
  const r = aiFormCfg(f, ex); if (r.err) { aiShowErr(f, r); return; }
  const web = r.cfg.kind === 'webllm'; btn.disabled = true;
  box.innerHTML = `<p class="muted">${web ? 'نحمّل النموذج ونجرّبه. أول مرة ياخذ دقائق حسب حجمه وسرعة النت.' : 'نجرّب الاتصال…'}</p>${web ? '<div class="gbar det" aria-hidden="true"><i style="width:0"></i></div><p class="muted small" id="ai-load"></p>' : ''}`;
  const hook = () => { const b = $('#ai-test-res .gbar i'), t = $('#ai-load'); if (b) b.style.width = Math.round(AI.web.p * 100) + '%'; if (t) t.textContent = AI.web.text; };
  if (web) AI.hooks.add(hook);
  try {
    const t = await AI.test(r.cfg), b = $('#ai-test-res');
    if (b) b.innerHTML = `<p><span class="chip ok">${ic('check')} اشتغل</span> رد النموذج: <span dir="auto">${esc(excerpt(t, 80))}</span></p>`;
  } catch (e) {
    const b = $('#ai-test-res'), code = (e && e.code) || 'upstream_error';
    if (b) b.innerHTML = `<p class="err" role="alert">${esc(AI.errText(code))}</p>${e && e.detail ? `<p class="muted small" dir="auto">رد الخادم${e.status ? ' (' + e.status + ')' : ''}: ${esc(e.detail)}</p>` : ''}`;
  } finally { AI.hooks.delete(hook); btn.disabled = false; }
};

/* يجلب قائمة النماذج من المزوّد حتى ما تكتب الاسم يدوياً (ويتفادى أخطاء «النموذج غير موجود») */
A['ai-list'] = async (d, btn) => {
  const f = btn.closest('form'), ex = f.dataset.id ? AIC.list.find(x => x.id === f.dataset.id) : null, out = $('#ai-list-res'), dl = $('#ai-dl');
  const fd = new FormData(f), pr = presetById(fd.get('preset')), base = String(fd.get('base') || '').trim();
  const r = aiFormCfg(f, ex);
  if (r.err && r.f !== 'model') { aiShowErr(f, r); return; }
  const key = String(fd.get('key') || '').replace(/\s+/g, '') || (ex && ex.kind === pr.kind && ex.base === base.replace(/\/+$/, '') ? ex.key : '');
  if (pr.key === 'req' && !key) { aiShowErr(f, { err: 'الصق مفتاح API أول، حتى نجلب القائمة.', f: 'key' }); return; }
  btn.disabled = true; out.textContent = 'نجلب القائمة…';
  try {
    const ids = await AI.listModels({ kind: pr.kind, base: base.replace(/\/+$/, ''), key });
    if (dl) dl.innerHTML = ids.map(i => `<option value="${esc(i)}"></option>`).join('');
    out.textContent = ids.length ? 'لقينا ' + ids.length + ' نموذجاً. اضغط خانة «اسم النموذج» واختر منها.' : 'ما رجع المزوّد أي نموذج. اكتب الاسم يدوياً.';
    if (ids.length) { f.elements.model.focus(); f.elements.model.value = ''; }
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    out.textContent = AI.errText(code) + (e && e.status ? ' (' + e.status + ')' : '');
  } finally { btn.disabled = false; }
};
