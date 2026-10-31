# لقطة خريطة الشبكة ببيانات مزروعة: python3 tests/graph_shot.py
import json, time
from playwright.sync_api import sync_playwright
t = int(time.time() * 1000)
notes = [{'id': f'n{i}', 'type': ty, 'title': ti, 'body': 'نص تجريبي للاختبار', 'tags': [], 'src': {}, 'created': t - i * 1000, 'updated': t - i * 1000}
         for i, (ty, ti) in enumerate([('idea', 'فكرة عن الذاكرة طويلة العنوان قليلاً'), ('quote', 'اقتباس'), ('note', 'ملاحظة عن التكرار المتباعد'), ('source', 'كتاب التعلّم الفعّال')])]
links = [{'id': 'l1', 'a': {'kind': 'note', 'id': 'n0'}, 'b': {'kind': 'topic', 'id': 'forgetting-curve'}, 'label': 'يدعم', 't': t},
         {'id': 'l2', 'a': {'kind': 'note', 'id': 'n2'}, 'b': {'kind': 'topic', 'id': 'spaced-repetition'}, 'label': '', 't': t},
         {'id': 'l3', 'a': {'kind': 'topic', 'id': 'spaced-repetition'}, 'b': {'kind': 'topic', 'id': 'forgetting-curve'}, 'label': 'مرتبط', 't': t}]
state = {'v': 1, 'created': t, 'notes': notes, 'links': links}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, w, h in [('phone', 360, 1700), ('laptop', 1280, 800)]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ'); pg = ctx.new_page()
        ctx.add_init_script("localStorage.setItem('nasaq:v1', %s)" % json.dumps(json.dumps(state)))
        pg.goto('file:///home/claude/nasaq/dist/test-page.html'); pg.wait_for_timeout(300)
        pg.evaluate("location.hash='graph'"); pg.wait_for_timeout(300)
        if name == 'phone': pg.click('[data-act="gr-view"][data-v="map"]'); pg.wait_for_timeout(300)
        svg = pg.locator('.gmap svg').first
        svg.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        pg.evaluate('window.scrollTo(0,0)'); pg.screenshot(path=f'dist/graph-{name}.png')
        # هل أي نص عقدة يخرج عن حدود الـSVG؟
        out = pg.evaluate("""() => { const s=document.querySelector('.gmap svg'); const r=s.getBoundingClientRect(); const bad=[];
          s.querySelectorAll('text').forEach(t=>{const b=t.getBoundingClientRect(); if(b.left<r.left-1||b.right>r.right+1) bad.push(t.textContent)}); return bad }""")
        print(name, 'clipped labels:', out)
        ctx.close()
    b.close()
