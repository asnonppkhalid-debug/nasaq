# اختبار بناء المسارات بالذكاء الاصطناعي بمزوّد sample وهمي: python3 tests/aigen.py
import json, re, sys
from playwright.sync_api import sync_playwright
SKEL = open('dist/index.html', encoding='utf-8').read()
open('dist/test-page.html', 'w', encoding='utf-8').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}</style></head><body>' + SKEL + '</body></html>')
URL = 'file:///home/claude/nasaq/dist/test-page.html'
MOCK = r"""
window.__cfg = { delay: 25, fail: null, fatal: null, n: 8 };
window.__log = { calls: [], cur: 0, maxc: 0, aborted: 0 };
const words = n => Array(n).fill('كلمة').join(' ');
const titleOf = p => (p.match(/الدرس \d+ من \d+: «(.+?)»/) || [])[1];
function outline() {
  const per = Math.round(window.__cfg.n / 4), units = []; let k = 0;
  ['التأسيس', 'البناء', 'التعمّق', 'الاحتراف'].forEach(t => { const ls = []; for (let i = 0; i < per; i++) { k++; ls.push({ t: k === 2 ? 'L2 <b onclick="window.__xss=1">x</b>' : 'L' + k, brief: 'ملخص الدرس ' + k, min: 6 }); } units.push({ t, goal: 'هدف ' + t, lessons: ls }); });
  const o = { sub: 'سطر فرعي', desc: 'وصف المسار', units };
  if (!window.__cfg.noRes) o.res = resJ();
  return o;
}
const resJ = () => [{ k: 'book', t: 'كتاب <img src=x onerror="window.__xss=1"> أ', by: 'مؤلف أ', why: 'يشرح الأساس' }, { k: 'video', t: 'سلسلة فيديو ب', by: 'قناة ب', why: 'شرح مصوّر', url: 'https://evil.example/x' }, { k: 'course', t: 'دورة ج', by: 'منصة', why: 'تطبيق' }, { k: 'site', t: 'توثيق د', by: '', why: '' }];
const lessonJ = () => ({ blocks: [['p', words(90)], ['h', 'قسم <script>window.__xss=1</script>'], ['p', words(90)], ['note', 'فكرة **مهمة** [[forgetting-curve|رابط]]'], ['ul', ['أ', 'ب']], ['code', 'def f():\n    return 1  # ' + 'x'.repeat(220)], ['h', 'تمرين'], ['p', words(60)]], cards: [['س1', 'ج1'], ['س2', 'ج2']], refs: window.__cfg.noRes ? [] : [{ k: 'book', t: 'مرجع الدرس', by: 'مؤلف' }, { k: 'video', t: 'شرح الدرس المصوّر', by: 'قناة' }] });
async function sample(input, opts = {}) {
  const L = window.__log, c = window.__cfg, p = String(input);
  L.cur++; L.maxc = Math.max(L.maxc, L.cur);
  try {
    await new Promise((res, rej) => {
      const t = setTimeout(res, c.delay);
      if (opts.signal) opts.signal.addEventListener('abort', () => { clearTimeout(t); L.aborted++; rej({ code: 'cancelled', message: 'x' }); });
    });
    const isOutline = p.includes('صمّم مخطط'), isLesson = p.includes('اكتب نص درس'), isRes = p.includes('اقترح مصادر إضافية'), t = titleOf(p);
    L.calls.push(isOutline ? 'outline' : (isLesson ? 'lesson:' + t : (isRes ? 'res' : 'other')));
    if (isRes && c.resFail) { c.resFail--; throw { code: 'upstream_error', message: 'x' }; }
    if (c.fatal && t && t.startsWith(c.fatal.title)) throw { code: c.fatal.code, message: 'x' };
    if (c.fail && t && t.startsWith(c.fail.title) && c.fail.times > 0) { c.fail.times--; throw { code: c.fail.code, message: 'x' }; }
    if (c.outlineFail) { c.outlineFail--; throw { code: 'upstream_error', message: 'x' }; }
    if (isOutline) return { text: JSON.stringify(outline()), truncated: false };
    if (isLesson) return { text: JSON.stringify(lessonJ()), truncated: false };
    if (isRes) return { text: JSON.stringify({ res: resJ() }), truncated: false };
    return { text: 'جواب تجريبي من المساعد.\nسطر ثاني.', truncated: false };
  } finally { L.cur--; }
}
sample.json = async (i, o) => JSON.parse((await sample(i, o)).text);
window.claude = { use: async n => n === 'sample' ? sample : null };
"""
problems = []
def check(c, m):
    if not c: problems.append(m); print('  ✗', m)
    else: print('  ✓', m)
