# اختبار التنزيل عبر قدرة downloads (محاكاة العارض): python3 tests/download.py
import json
from playwright.sync_api import sync_playwright
INIT = """window.__saved=null; window.__mode='ok';
window.claude={use: async n => n==='downloads' ? {save: async r => { if(window.__mode==='decline') throw {code:'declined',message:'x'}; window.__saved=r; return {status:'saved'}; }} : null};"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width':390,'height':800}); ctx.add_init_script(INIT); pg = ctx.new_page()
    pg.goto('file:///home/claude/nasaq/dist/test-page.html'); pg.wait_for_timeout(300)
    pg.evaluate("location.hash='prefs'"); pg.wait_for_timeout(200)
    def stamp(): return pg.evaluate("JSON.parse(localStorage.getItem('nasaq:v1')||'{}').backup?.last||0")
    pg.evaluate("window.__mode='decline'"); pg.click('[data-act="bk-dl"]'); pg.wait_for_timeout(500)
    assert pg.evaluate("window.__saved") is None and 'انحفظت' not in pg.inner_text('#toasts'), 'declined must not report saved'
    pg.evaluate("window.__mode='ok'"); pg.click('[data-act="bk-dl"]'); pg.wait_for_timeout(500)
    r = pg.evaluate("window.__saved"); assert r and r['filename'].startswith('nasaq-backup-') and r['filename'].endswith('.json'), r
    assert json.loads(r['data'])['app'] == 'nasaq'; assert 'انحفظت' in pg.inner_text('#toasts')
    print('DOWNLOAD OK', r['filename']); b.close()
