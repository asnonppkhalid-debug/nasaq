# اختبار شامل: python3 tests/e2e.py  (يحتاج Playwright + dist/index.html)
import json, sys, re
from playwright.sync_api import sync_playwright
SKEL = open('dist/index.html', encoding='utf-8').read()
# نحاكي غلاف المنصة: doctype + head بسيط
html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}</style>' + SKEL.split('</head>')[0] + '</head><body>'
# head.html عناصره (title/meta/link) تأتي أولاً ثم style ثم body
html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}</style></head><body>' + SKEL + '</body></html>'
open('dist/test-page.html', 'w', encoding='utf-8').write(html)
SIZES = [('phone-s', 360, 740), ('phone-m', 414, 896), ('tablet', 768, 1024), ('laptop', 1280, 720), ('wide', 1800, 1000)]
ROUTES = ['home', 'academy', 'course-learn-to-learn', 'lesson-ltl-1', 'wiki', 'topic-spaced-repetition', 'library', 'review', 'graph', 'progress', 'prefs']
problems = []
def overflow(pg):
    return pg.evaluate("() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})")
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in SIZES:
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
        pg.goto('file:///home/claude/nasaq/dist/test-page.html')
        for r in ROUTES:
            pg.evaluate(f"location.hash='{r}'"); pg.wait_for_timeout(120)
            if pg.locator('#view .empty h3', has_text='ما لكيت').count(): problems.append(f'{name} {r}: route renders not-found')
            o = overflow(pg)
            if o['sw'] > o['cw'] + 1: problems.append(f'{name} {r}: horizontal overflow {o}')
        if errs: problems.append(f'{name}: console/page errors {errs[:3]}')
        ctx.close()
    # رحلة وظيفية على الهاتف الصغير
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, locale='ar-IQ'); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/nasaq/dist/test-page.html'); pg.wait_for_timeout(300)
    assert len(pg.inner_text('#view h1').strip()) > 8, 'greeting heading missing'   # التحية تتغيّر بحسب وقت اليوم
    pg.screenshot(path='dist/shot-home-first-run.png', full_page=True)
    # لا إحصاءات مزيفة عند أول استخدام
    txt = pg.inner_text('#view')
    assert 'خيط معرفتك' in txt and 'لسه بالبداية' in txt, 'first-run empty state missing'
    # درس: إكمال + بطاقات
    pg.evaluate("location.hash='lesson-ltl-1'"); pg.wait_for_timeout(150)
    pg.click('[data-act="lesson-done"]'); pg.wait_for_timeout(100)
    assert pg.locator('.done-box').count() == 1, 'lesson completion box'
    pg.click('[data-act="lesson-card"][data-k="0"]'); pg.wait_for_timeout(100)
    pg.click('[data-act="lesson-card"][data-k="1"]'); pg.wait_for_timeout(100)
    # ملاحظة جديدة
    pg.evaluate("location.hash='library'"); pg.wait_for_timeout(120)
    pg.click('.empty [data-act="new-note"][data-type="idea"]'); pg.wait_for_timeout(150)
    pg.fill('dialog input[name=title]', 'فكرة عن الذاكرة'); pg.fill('dialog textarea[name=body]', 'الذاكرة تحتاج تكرار.')
    pg.fill('dialog input[name=tags]', 'ذاكرة، تعلّم'); pg.click('dialog button[type=submit]'); pg.wait_for_timeout(150)
    assert pg.locator('.ncard').count() == 1, 'note card not created'
    # ملاحظة ثانية (اقتباس)
    pg.click('.row.grow [data-act="new-note"]'); pg.wait_for_timeout(120)
    pg.check('dialog input[value=quote]', force=True); pg.fill('dialog textarea[name=body]', 'اقتباس تجريبي.'); pg.click('dialog button[type=submit]'); pg.wait_for_timeout(150)
    assert pg.locator('.ncard').count() == 2
    # رابط بين العنصرين
    pg.evaluate("location.hash='graph'"); pg.wait_for_timeout(150)
    pg.click('[data-act="link-new"]'); pg.wait_for_timeout(100)
    opts = pg.eval_on_selector_all('dialog select[name=a] option', 'els=>els.map(e=>e.value)')
    notes = [o for o in opts if o.startswith('note:')]
    pg.select_option('dialog select[name=a]', notes[0]); pg.select_option('dialog select[name=b]', notes[1]); pg.fill('dialog input[name=label]', 'يدعم')
    pg.click('dialog button[type=submit]'); pg.wait_for_timeout(150)
    pg.click('[data-act="gr-view"][data-v="map"]'); pg.wait_for_timeout(150)
    assert pg.locator('svg .ge').count() == 1 and pg.locator('svg .gn').count() >= 2, 'graph edge'
    pg.screenshot(path='dist/shot-graph-phone.png', full_page=True)
    # مراجعة: بطاقتان مستحقتان
    pg.evaluate("location.hash='review'"); pg.wait_for_timeout(150)
    assert 'من 2' in pg.inner_text('.rv') or '2' in pg.inner_text('.rv'), 'review queue'
    pg.click('[data-act="rv-show"]'); pg.wait_for_timeout(100)
    pg.screenshot(path='dist/shot-review-phone.png', full_page=True)
    pg.click('.gr.g2'); pg.wait_for_timeout(100)
    pg.keyboard.press('Space'); pg.wait_for_timeout(80); pg.keyboard.press('Digit1'); pg.wait_for_timeout(120)
    # بطاقة 'ما عرفتها' تعود لآخر الطابور
    assert pg.locator('.rv').count() == 1, 'again card should requeue'
    pg.keyboard.press('Space'); pg.wait_for_timeout(80); pg.keyboard.press('Digit3'); pg.wait_for_timeout(120)
    assert pg.locator('.rv-done').count() == 1, 'session end'
    pg.wait_for_timeout(450)  # الحفظ مؤجّل 250ms
    data = pg.evaluate("JSON.parse(localStorage.getItem('nasaq:v1'))")
    assert len(data['reviews']) == 3, f"reviews logged: {len(data['reviews'])}"
    assert len(data['cards']) == 2 and len(data['notes']) == 2 and len(data['links']) == 1, 'counts'
    # التقدّم: لا رسم بياني ليوم واحد
    pg.evaluate("location.hash='progress'"); pg.wait_for_timeout(120)
    assert pg.locator('svg.cx').count() == 0, 'chart should not show with <2 active days'
    # بحث شامل
    pg.click('[data-act="search"]'); pg.wait_for_timeout(100); pg.fill('#gq', 'الارتباط'); pg.wait_for_timeout(100)
    assert pg.locator('.gres .srow').count() >= 1; pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    # نسخة احتياطية: تصدير ثم استبدال بعد مسح
    exp = pg.evaluate("document.querySelector('#bk-out')?.value || ''")
    pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(120)
    exp = pg.input_value('#bk-out'); assert json.loads(exp)['app'] == 'nasaq'
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(120)
    pg.fill('#bk-in', exp); pg.click('[data-act="bk-check"]'); pg.wait_for_timeout(80)
    pg.click('[data-act="bk-merge"]'); pg.wait_for_timeout(120)
    d2 = pg.evaluate("JSON.parse(localStorage.getItem('nasaq:v1'))")
    assert len(d2['notes']) == 2 and len(d2['cards']) == 2, 'restore failed'
    pg.fill('#bk-in', 'not json'); pg.click('[data-act="bk-check"]'); assert 'JSON' in pg.inner_text('#bk-res')
    # الصفحة الرئيسية بعد الاستعمال: كل الأقسام
    pg.evaluate("location.hash='home'"); pg.wait_for_timeout(200)
    pg.screenshot(path='dist/shot-home-used-phone.png', full_page=True)
    if errs: problems.append(f'journey errors {errs[:3]}')
    ctx.close()
    # لقطات سطح المكتب والداكن
    for name, w, h, scheme in [('laptop', 1280, 800, 'light'), ('laptop-dark', 1280, 800, 'dark'), ('tablet', 768, 1024, 'light')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ', color_scheme=scheme); pg = ctx.new_page()
        pg.goto('file:///home/claude/nasaq/dist/test-page.html'); pg.wait_for_timeout(300)
        pg.screenshot(path=f'dist/shot-home-{name}.png', full_page=True)
        for r in ['academy', 'lesson-ltl-3', 'wiki']:
            pg.evaluate(f"location.hash='{r}'"); pg.wait_for_timeout(200)
            pg.screenshot(path=f'dist/shot-{r}-{name}.png', full_page=True)
        ctx.close()
    b.close()
print('PROBLEMS:' if problems else 'NO PROBLEMS'); [print(' -', x) for x in problems]
sys.exit(1 if problems else 0)

