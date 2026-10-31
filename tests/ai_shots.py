# لقطات واجهة بناء المسارات: python3 tests/ai_shots.py (تعيد استخدام المزوّد الوهمي من aigen.py)
import sys
src = open('tests/aigen.py', encoding='utf-8').read(); exec(src.split("with sync_playwright() as p:")[0])
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg, errs = make(b, 390, 844); pg.evaluate("window.__cfg.delay = 900; window.__cfg.n = 12")
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(250); pg.screenshot(path='dist/ai-1-academy.png')
    pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]'); pg.wait_for_timeout(300)
    pg.fill('form[data-form="gen"] input[name=name]', 'التسويق الرقمي'); pg.fill('form[data-form="gen"] textarea[name=details]', 'عندي متجر صغير وأريد أتعلّم الإعلانات وقياس النتائج. أقدر أتفرّغ ساعة باليوم.')
    pg.screenshot(path='dist/ai-2-dialog.png')
    pg.click('form[data-form="gen"] button[type=submit]'); pg.wait_for_timeout(500); pg.screenshot(path='dist/ai-3-outline.png')
    pg.wait_for_function("document.querySelectorAll('.gbeads li.on').length >= 2", timeout=15000); pg.screenshot(path='dist/ai-4-building.png', full_page=True)
    pg.evaluate("window.__cfg.delay = 20"); pg.wait_for_function("!document.querySelector('.gpanel')", timeout=20000); pg.wait_for_timeout(300)
    pg.screenshot(path='dist/ai-5-course.png', full_page=True)
    pg.click('#cside a.btn'); pg.wait_for_timeout(300); pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path='dist/ai-6-lesson.png', full_page=True)
    ctx.close()
    for name, w, h, scheme in [('laptop', 1280, 900, 'light'), ('laptop-dark', 1280, 900, 'dark')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ', color_scheme=scheme); ctx.add_init_script(MOCK); pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(300)
        pg.evaluate("window.__cfg.delay = 15"); new_path(pg, 'التسويق الرقمي', 'x'); pg.wait_for_function("!document.querySelector('.gpanel')", timeout=20000); pg.wait_for_timeout(300)
        pg.screenshot(path=f'dist/ai-7-course-{name}.png', full_page=True)
        pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(250); pg.screenshot(path=f'dist/ai-8-academy-{name}.png')
        ctx.close()
    b.close()