def state(pg): return pg.evaluate("JSON.parse(localStorage.getItem('nasaq:v1')||'{}')")
def settle(pg, ms=450): pg.wait_for_timeout(ms)   # الحفظ مؤجّل 250ms
def make(b, w=390, h=900, mock=True, init=None):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ')
    if mock: ctx.add_init_script(MOCK)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300); return ctx, pg, errs
def new_path(pg, name='تعلّم <img src=x onerror="window.__xss=1"> الذاكرة', details='مبتدئ، 3 ساعات بالأسبوع'):
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150)
    pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]')
    pg.fill('form[data-form="gen"] input[name=name]', name); pg.fill('form[data-form="gen"] textarea[name=details]', details)
    pg.click('form[data-form="gen"] button[type=submit]'); pg.wait_for_timeout(100)

with sync_playwright() as p:
    b = p.chromium.launch()

    print('— 1) المسار الكامل (نجاح)')
    ctx, pg, errs = make(b)
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150)
    check(pg.locator('.forge').count() == 1 and 'ابنِ مسارك' in pg.inner_text('.forge'), 'بطاقة الزر ظاهرة بالأكاديمية')
    pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]')
    pg.click('form[data-form="gen"] button[type=submit]'); pg.wait_for_timeout(100)
    check(state(pg).get('courses', []) == [] and pg.locator('form[data-form="gen"]').count() == 1, 'اسم فارغ: لا يُنشأ مسار والنموذج يبقى')
    pg.fill('form[data-form="gen"] input[name=name]', 'تعلّم <img src=x onerror="window.__xss=1"> الذاكرة'); pg.fill('form[data-form="gen"] textarea[name=details]', 'مبتدئ، 3 ساعات بالأسبوع')
    pg.evaluate("window.__cfg.delay = 250"); pg.click('form[data-form="gen"] button[type=submit]'); pg.wait_for_timeout(80)
    check(pg.url.split('#')[-1].startswith('course-ai-'), 'ينتقل لصفحة المسار')
    check('نصمّم مخطط' in pg.inner_text('#genp'), 'لوحة «نصمّم المخطط» تظهر أثناء المخطط')
    pg.wait_for_function("document.querySelector('#genp') && !document.querySelector('#genp').innerText.includes('نصمّم')", timeout=5000); pg.evaluate("window.__cfg.delay = 25")
    pg.wait_for_function("document.querySelectorAll('#genl .rail li').length === 8", timeout=5000)
    check(pg.locator('#genl .unit-h').count() == 4 and [t for t in pg.eval_on_selector_all('#genl .unit-h', 'e=>e.map(x=>x.textContent)')] == ['التأسيس', 'البناء', 'التعمّق', 'الاحتراف'], 'أربع مراحل بالترتيب')
    pg.wait_for_function("!document.querySelector('#genp').innerText.trim()", timeout=15000); pg.wait_for_timeout(200)
    L = pg.evaluate("window.__log"); check(L['calls'][0] == 'outline' and len([c for c in L['calls'] if c.startswith('lesson:')]) == 8, 'طلب مخطط + ٨ دروس = ' + str(len(L['calls'])))
    check(L['maxc'] == 2, 'التوازي بالضبط عاملان (maxc=%s)' % L['maxc'])
    check(pg.locator('#genl .rail li.pend, #genl .rail li.fail, #genl .rail li.act').count() == 0, 'كل الدروس جاهزة')
    check('اكتمل بناء' in pg.inner_text('#toasts'), 'إشعار الاكتمال')
    check(pg.evaluate("window.__xss") is None, 'لا تنفيذ HTML (عنوان المسار والدرس)')
    check('<img' in pg.inner_text('h1'), 'الحقن يظهر نصاً محايداً بالعنوان')
    check(pg.locator('.chip.ai').count() >= 1 and 'لم يراجعه محرر' in pg.inner_text('.notice'), 'وسم الذكاء الاصطناعي + تنبيه عدم المراجعة')
    settle(pg); st = state(pg); c0 = st['courses'][0]
    check(len(c0['units']) == 4 and all(l['ok'] for u in c0['units'] for l in u['lessons']) and c0['spec']['size'] == 'm', 'الحالة المحفوظة سليمة')
    check(len(json.dumps(c0)) < 60000, 'حجم المسار المخزَّن معقول (%d)' % len(json.dumps(c0)))
    # الدرس
    pg.click('#cside a.btn'); pg.wait_for_timeout(200)
    check(pg.locator('pre.code').count() == 1 and pg.locator('.prose .callout').count() == 1 and pg.locator('.prose a.xref').count() == 0, 'درس: كتلة شيفرة + فكرة + لا رابط داخلي من AI')
    check(pg.evaluate("document.querySelector('pre.code').scrollWidth > document.querySelector('pre.code').clientWidth") and pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), 'الشيفرة الطويلة تتمرّر داخلها دون تمرير أفقي للصفحة')
    pg.screenshot(path='dist/ai-lesson-phone.png', full_page=True)
    pg.click('[data-act="lesson-done"]'); pg.wait_for_timeout(100)
    pg.click('[data-act="lesson-card"][data-k="0"]'); pg.wait_for_timeout(100); settle(pg)
    st = state(pg); check(len(st['cards']) == 1 and list(st['progress']['done']) and st['progress']['done'], 'إكمال درس + بطاقة')
    pg.evaluate("location.hash='home'"); pg.wait_for_timeout(200)
    check('متابعة المسار' in pg.inner_text('#view') and 'ذكاء اصطناعي' in pg.inner_text('.cont'), 'الرئيسية: متابعة المسار المولَّد')
    pg.evaluate("location.hash='progress'"); pg.wait_for_timeout(200)
    check('1' in pg.inner_text('.ledger') and pg.locator('.plist a[href^="#course-ai-"]').count() == 1, 'التقدّم يعدّ المسار')
    # بحث
    pg.click('[data-act="search"]'); pg.wait_for_timeout(100); pg.fill('#gq', 'كلمة'); pg.wait_for_timeout(150)
    check(pg.locator('.gres .srow').count() >= 1, 'البحث يجد دروس المسار المولَّد')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
    # مساعد
    pg.click('[data-act="assistant"]'); pg.wait_for_selector('form[data-form="assist"]')
    pg.fill('form[data-form="assist"] textarea[name=q]', 'ما هو الارتباط؟'); pg.click('form[data-form="assist"] button[type=submit]'); pg.wait_for_timeout(300)
    check('Claude عبر المنصة' in pg.inner_text('#a-out') and 'جواب تجريبي' in pg.inner_text('#a-out'), 'المساعد يجيب فعلاً عبر sample')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    # نسخة احتياطية
    pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(150); exp = pg.input_value('#bk-out')
    check(len(json.loads(exp)['data']['courses']) == 1, 'التصدير يحوي المسار')
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300); pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(150)
    pg.fill('#bk-in', exp); pg.click('[data-act="bk-check"]'); pg.wait_for_timeout(80)
    check('مساراً مبنياً بالذكاء الاصطناعي' in pg.inner_text('#bk-res'), 'فحص النسخة يعرض عدد المسارات')
    pg.click('[data-act="bk-replace"]') if pg.locator('[data-act="bk-replace"]').count() else pg.click('[data-act="bk-merge"]'); pg.wait_for_timeout(300)
    if pg.locator('dialog[open] [data-act="dlg-yes"]').count(): pg.click('dialog[open] [data-act="dlg-yes"]'); pg.wait_for_timeout(200)
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(200)
    check(pg.locator('.crow .chip.ai').count() == 1, 'الاستيراد يعيد المسار')
    # حذف
    pg.click('.crow h2 a'); pg.wait_for_timeout(150); pg.click('[data-act="gen-del"]'); pg.wait_for_selector('[data-act="dlg-yes"]'); pg.click('[data-act="dlg-yes"]'); pg.wait_for_timeout(250); settle(pg)
    check(pg.url.endswith('#academy') and state(pg)['courses'] == [] and pg.locator('.crow .chip.ai').count() == 0, 'الحذف يزيل المسار ويرجع للأكاديمية')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 2) فشل درس واحد ثم استئناف')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.fail = {title:'L3', code:'upstream_error', times:1}")
    new_path(pg, 'مسار تجريبي', ''); pg.wait_for_function("window.__log.calls.length >= 9 && !document.querySelector('.gpanel.busy')", timeout=15000); pg.wait_for_timeout(200)
    check('تبقّى درس واحد' in pg.inner_text('#genp') and pg.locator('#genl .rail li.fail').count() == 1, 'درس فاشل: «تبقّى درس واحد» + علامة فشل')
    check('خلل مؤقت' in pg.inner_text('#genp'), 'رسالة الخطأ مفهومة')
    n0 = len(pg.evaluate("window.__log.calls")); pg.click('[data-act="gen-resume"]'); pg.wait_for_function("!document.querySelector('.gpanel')", timeout=8000)
    calls = pg.evaluate("window.__log.calls"); check(len(calls) - n0 == 1 and calls[-1].startswith('lesson:L3'), 'الاستئناف يكتب الدرس الفاشل وحده')
    pg.click('#genl .rail li:nth-child(1) a'); pg.wait_for_timeout(150); check(pg.locator('.prose').count() == 1, 'درس جاهز بعد الاستئناف')
    # إعادة كتابة درس
    n0 = len(pg.evaluate("window.__log.calls")); pg.click('[data-act="gen-lesson"][data-regen="1"]'); pg.wait_for_selector('[data-act="dlg-yes"]'); pg.click('[data-act="dlg-yes"]'); pg.wait_for_timeout(500)
    check(len(pg.evaluate("window.__log.calls")) - n0 == 1 and pg.locator('.prose').count() == 1, 'إعادة كتابة درس: طلب واحد والمحتوى يبقى'); ctx.close()

    print('— 3) حد الاستخدام (خطأ قاتل)')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.fatal = {title:'L2', code:'rate_limited'}")
    new_path(pg, 'مسار حد'); pg.wait_for_function("!document.querySelector('.gpanel.busy') && document.querySelector('.gpanel')", timeout=15000); pg.wait_for_timeout(200)
    t = pg.inner_text('#genp'); check('حد الاستخدام' in t and 'تبقّى' in t, 'يوقف ويشرح حد الاستخدام: ' + t.replace('\n', ' ')[:70])
    nl = len([c for c in pg.evaluate("window.__log.calls") if c.startswith('lesson')]); check(nl < 8, 'لم يستمر بالطلبات بعد الخطأ القاتل (%d دروس طُلبت)' % nl); ctx.close()

    print('— 4) ثلاث إخفاقات متتالية تُوقف البناء')
    ctx, pg, errs = make(b, init="window.__cfg_boot=1"); pg.evaluate("window.__cfg.fail = {title:'L', code:'upstream_error', times:50}")
    new_path(pg, 'مسار فشل'); pg.wait_for_function("!document.querySelector('.gpanel.busy') && document.querySelector('.gpanel')", timeout=15000)
    nl = len([c for c in pg.evaluate("window.__log.calls") if c.startswith('lesson')]); check(3 <= nl <= 4, 'توقف بعد ٣ إخفاقات (%d طلبات)' % nl); check('تكرر الفشل' in pg.inner_text('#genp'), 'رسالة التكرار'); ctx.close()

    print('— 5) إيقاف يدوي + استمرار بعد إعادة التحميل')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.delay = 400")
    new_path(pg, 'مسار إيقاف'); pg.wait_for_function("document.querySelectorAll('#genl .rail li').length === 8", timeout=8000); pg.wait_for_timeout(100)
    pg.click('[data-act="gen-stop"]'); pg.wait_for_timeout(300)
    check('أوقفت البناء' in pg.inner_text('#toasts') and pg.locator('[data-act="gen-resume"]').count() == 1 and pg.locator('.gpanel.busy').count() == 0, 'الإيقاف يعمل ويظهر زر الاستئناف')
    check(pg.evaluate("window.__log.aborted") >= 1, 'الطلبات الجارية أُلغيت فعلاً عبر AbortSignal')
    settle(pg); pg.reload(); pg.wait_for_timeout(400); pg.evaluate("location.hash='%s'" % state(pg)['courses'][0]['id'].join(['course-', '']))
    pg.wait_for_timeout(250); check('كمّل كتابة الدروس' in pg.inner_text('#genp') and pg.locator('.gpanel.busy').count() == 0, 'بعد إعادة التحميل: المسار موجود وغير «شغّال»')
    pg.evaluate("window.__cfg.delay = 20"); pg.click('[data-act="gen-resume"]'); pg.wait_for_function("!document.querySelector('.gpanel')", timeout=15000)
    check(True, 'الاستئناف بعد إعادة التحميل يكمل المسار'); ctx.close()

    print('— 6) فشل المخطط نفسه')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.outlineFail = 1")
    new_path(pg, 'مسار مخطط'); pg.wait_for_function("!document.querySelector('.gpanel.busy') && document.querySelector('.gpanel')", timeout=8000); pg.wait_for_timeout(150)
    check('ما اكتمل تصميم المخطط' in pg.inner_text('#genp') and pg.locator('#genl .rail li').count() == 0, 'فشل المخطط: رسالة وزر إعادة')
    pg.click('[data-act="gen-resume"]'); pg.wait_for_function("document.querySelectorAll('#genl .rail li').length === 8", timeout=8000); check(True, 'إعادة المخطط تنجح'); ctx.close()

    print('— 7) مسار طويل على أصغر شاشة')
    ctx, pg, errs = make(b, 320, 700); pg.evaluate("window.__cfg.n = 20")
    new_path(pg, 'مسار طويل جداً بعنوان يمتد على أكثر من سطر لاختبار الالتفاف'); pg.wait_for_function("document.querySelectorAll('#genl .rail li').length === 18", timeout=8000)
    pg.wait_for_function("!document.querySelector('#genp').innerText.trim()", timeout=20000)
    for r in ['course', 'academy', 'home', 'progress']:
        if r == 'course': pass
        else: pg.evaluate("location.hash='%s'" % r); pg.wait_for_timeout(250)
        o = pg.evaluate("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})"); check(o['sw'] <= o['cw'] + 1, 'لا تمرير أفقي (%s) %s' % (r, o))
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(200); pg.screenshot(path='dist/ai-academy-320.png', full_page=True)
    ctx.close()

    print('— 8) بدون أي ذكاء اصطناعي (ملف مستقل)')
    ctx, pg, errs = make(b, mock=False)
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150); pg.click('[data-act="gen-new"]'); pg.wait_for_timeout(250)
    check(pg.locator('form[data-form="gen"]').count() == 0 and 'ما اكو ذكاء اصطناعي مربوط' in pg.inner_text('dialog[open]'), 'رسالة صريحة بدل نموذج لا يعمل')
    check(state(pg).get('courses', []) == [], 'لا ينشئ مساراً'); pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.click('[data-act="assistant"]'); pg.wait_for_timeout(250); check('نموذج توضيحي' in pg.inner_text('dialog[open]'), 'المساعد يبقى توضيحياً صريحاً'); ctx.close()

    print('— 9) مزوّد مسجّل بالكود (setAssistantProvider)')
    ctx, pg, errs = make(b, mock=False)
    pg.evaluate("""NASAQ.setAssistantProvider(async (req) => { window.__preq = req; if (req.prompt.includes('صمّم مخطط')) return JSON.stringify({units:[{t:'التأسيس',lessons:[{t:'أ',brief:'x'},{t:'ب',brief:'y'}]},{t:'البناء',lessons:[{t:'ج',brief:'z'},{t:'د',brief:'w'}]}]}); if (req.prompt.includes('اكتب نص درس')) return '```json\\n'+JSON.stringify({blocks:[['p',Array(200).fill('كلمة').join(' ')],['h','ع'],['p','نص'],['p','نص']],cards:[]})+'\\n```'; return 'رد المزوّد'; })""")
    new_path(pg, 'عبر مزوّد', 'x'); pg.wait_for_function("!document.querySelector('.gpanel') && document.querySelectorAll('#genl .rail li').length === 4", timeout=8000)
    check(pg.locator('#genl .rail li.pend').count() == 0, 'المزوّد المسجّل يبني المسار كاملاً (حتى مع JSON داخل ```)'); ctx.close()

    print('— 10) رفض الإذن')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.fatal = {title:'L', code:'not_granted'}")
    new_path(pg, 'مسار إذن'); pg.wait_for_function("!document.querySelector('.gpanel.busy') && document.querySelector('.gpanel')", timeout=8000)
    check('ما سمحت' in pg.inner_text('#genp'), 'رسالة رفض الإذن'); ctx.close()

    print('— 11) مصادر مقترحة: كتب وفيديوهات بالمسار والدرس')
    ctx, pg, errs = make(b, 390, 900); new_path(pg, 'مسار مصادر', 'x')
    pg.wait_for_function("!document.querySelector('.gpanel') && document.querySelectorAll('#genl .rail li').length === 8", timeout=15000); pg.wait_for_timeout(300)
    check(pg.locator('#cres .resi').count() == 4, 'قسم «مصادر إضافية» فيه ٤ مصادر (%d)' % pg.locator('#cres .resi').count())
    kinds = pg.eval_on_selector_all('#cres .resi .chip', 'e=>e.map(x=>x.textContent.trim())'); check(kinds == ['كتاب', 'فيديو', 'دورة', 'موقع'], 'أنواع المصادر: %s' % kinds)
    hrefs = pg.eval_on_selector_all('#cres .resi a.btn', 'e=>e.map(x=>x.getAttribute("href"))')
    check(hrefs[0].startswith('https://www.google.com/search?tbm=bks&q=') and hrefs[1].startswith('https://www.youtube.com/results?search_query=') and hrefs[3].startswith('https://www.google.com/search?q='), 'روابط بحث نبنيها نحن (كتب/يوتيوب/ويب)')
    check(not any('evil.example' in h for h in hrefs) and 'evil.example' not in pg.inner_html('#cres'), 'لا يظهر أي رابط جاء من النموذج')
    check(pg.eval_on_selector_all('#cres .resi a.btn', 'e=>e.every(x=>x.target==="_blank" && /noopener/.test(x.rel))'), 'الروابط تفتح بتبويب جديد مع noopener')
    check('اقتراحات من الذكاء الاصطناعي' in pg.inner_text('#cres') and 'ولا يفتح صفحة محددة' in pg.inner_text('#cres'), 'تنبيه صريح أنها اقتراحات وروابطها بحث')
    check(pg.evaluate("window.__xss") is None and '<img' in pg.inner_text('#cres'), 'عنوان خبيث يظهر نصاً محايداً')
    o = pg.evaluate("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})"); check(o['sw'] <= o['cw'] + 1, 'لا تمرير أفقي بصفحة المسار %s' % o)
    pg.screenshot(path='dist/res-1-course-phone.png', full_page=True)
    pg.click('#cres .resi [data-act="res-save"] >> nth=0'); pg.wait_for_timeout(200); settle(pg)
    st = state(pg); n0 = st['notes'][0]
    check(len(st['notes']) == 1 and n0['type'] == 'source' and n0['tags'] == ['كتاب'] and n0['src']['url'].startswith('https://www.google.com/search?tbm=bks'), 'حفظ مصدر بالمكتبة كـ«مصدر» برابط بحث')
    check('بمكتبتك' in pg.inner_text('#cres .resi >> nth=0'), 'الزر يتحول إلى «بمكتبتك»')
    pg.click('#cres .resi [data-act="res-save"] >> nth=0'); pg.wait_for_timeout(100); settle(pg); check(len(state(pg)['notes']) == 2, 'مصدر ثانٍ ينحفظ (لا تكرار للأول)')
    pg.click('#genl .rail li:nth-child(1) a'); pg.wait_for_timeout(250)
    check(pg.locator('.lesson-res .resi').count() == 2 and 'للتوسّع في هذا الدرس' in pg.inner_text('.lesson-res'), 'الدرس فيه قسم «للتوسّع» بمصدرين')
    pg.screenshot(path='dist/res-2-lesson-phone.png', full_page=True)
    pg.click('.lesson-res [data-act="res-save"] >> nth=0'); pg.wait_for_timeout(200); settle(pg)
    st = state(pg); check(len(st['notes']) == 3 and st['notes'][0]['src']['ref'] and st['notes'][0]['src']['ref']['kind'] == 'lesson', 'حفظ مصدر الدرس يربطه بالدرس')
    pg.evaluate("location.hash='library'"); pg.wait_for_timeout(200); pg.click('[data-act="lib-type"][data-t="source"]'); pg.wait_for_timeout(150)
    check(pg.locator('.masonry > *').count() == 3, 'المكتبة تعرضها تحت «مصادر»')
    pg.click('.masonry > * a >> nth=0') if pg.locator('.masonry > * a').count() else None; pg.wait_for_timeout(150)
    # نسخة احتياطية تحمل المصادر
    pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(150); exp = json.loads(pg.input_value('#bk-out'))['data']['courses'][0]
    check(len(exp['res']) == 4 and len(exp['units'][0]['lessons'][0]['refs']) == 2, 'النسخة الاحتياطية تحمل مصادر المسار والدرس')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 12) «اقترح مصادر» لمسار قديم بلا مصادر')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.noRes = true; window.__cfg.resFail = 2")
    new_path(pg, 'مسار قديم', 'x'); pg.wait_for_function("!document.querySelector('.gpanel') && document.querySelectorAll('#genl .rail li').length === 8", timeout=15000); pg.wait_for_timeout(300)
    check(pg.locator('#cres .resi').count() == 0 and pg.locator('#cres .resbox [data-act="gen-res"]').count() == 1, 'بلا مصادر: صندوق + زر «اقترح كتباً وفيديوهات»')
    pg.click('[data-act="gen-res"]'); pg.wait_for_timeout(400)
    check('خلل مؤقت' in pg.inner_text('#toasts') and pg.locator('#cres .resbox').count() == 1, 'فشل الاقتراح: رسالة والصندوق يبقى')
    n0 = len(pg.evaluate("window.__log.calls")); pg.evaluate("window.__cfg.noRes = false")
    pg.click('[data-act="gen-res"]'); pg.wait_for_function("document.querySelectorAll('#cres .resi').length === 4", timeout=5000)
    calls = pg.evaluate("window.__log.calls"); check(len(calls) - n0 == 1 and calls[-1] == 'res', 'طلب واحد فقط للمصادر')
    check('تحقق منها' in pg.inner_text('#toasts'), 'تنبيه التحقق بعد الجمع')
    settle(pg); check(len(state(pg)['courses'][0]['res']) == 4, 'المصادر محفوظة'); 
    pg.click('#cres [data-act="gen-res"]'); pg.wait_for_function("document.querySelectorAll('#cres .resi').length === 4 && !document.querySelector('.gpanel.busy')", timeout=5000); check(True, 'اقتراح من جديد يعمل')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()
    print('— 13) الموديل نسي المصادر بالمخطط: طلب تلقائي يجيبها')
    ctx, pg, errs = make(b); pg.evaluate("window.__cfg.noRes = true")
    new_path(pg, 'مسار بلا مصادر بالمخطط', 'x'); pg.wait_for_function("!document.querySelector('.gpanel') && document.querySelectorAll('#genl .rail li').length === 8", timeout=15000); pg.wait_for_timeout(300)
    calls = pg.evaluate("window.__log.calls"); check(calls.count('res') == 1 and calls.index('res') == 1, 'طلب مصادر تلقائي واحد مباشرة بعد المخطط: %s' % calls[:3])
    check(pg.locator('#cres .resi').count() == 4, 'المسار انتهى وفيه ٤ مصادر دون ضغط أي زر (%d، state=%d، hash=%s)' % (pg.locator('#cres .resi').count(), len(state(pg)['courses'][0].get('res') or []), pg.evaluate('location.hash')))
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()
    b.close()
print('\nPROBLEMS:' if problems else '\nNO PROBLEMS'); [print(' -', x) for x in problems]; sys.exit(1 if problems else 0)
