# لقطات بحجم الشاشة الفعلي للهاتف: python3 tests/shots.py (بعد تشغيل e2e.py الذي ينتج test-page.html)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 740}, locale='ar-IQ'); pg = ctx.new_page()
    pg.goto('file:///home/claude/nasaq/dist/test-page.html'); pg.wait_for_timeout(300)
    for r in ['home', 'academy', 'lesson-ltl-1', 'wiki', 'topic-retrieval-practice']:
        pg.evaluate(f"location.hash='{r}'"); pg.wait_for_timeout(250)
        pg.screenshot(path=f'dist/vp-{r}-360.png')
    b.close()
