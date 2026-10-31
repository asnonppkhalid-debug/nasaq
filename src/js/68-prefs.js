/* ═══ الإعدادات والنسخ الاحتياطي ═══ */
const BK = { pending: null };
const markBackup = () => { S.backup.last = now(); S.backup.changes = 0; flush(); };

V.prefs = {
  html() {
    const th = S.settings.theme, sw = (name, on, label, hint) => `<label class="sw"><input type="checkbox" data-change="${name}"${on ? ' checked' : ''}><span class="sw-t"><b>${label}</b><small class="muted">${hint}</small></span></label>`;
    return phead('الإعدادات', 'المظهر وبياناتك', 'كل شي هنا يخصّك وحدك، وينحفظ في هذا المتصفح.')
      + `<div class="prefs">
      <section><h2>المظهر</h2><div class="seg" role="radiogroup" aria-label="المظهر">${[['system', 'حسب الجهاز'], ['light', 'فاتح'], ['dark', 'داكن']].map(([k, n]) => `<label class="seg-i"><input type="radio" name="theme" data-change="theme" value="${k}"${th === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>
        ${sw('mascot', S.settings.mascot, 'إظهار خريزة', 'الشخصية المرافقة تظهر في الحالات الفارغة والإنجازات فقط.')}
        ${sw('sample', S.settings.sample, 'إظهار المحتوى التجريبي', 'مسارات وموضوعات جاهزة للتجربة، موسومة بـ «تجريبي». لا تتأثر بياناتك إذا أطفأته.')}</section>
      ${aiSection()}
      <section><h2>بياناتك</h2>
        <p class="${storageOK ? 'muted' : 'err'}">${storageOK ? 'تنحفظ بياناتك في متصفحك على هذا الجهاز فقط. لا تُرسل لأي مكان إلا نصوص الطلبات اللي ترسلها بنفسك للنموذج الذي اخترته. إذا مسحت بيانات المتصفح أو غيّرت الجهاز تضيع، فخذ نسخة احتياطية بين فترة وفترة.' : 'المتصفح هنا لا يسمح بالحفظ، فلن تبقى بياناتك بعد إغلاق الصفحة. خذ نسخة احتياطية الآن.'}</p>
        <p class="muted">${S.backup.last ? 'آخر نسخة احتياطية: ' + rel(S.backup.last) : 'ما أخذت نسخة احتياطية بعد'}${S.backup.changes ? ` · <span class="num">${S.backup.changes}</span> تغيير بعدها` : ''}.</p>
        <div class="row"><button class="btn primary" data-act="bk-copy">${ic('copy')} انسخ النسخة الاحتياطية</button><button class="btn" data-act="bk-dl">${ic('upload')} نزّل ملف</button></div>
        <details class="ctx"><summary>عرض نص النسخة</summary><textarea id="bk-out" class="mono" rows="5" readonly dir="ltr" aria-label="نص النسخة الاحتياطية">${esc(exportJSON())}</textarea></details>
        <h3>استرجاع نسخة</h3>
        <label class="fld"><span>اختر ملف النسخة</span><input type="file" accept=".json,application/json" data-change="bkfile"></label>
        <label class="fld"><span>أو الصق نصها هنا</span><textarea id="bk-in" class="mono" rows="4" dir="ltr" placeholder='{"app":"nasaq", …}'></textarea></label>
        <div class="row"><button class="btn" data-act="bk-check">فحص النسخة</button></div><div id="bk-res" aria-live="polite"></div></section>
      <section><h2>إعادة الضبط</h2><p class="muted">يمسح ملاحظاتك وبطاقاتك وتقدمك وروابطك ومساراتك، وإعدادات نماذج الذكاء الاصطناعي ومفاتيحها، من هذا المتصفح.</p><button class="btn danger-q" data-act="reset">${ic('trash')} امسح كل بياناتي</button></section></div>`;
  }
};
ON.theme = t => { mutate(s => { s.settings.theme = t.value; }); applyTheme(); };
ON.mascot = t => { mutate(s => { s.settings.mascot = t.checked; }); };
ON.sample = t => { mutate(s => { s.settings.sample = t.checked; }); toast(t.checked ? 'انفتح المحتوى التجريبي.' : 'انطفى المحتوى التجريبي.'); };
ON.bkfile = t => {
  const f = t.files && t.files[0]; if (!f) return;
  if (f.size > 8e6) { toast('الملف كبير أكثر من اللازم.'); return; }
  const r = new FileReader(); r.onload = () => { $('#bk-in').value = String(r.result); A['bk-check'](); }; r.readAsText(f);
};
A['bk-copy'] = async () => {
  try { await navigator.clipboard.writeText(exportJSON()); toast('اننسخت. الصقها بملف نصي واحفظه عندك.'); }
  catch (e) { const ta = $('#bk-out'); if (ta) { ta.closest('details').open = true; ta.focus(); ta.select(); } toast('حدّدنا النص لك. انسخه بـ Ctrl+C.'); }
  markBackup();
};
/* داخل عارض المنصة التنزيل المباشر ممنوع، فنستعمل قدرة downloads (تطلب موافقة المستخدم).
   خارجها (الملف المستقل) نرجع للرابط العادي. */
let DL = null;
try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(x => { DL = x || null; }, () => { }); } catch (e) { }
A['bk-dl'] = async () => {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const name = `nasaq-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`, data = exportJSON();
  if (DL) {
    try { await DL.save({ filename: name, data }); markBackup(); toast('انحفظت النسخة الاحتياطية.'); }
    catch (e) { if (!e || e.code !== 'declined') toast('تعذّر التنزيل هنا. استخدم زر النسخ.'); }
    return;
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    markBackup(); toast('جرّبنا ننزّل الملف. إذا ما نزل هنا، استخدم زر النسخ.');
  } catch (e) { toast('التنزيل غير متاح هنا. استخدم زر النسخ.'); }
};
A['bk-check'] = () => {
  const txt = $('#bk-in').value.trim(), box = $('#bk-res');
  if (!txt) { box.innerHTML = '<p class="muted">الصق النسخة أو اختر ملفاً أول.</p>'; return; }
  const r = parseBackup(txt);
  if (r.err) { box.innerHTML = `<p class="err" role="alert">${esc(r.err)}</p>`; BK.pending = null; return; }
  BK.pending = r.data; const c = r.counts;
  box.innerHTML = `<p>لقيت <b class="num">${c.notes}</b> عنصراً، و<b class="num">${c.cards}</b> بطاقة، و<b class="num">${c.links}</b> رابطاً، ${c.courses ? `و<b class="num">${c.courses}</b> مساراً مبنياً بالذكاء الاصطناعي، ` : ''}و<b class="num">${c.lessons}</b> درساً مكتملاً.</p>
    <div class="row"><button class="btn primary" data-act="bk-merge">دمجها مع بياناتي</button><button class="btn danger-q" data-act="bk-replace">استبدل بياناتي بها</button></div>`;
};
A['bk-merge'] = () => { if (!BK.pending) return; applyBackup(BK.pending, 'merge'); BK.pending = null; toast('انّدمجت النسخة مع بياناتك.'); rerender(); };
A['bk-replace'] = async () => {
  if (!BK.pending) return;
  if (!await confirmDlg({ title: 'استبدال كل بياناتك؟', text: 'راح تنمسح بياناتك الحالية وتحل مكانها النسخة.', ok: 'استبدل', danger: true })) return;
  applyBackup(BK.pending, 'replace'); BK.pending = null; applyTheme(); toast('انسترجعت النسخة.'); go('home');
};
A.reset = async () => {
  if (!await confirmDlg({ title: 'مسح كل البيانات؟', text: 'ما تقدر ترجعها إلا من نسخة احتياطية.', ok: 'امسح كل شي', danger: true })) return;
  if (typeof genStop === 'function') genStop(); aiWipe(); S = blankState(); indexUserCourses(); flush(); applyTheme(); REV.active = false; toast('انمسحت البيانات.'); go('home');
};
