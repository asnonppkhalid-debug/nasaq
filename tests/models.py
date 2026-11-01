# اختبار نماذج الذكاء الاصطناعي المضافة من الإعدادات: python3 tests/models.py
# خادم وهمي محلي يحاكي OpenAI-compatible وAnthropic وGemini (مع CORS ومفاتيح وأخطاء)، ونموذج WebLLM وهمي.
# لا يتصل بأي خدمة حقيقية. المهم: صيغة الطلبات، الترويسات، معالجة الأخطاء، عدم تسريب المفاتيح، الواجهة.
import json, re, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

SKEL = open('dist/index.html', encoding='utf-8').read()
HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">%s<style>:root{color-scheme:light}body{margin:0;font:14px system-ui}</style></head><body>'
open('dist/test-page-m.html', 'w', encoding='utf-8').write(HEAD % '' + SKEL + '</body></html>')
open('dist/test-page-csp.html', 'w', encoding='utf-8').write(HEAD % '<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'">' + SKEL + '</body></html>')
URL = 'file:///home/claude/nasaq/dist/test-page-m.html'
URL_CSP = 'file:///home/claude/nasaq/dist/test-page-csp.html'

# ───────── الخادم الوهمي ─────────
LOG = []; ACT = {'cur': 0, 'max': 0}; LOCK = threading.Lock()
W = lambda n: ' '.join(['كلمة'] * n)
def outline():
    units = []; k = 0
    for t in ['التأسيس', 'البناء', 'التعمّق', 'الاحتراف']:
        ls = []
        for _ in range(2): k += 1; ls.append({'t': 'درس %d' % k, 'brief': 'ملخص %d' % k, 'min': 6})
        units.append({'t': t, 'goal': 'هدف ' + t, 'lessons': ls})
    return {'sub': 'سطر فرعي', 'desc': 'وصف المسار', 'units': units, 'res': [{'k': 'book', 't': 'كتاب أ', 'by': 'مؤلف'}, {'k': 'video', 't': 'سلسلة ب', 'by': 'قناة'}, {'k': 'course', 't': 'دورة ج'}]}
def lesson(): return {'blocks': [['p', W(90)], ['h', 'قسم'], ['p', W(90)], ['note', 'فكرة'], ['ul', ['أ', 'ب']], ['h', 'تمرين'], ['p', W(40)]], 'cards': [['س', 'ج']], 'refs': [{'k': 'book', 't': 'مرجع', 'by': 'مؤلف'}]}
def reply(prompt):
    if 'صمّم مخطط' in prompt: return json.dumps(outline(), ensure_ascii=False)
    if 'اكتب نص درس' in prompt: return json.dumps(lesson(), ensure_ascii=False)
    if 'اقترح مصادر إضافية' in prompt: return json.dumps({'res': outline()['res']}, ensure_ascii=False)
    if 'ردّ بكلمة واحدة' in prompt: return 'تمام'
    return 'جواب تجريبي من النموذج.'

BUSY = {'n': 0}
CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, x-goog-api-key'}
def jr(code, obj, extra=None): return code, dict(CORS, **{'Content-Type': 'application/json'}, **(extra or {})), json.dumps(obj, ensure_ascii=False).encode()
def handle(method, path, h, body):
    if method == 'OPTIONS': return 204, dict(CORS), b''
    try: j = json.loads(body or b'{}')
    except Exception: return jr(400, {'error': 'bad json'})
    LOG.append({'path': path, 'h': h, 'b': j})
    with LOCK: ACT['cur'] += 1; ACT['max'] = max(ACT['max'], ACT['cur'])
    try:
        time.sleep(0.05)
        if method == 'GET':
            if path.startswith('/gemini/v1beta/models'):
                if h.get('x-goog-api-key') != 'g-key-1': return jr(403, {'error': {'message': 'API key not valid'}})
                return jr(200, {'models': [{'name': 'models/gemini-3.8-flash', 'supportedGenerationMethods': ['generateContent']}, {'name': 'models/embedding-001', 'supportedGenerationMethods': ['embedContent']}, {'name': 'models/gemini-3.8-pro', 'supportedGenerationMethods': ['generateContent']}]})
            if path.startswith('/v1/models'):
                if h.get('authorization') != 'Bearer sk-test-123': return jr(401, {'error': {'message': 'missing key'}})
                return jr(200, {'data': [{'id': 'zeta-1'}, {'id': 'alpha-1'}]})
            return jr(404, {'error': 'no route'})
        if path.endswith('/chat/completions'):
            auth = h.get('authorization', ''); m = j.get('model', '')
            if auth.startswith('Bearer bad'): return jr(401, {'error': {'message': 'Incorrect API key provided: ' + auth[7:] + ' (sk-live-abcdef123456 also seen)'}})
            if auth == 'Bearer limit': return jr(429, {'error': {'message': 'Rate limit reached'}})
            if auth == 'Bearer quota': return jr(429, {'error': {'code': 'insufficient_quota', 'message': 'You exceeded your current quota'}})
            if '/open/' not in path and auth != 'Bearer sk-test-123': return jr(401, {'error': {'message': 'missing key'}})
            if m == 'nomodel': return jr(404, {'error': {'message': 'model not found'}})
            if m == 'forbid': return jr(403, {'error': 'forbidden origin'})
            if m == 'slow': time.sleep(0.25)
            prompt = j['messages'][-1]['content']; txt = reply(prompt)
            if m == 'think': txt = '<think>أفكّر قليلاً…</think>\n' + txt
            if m == 'trunc': return jr(200, {'choices': [{'message': {'content': txt[:40]}, 'finish_reason': 'length'}]})
            return jr(200, {'choices': [{'message': {'content': txt}, 'finish_reason': 'stop'}]})
        if path.endswith('/v1/messages') and '/anthropic/' in path:
            if h.get('x-api-key') != 'ak-test-1' or h.get('anthropic-version') != '2023-06-01' or h.get('anthropic-dangerous-direct-browser-access') != 'true':
                return jr(401, {'error': {'message': 'bad headers'}})
            return jr(200, {'content': [{'type': 'text', 'text': reply(j['messages'][-1]['content'])}], 'stop_reason': 'end_turn'})
        m = re.search(r'/gemini/v1beta/models/([^/:]+):generateContent', path)
        if m:
            if h.get('x-goog-api-key') != 'g-key-1': return jr(403, {'error': {'message': 'API key not valid'}})
            if m.group(1) == 'busy':
                BUSY['n'] += 1
                if BUSY['n'] <= 1: return jr(503, {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}})
            if m.group(1) == 'busyalways': return jr(503, {'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}})
            if m.group(1) == 'blocked': return jr(200, {'promptFeedback': {'blockReason': 'SAFETY'}})
            return jr(200, {'candidates': [{'content': {'parts': [{'text': reply(j['contents'][0]['parts'][0]['text'])}]}, 'finishReason': 'STOP'}]})
        return jr(404, {'error': 'no route'})
    finally:
        with LOCK: ACT['cur'] -= 1

class H(BaseHTTPRequestHandler):
    def _go(self):
        n = int(self.headers.get('content-length') or 0); body = self.rfile.read(n) if n else b''
        code, hd, out = handle(self.command, self.path, {k.lower(): v for k, v in self.headers.items()}, body)
        self.send_response(code)
        for k, v in hd.items(): self.send_header(k, v)
        self.send_header('Content-Length', str(len(out))); self.end_headers(); self.wfile.write(out)
    do_POST = do_OPTIONS = do_GET = _go
    def log_message(self, *a): pass
srv = ThreadingHTTPServer(('127.0.0.1', 0), H); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % PORT

# ───────── مساعدات الاختبار ─────────
problems = []
def check(c, m):
    if not c: problems.append(m); print('  ✗', m)
    else: print('  ✓', m)
FETCHJS = "(()=>{const of=window.fetch;window.__f={cur:0,max:0,n:0};window.fetch=function(...a){const F=window.__f;F.cur++;F.n++;F.max=Math.max(F.max,F.cur);return of.apply(this,a).finally(()=>{F.cur--;});};})();"
SAMPLE = "window.claude={use:async n=>n==='sample'?Object.assign(async()=>({text:'x'}),{json:async()=>({})}):null};"
def make(b, w=390, h=900, url=URL, init='', fetchwrap=True):
    ctx = b.new_context(viewport={'width': w, 'height': h}, locale='ar-IQ')
    if fetchwrap: ctx.add_init_script(FETCHJS)
    if init: ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(300); return ctx, pg, errs
def state(pg, k='nasaq:v1'): return pg.evaluate("k=>JSON.parse(localStorage.getItem(k)||'null')", k)
def settle(pg, ms=450): pg.wait_for_timeout(ms)
def prefs(pg): pg.evaluate("location.hash='prefs'"); pg.wait_for_selector('#ai-models')
def add_model(pg, preset, base=None, model=None, key=None, name=None, web=None, save=True, test=False):
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]')
    pg.select_option('select[name=preset]', preset)
    if base is not None: pg.fill('input[name=base]', base)
    if model is not None: pg.fill('input[name=model]', model)
    if key is not None: pg.fill('input[name=key]', key)
    if name is not None: pg.fill('input[name=name]', name)
    if web is not None: pg.select_option('select[name=webmodel]', web)
    if test:
        pg.click('[data-act="ai-test"]'); pg.wait_for_selector('#ai-test-res .chip.ok, #ai-test-res .err', timeout=8000)
        return pg.inner_text('#ai-test-res')
    if save: pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250)
def test_res(pg):
    pg.click('[data-act="ai-test"]'); pg.wait_for_function("document.querySelector('#ai-test-res .chip.ok, #ai-test-res .err')", timeout=8000)
    return pg.inner_text('#ai-test-res')
def new_path(pg, name='مسار نموذج', pick=None):
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150)
    pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]')
    if pick: pg.select_option('form[data-form="gen"] select[name=ai]', pick)
    pg.fill('form[data-form="gen"] input[name=name]', name); pg.click('form[data-form="gen"] button[type=submit]'); pg.wait_for_timeout(100)
def done(pg, t=20000): pg.wait_for_function("!document.querySelector('.gpanel') && document.querySelectorAll('#genl .rail li').length === 8", timeout=t); pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch()

    print('— 1) واجهة الإعدادات بلا نماذج مضافة')
    ctx, pg, errs = make(b); prefs(pg)
    check(pg.locator('input[name="aimodel"][value="auto"]:checked').count() == 1, 'الخيار «تلقائي» محدد')
    check('ما اكو مصدر متاح' in pg.inner_text('#ai-models') and 'المستخدم الآن' in pg.inner_text('#ai-models'), 'يقول بصدق: ما اكو مصدر متاح')
    check('ما راح تتصل' not in pg.inner_text('#ai-models'), 'لا تنبيه منصة العرض خارجها')
    check('نصاً عادياً' in pg.inner_text('#ai-models') and 'النسخة الاحتياطية' in pg.inner_text('#ai-models'), 'تحذير تخزين المفاتيح ظاهر')
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]')
    check(pg.locator('select[name=preset] option').count() == 11, 'أحد عشر خياراً للمزوّد')
    check(pg.locator('input[name=key]').is_visible() and pg.locator('input[name=base]').input_value() == 'https://openrouter.ai/api/v1', 'افتراضي OpenRouter: عنوان معبّأ ومفتاح مطلوب')
    check(pg.eval_on_selector('input[name=key]', 'e=>e.type') == 'password', 'حقل المفتاح من نوع password')
    pg.select_option('select[name=preset]', 'ollama')
    check(pg.locator('input[name=base]').input_value() == 'http://localhost:11434/v1' and not pg.locator('input[name=key]').is_visible() and 'OLLAMA_ORIGINS' in pg.inner_text('#ai-hint') and 'OLLAMA_CONTEXT_LENGTH' in pg.inner_text('#ai-hint'), 'Ollama: عنوان محلي، بلا مفتاح، تلميح CORS والسياق')
    pg.select_option('select[name=preset]', 'webllm')
    check(pg.locator('select[name=webmodel]').is_visible() and not pg.locator('input[name=base]').is_visible() and not pg.locator('input[name=model]').is_visible(), 'WebLLM: قائمة نماذج، بلا عنوان')
    check(pg.locator('select[name=webmodel] option').count() == 6 and 'Qwen2.5-1.5B' in pg.eval_on_selector('select[name=webmodel]', 'e=>e.options[0].value'), 'معرّفات نماذج WebLLM حقيقية')
    pg.select_option('select[name=preset]', 'anthropic'); check(pg.locator('input[name=base]').input_value() == 'https://api.anthropic.com/v1' and 'رصيد الـAPI' in pg.inner_text('#ai-hint'), 'Anthropic: عنوان وتلميح')
    pg.select_option('select[name=preset]', 'gemini'); check(pg.locator('input[name=base]').input_value().startswith('https://generativelanguage.googleapis.com/v1beta'), 'Gemini: عنوان')
    # تحقق الإدخال
    pg.select_option('select[name=preset]', 'openrouter'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(100)
    check('اسم النموذج' in pg.inner_text('#ai-test-res') and pg.locator('form[data-form="aimodel"]').count() == 1, 'بدون اسم نموذج: رسالة والنموذج يبقى')
    pg.fill('input[name=model]', 'm'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(100)
    check('يحتاج مفتاح' in pg.inner_text('#ai-test-res'), 'مزوّد يتطلب مفتاحاً: رسالة')
    pg.fill('input[name=key]', 'k'); pg.fill('input[name=base]', 'ftp://x'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(100)
    check('غير صالح' in pg.inner_text('#ai-test-res'), 'عنوان غير http(s): مرفوض')
    out = pg.inner_text('#ai-test-res'); pg.click('[data-act="ai-test"]'); pg.wait_for_timeout(100); check('غير صالح' in pg.inner_text('#ai-test-res'), 'اختبار الاتصال يرفض العنوان الفاسد قبل الإرسال')
    check(state(pg, 'nasaq:ai:v1') is None, 'لا شي انحفظ بعد الأخطاء')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 2) OpenAI-compatible: اختبار، حفظ، مفتاح مخفي، بناء مسار')
    LOG.clear(); ACT.update(cur=0, max=0)
    ctx, pg, errs = make(b); prefs(pg)
    r = add_model(pg, 'custom', BASE + '/v1', 'test-model', 'sk-test-123', test=True)
    check('اشتغل' in r and 'تمام' in r, 'جرّب الاتصال: اشتغل (%s)' % r.replace('\n', ' ')[:40])
    q = LOG[-1]; check(q['h'].get('authorization') == 'Bearer sk-test-123' and q['b']['model'] == 'test-model' and 'max_tokens' not in q['b'] and 'temperature' not in q['b'] and q['path'] == '/v1/chat/completions', 'ترويسة Bearer وجسم بسيط بلا max_tokens ولا temperature')
    check(not q['h'].get('referer') and q['b']['messages'][-1]['role'] == 'user', 'بلا Referer')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(300)
    check(pg.locator('.aim').count() == 2 and 'test-model' in pg.inner_text('.aim-list') and '••••-123' in pg.inner_text('.aim-list'), 'القائمة تعرض النموذج ومفتاحه مقنّعاً')
    check('sk-test-123' not in pg.content() and pg.locator('input[name=aimodel][value^="m-"]:checked').count() == 1, 'المفتاح الكامل غير موجود بـDOM والنموذج الجديد هو المحدد')
    settle(pg); ai = state(pg, 'nasaq:ai:v1'); check(ai and ai['list'][0]['key'] == 'sk-test-123' and ai['active'] == ai['list'][0]['id'], 'المفتاح محفوظ بمخزن مستقل')
    check('sk-test-123' not in json.dumps(state(pg)) and 'sk-test-123' not in pg.input_value('#bk-out'), 'المفتاح غير موجود بحالة التطبيق ولا بنص النسخة الاحتياطية')
    pg.screenshot(path='dist/mod-1-prefs-phone.png', full_page=True)
    LOG.clear(); ACT.update(cur=0, max=0)
    new_path(pg, 'مسار عبر نموذجي'); done(pg)
    reqs = [x for x in LOG if x['path'].endswith('chat/completions')]
    check(len(reqs) == 9 and 'صمّم مخطط' in reqs[0]['b']['messages'][-1]['content'], 'طلب مخطط + ٨ دروس (%d)' % len(reqs))
    check(all(x['b']['messages'][0]['role'] == 'system' and 'JSON' in x['b']['messages'][0]['content'] for x in reqs), 'كل طلب JSON يحمل تعليمة النظام')
    check(ACT['max'] == 1 and pg.evaluate("window.__f.max") == 1, 'خادم محلي ⇒ طلب واحد بالتوازي (server=%d, page=%d)' % (ACT['max'], pg.evaluate("window.__f.max")))
    check(pg.locator('#cres .resi').count() == 3 and pg.locator('#genl .rail li.pend').count() == 0, 'المسار كامل ومعه ٣ مصادر')
    pg.click('#genl .rail li:nth-child(1) a'); pg.wait_for_timeout(200); check(pg.locator('.lesson-res .resi').count() == 1, 'مصدر الدرس ظاهر')
    # المساعد عبر النموذج
    LOG.clear(); pg.click('[data-act="assistant"]'); pg.wait_for_selector('form[data-form="assist"]')
    pg.fill('form[data-form="assist"] textarea[name=q]', 'ما هو الارتباط؟'); pg.click('form[data-form="assist"] button[type=submit]'); pg.wait_for_selector('#a-out .a-out', timeout=5000)
    check('جواب تجريبي من النموذج' in pg.inner_text('#a-out') and 'الحد' not in pg.inner_text('#a-out') and len(LOG) == 1 and 'system' not in [m['role'] for m in LOG[0]['b']['messages']], 'المساعد يجيب عبر النموذج المضاف (بلا تعليمة JSON)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 3) أخطاء المزوّد تُترجم لرسائل مفهومة (ولا تسرّب المفتاح)')
    ctx, pg, errs = make(b); prefs(pg)
    def case(key, model, want, base=BASE + '/v1', label=None):
        pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'custom')
        pg.fill('input[name=base]', base); pg.fill('input[name=model]', model); pg.fill('input[name=key]', key)
        t = test_res(pg); check(want in t, (label or want) + ': ' + t.replace('\n', ' ')[:90]); pg.keyboard.press('Escape'); pg.wait_for_timeout(100); return t
    t = case('bad-key-xyz', 'm', 'رفض المفتاح'); check('bad-key-xyz' not in t and 'sk-live-abcdef123456' not in t and '•••' in t, 'رد الخادم لا يكشف المفتاح ولا أي مفتاح يشبهه (يُحجب)')
    check('401' in t, 'يظهر رمز الحالة 401')
    case('limit', 'm', 'حد الاستخدام'); case('quota', 'm', 'رصيدك'); case('sk-test-123', 'nomodel', 'ما لكيت النموذج'); case('sk-test-123', 'forbid', 'OLLAMA_ORIGINS', label='403 محلي → CORS')
    case('sk-test-123', 'm', 'تعذّر الاتصال', base='http://127.0.0.1:1/v1', label='خادم مغلق')
    t = case('sk-test-123', 'think', 'تمام'); check('أفكّر' not in t, 'نص <think> يُحذف من الرد')
    pg.keyboard.press('Escape')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 4) حد الرموز: رد JSON مقطوع، وحقل الحد الأقصى يُرسل')
    LOG.clear(); ctx, pg, errs = make(b); prefs(pg)
    add_model(pg, 'custom', BASE + '/v1', 'trunc', 'sk-test-123', save=False)
    pg.click('summary:has-text("خيارات متقدمة")'); pg.fill('input[name=max]', '3000'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250)
    new_path(pg, 'مسار مقطوع'); pg.wait_for_function("document.querySelector('.gpanel') && !document.querySelector('.gpanel.busy')", timeout=8000); pg.wait_for_timeout(200)
    check('انقطع الرد' in pg.inner_text('#genp') and 'ارفع' in pg.inner_text('#genp'), 'رد مقطوع: رسالة ترفع الحد (%s)' % pg.inner_text('#genp').replace('\n', ' ')[:70])
    check(LOG and LOG[0]['b'].get('max_tokens') == 3000, 'الحد الأقصى المحفوظ أُرسل max_tokens=3000')
    ctx.close()

    print('— 5) Anthropic: ترويسات المتصفح')
    LOG.clear(); ctx, pg, errs = make(b); prefs(pg)
    r = add_model(pg, 'anthropic', BASE + '/anthropic/v1', 'claude-test', 'ak-test-1', test=True)
    check('اشتغل' in r, 'اختبار Anthropic ينجح: ' + r.replace('\n', ' ')[:40])
    q = LOG[-1]; check(q['path'] == '/anthropic/v1/messages' and q['h'].get('x-api-key') == 'ak-test-1' and q['h'].get('anthropic-version') == '2023-06-01' and q['h'].get('anthropic-dangerous-direct-browser-access') == 'true', 'x-api-key + anthropic-version + ترويسة الوصول من المتصفح')
    check(q['b']['max_tokens'] == 64 and q['b']['model'] == 'claude-test' and 'authorization' not in q['h'], 'max_tokens مطلوب (64 للاختبار) وبلا Bearer')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250); LOG.clear()
    new_path(pg, 'مسار Anthropic'); done(pg)
    check(len(LOG) == 9 and all(x['b']['max_tokens'] == 4096 and 'JSON' in x['b']['system'] for x in LOG), 'بناء كامل: ٩ طلبات، max_tokens=4096، system فيه تعليمة JSON')
    ctx.close()

    print('— 6) Gemini: المفتاح بالترويسة لا بالرابط، وJSON mode')
    LOG.clear(); ctx, pg, errs = make(b); prefs(pg)
    r = add_model(pg, 'gemini', BASE + '/gemini/v1beta', 'gemini-test', 'g-key-1', test=True)
    check('اشتغل' in r, 'اختبار Gemini ينجح: ' + r.replace('\n', ' ')[:40])
    q = LOG[-1]; check(q['path'] == '/gemini/v1beta/models/gemini-test:generateContent' and 'key=' not in q['path'] and q['h'].get('x-goog-api-key') == 'g-key-1', 'المسار الصحيح والمفتاح بالترويسة وليس بالرابط')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250); LOG.clear()
    new_path(pg, 'مسار Gemini'); done(pg)
    check(len(LOG) == 9 and all(x['b']['generationConfig'].get('responseMimeType') == 'application/json' and 'systemInstruction' in x['b'] for x in LOG), 'بناء كامل بوضع JSON')
    ctx.close()
    ctx, pg, errs = make(b); prefs(pg); r = add_model(pg, 'gemini', BASE + '/gemini/v1beta', 'blocked', 'g-key-1', test=True)
    check('رفضت هذا الطلب' in r, 'حجب الأمان عند Gemini ⇒ رسالة «رفضت»: ' + r.replace('\n', ' ')[:50]); ctx.close()

    print('— 7) مزوّد بعيد (غير محلي): توازي طلبين، وتحقق https')
    LOG.clear()
    def remote(route):
        rq = route.request; code, hd, out = handle(rq.method, re.sub(r'^https://[^/]+', '', rq.url), {k.lower(): v for k, v in rq.headers.items()}, rq.post_data_buffer)
        route.fulfill(status=code, headers=hd, body=out)
    ctx, pg, errs = make(b); ctx.route('https://api.fake-llm.test/**', remote); prefs(pg)
    add_model(pg, 'custom', 'https://api.fake-llm.test/v1', 'slow', 'sk-test-123'); LOG.clear(); ACT.update(cur=0, max=0)
    new_path(pg, 'مسار بعيد'); done(pg, 30000)
    check(pg.evaluate("window.__f.max") == 2, 'مزوّد بعيد ⇒ طلبان بالتوازي (page=%d)' % pg.evaluate("window.__f.max"))
    ctx.close()

    print('— 8) داخل منصة العرض (اتصال خارجي محجوب بـ CSP)')
    ctx, pg, errs = make(b, url=URL_CSP, init=SAMPLE); prefs(pg)
    check('ما راح تتصل' in pg.inner_text('#ai-models'), 'تنبيه: النماذج المضافة لن تتصل داخل المنصة')
    r = add_model(pg, 'custom', BASE + '/v1', 'm', 'sk-test-123', test=True)
    check('منصة العرض' in r and 'ملف مستقل' in r, 'الاختبار يفشل برسالة صادقة تشرح السبب: ' + r.replace('\n', ' ')[:60])
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    check(pg.locator('input[name=aimodel][value="auto"]').count() == 1 and 'Claude عبر المنصة' in pg.inner_text('#ai-models'), 'الخيار التلقائي يعرض Claude عبر المنصة')
    ctx.close()

    print('— 9) اختيار النموذج عند بناء المسار + تعديل + حذف + إعادة الضبط')
    LOG.clear(); ctx, pg, errs = make(b, init=SAMPLE, url=URL); prefs(pg)
    add_model(pg, 'custom', BASE + '/v1', 'model-a', 'sk-test-123', name='نموذج أ'); pg.wait_for_timeout(200)
    pg.click('input[name=aimodel][value="auto"]'); pg.wait_for_timeout(150)
    check('Claude عبر المنصة' in pg.inner_text('#ai-models > p'), 'العودة إلى التلقائي تحدّث السطر العلوي')
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150); pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]')
    opts = pg.eval_on_selector_all('form[data-form="gen"] select[name=ai] option', 'e=>e.map(x=>x.textContent)')
    check(opts == ['Claude عبر المنصة', 'نموذج أ'], 'قائمة النموذج بنافذة المسار: %s' % opts)
    pg.select_option('form[data-form="gen"] select[name=ai]', index=1); pg.fill('form[data-form="gen"] input[name=name]', 'مسار اختيار'); pg.click('form[data-form="gen"] button[type=submit]'); done(pg)
    check(len(LOG) == 9, 'البناء مرّ عبر النموذج المختار (طلبات الخادم: %d)' % len(LOG))
    check(state(pg, 'nasaq:ai:v1')['active'].startswith('m-'), 'الاختيار صار هو النشط')
    prefs(pg); pg.click('[data-act="ai-edit"]'); pg.wait_for_selector('form[data-form="aimodel"]')
    check(pg.input_value('input[name=key]') == '' and 'اتركه فارغاً' in pg.get_attribute('input[name=key]', 'placeholder') and 'sk-test-123' not in pg.content(), 'تعديل: حقل المفتاح فارغ ولا يكشف المفتاح')
    pg.fill('input[name=model]', 'model-b'); LOG.clear(); r = test_res(pg)
    check('اشتغل' in r and LOG[-1]['h'].get('authorization') == 'Bearer sk-test-123' and LOG[-1]['b']['model'] == 'model-b', 'اختبار بالتعديل يستخدم المفتاح المحفوظ')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250); settle(pg)
    check(state(pg, 'nasaq:ai:v1')['list'][0]['model'] == 'model-b' and state(pg, 'nasaq:ai:v1')['list'][0]['key'] == 'sk-test-123', 'حفظ التعديل بقي المفتاح (العنوان نفسه)')
    # تغيير العنوان إلى مضيف آخر بلا مفتاح جديد ⇒ لا نرسل المفتاح القديم إليه
    pg.click('[data-act="ai-edit"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'openai'); pg.fill('input[name=model]', 'x')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(120)
    check('يحتاج مفتاح' in pg.inner_text('#ai-test-res') and pg.locator('form[data-form="aimodel"]').count() == 1, 'تغيير المزوّد بلا مفتاح جديد ⇒ يطلب مفتاحاً (لا يُعاد استخدام القديم لمضيف آخر)')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    pg.click('[data-act="ai-del"]'); pg.wait_for_selector('[data-act="dlg-yes"]'); pg.click('[data-act="dlg-yes"]'); pg.wait_for_timeout(250); settle(pg)
    check(state(pg, 'nasaq:ai:v1') is None and pg.locator('.aim').count() == 1 and pg.locator('input[name=aimodel][value=auto]:checked').count() == 1, 'الحذف يمسح النموذج والمفتاح ويرجع للتلقائي')
    add_model(pg, 'custom', BASE + '/v1', 'm', 'sk-test-123'); settle(pg); check(state(pg, 'nasaq:ai:v1') is not None, 'أضفنا مجدداً')
    pg.click('[data-act="reset"]'); pg.wait_for_selector('[data-act="dlg-yes"]'); pg.click('[data-act="dlg-yes"]'); pg.wait_for_timeout(300)
    check(state(pg, 'nasaq:ai:v1') is None, 'إعادة الضبط تمسح مفاتيح النماذج')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    print('— 10) النموذج داخل المتصفح (WebLLM بوحدة وهمية)')
    GENJS = """
const words = n => Array(n).fill('كلمة').join(' ');
const outline = () => { const units = []; let k = 0; ['التأسيس','البناء','التعمّق','الاحتراف'].forEach(t => { const ls = []; for (let i = 0; i < 2; i++) { k++; ls.push({ t: 'درس ' + k, brief: 'ملخص', min: 6 }); } units.push({ t, goal: 'هدف', lessons: ls }); }); return { sub: 's', desc: 'd', units, res: [{k:'book',t:'كتاب',by:'م'},{k:'video',t:'فيديو',by:'ق'}] }; };
const lesson = () => ({ blocks: [['p', words(90)], ['h', 'قسم'], ['p', words(90)], ['note', 'فكرة'], ['ul', ['أ']], ['p', words(30)]], cards: [['س','ج']], refs: [] });
export async function CreateMLCEngine(model, opts) {
  const W = (window.__web = window.__web || { loads: [], prompts: [], cur: 0, max: 0, interrupted: 0, unloaded: 0 }); W.loads.push(model);
  for (const p of [0.1, 0.6, 1]) { opts.initProgressCallback({ progress: p, text: 'تحميل ' + Math.round(p * 100) + '%' }); await new Promise(r => setTimeout(r, 60)); }
  let intr = null;
  return { chat: { completions: { async create(req) {
    W.cur++; W.max = Math.max(W.max, W.cur);
    const prompt = req.messages[req.messages.length - 1].content; W.prompts.push({ prompt, max: req.max_tokens, sys: req.messages.length > 1 });
    try {
      await Promise.race([new Promise(r => setTimeout(r, window.__webDelay || 40)), new Promise(r => { intr = r; })]);
      const t = prompt.includes('صمّم مخطط') ? JSON.stringify(outline()) : (prompt.includes('اكتب نص درس') ? JSON.stringify(lesson()) : (prompt.includes('ردّ بكلمة') ? 'تمام' : 'جواب محلي'));
      return { choices: [{ message: { content: t }, finish_reason: 'stop' }] };
    } finally { W.cur--; }
  } } }, interruptGenerate() { W.interrupted++; if (intr) intr(); }, async unload() { W.unloaded++; } };
}
"""
    GPU = "Object.defineProperty(navigator,'gpu',{value:{},configurable:true});"
    imports = []
    def web_ctx(init=GPU, **kw):
        ctx, pg, errs = make(b, init=init, **kw)
        def mod(route):
            imports.append(route.request.url)
            route.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/javascript'}, body=GENJS)
        ctx.route('https://cdn.jsdelivr.net/**', mod); return ctx, pg, errs
    ctx, pg, errs = web_ctx(); prefs(pg)
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'webllm')
    check('WebGPU' in pg.inner_text('#ai-hint') and '⚠' not in pg.inner_text('#ai-hint'), 'تلميح WebLLM بلا تحذير (WebGPU متاح)')
    pg.select_option('select[name=webmodel]', 'Qwen2.5-3B-Instruct-q4f16_1-MLC'); pg.click('[data-act="ai-test"]')
    pg.wait_for_selector('#ai-test-res .gbar', timeout=3000); pg.wait_for_function("document.querySelector('#ai-test-res .chip.ok, #ai-test-res .err')", timeout=8000)
    check('اشتغل' in pg.inner_text('#ai-test-res'), 'تحميل النموذج واختباره: ' + pg.inner_text('#ai-test-res').replace('\n', ' ')[:50])
    check(imports and '@mlc-ai/web-llm@0.2.85' in imports[0], 'المكتبة تُحمَّل من jsDelivr بإصدار مثبّت: %s' % (imports[:1],))
    check(pg.evaluate("window.__web.loads") == ['Qwen2.5-3B-Instruct-q4f16_1-MLC'], 'حُمّل النموذج المختار')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250)
    check('داخل المتصفح' in pg.inner_text('.aim-list') and 'Qwen2.5-3B' in pg.inner_text('.aim-list') and state(pg, 'nasaq:ai:v1')['list'][0]['key'] == '', 'يظهر بالقائمة بلا مفتاح')
    pg.evaluate("window.__web.prompts.length = 0")
    pg.evaluate("location.hash='academy'"); pg.wait_for_timeout(150); pg.click('[data-act="gen-new"]'); pg.wait_for_selector('form[data-form="gen"]')
    check('أقصر' in pg.inner_text('dialog[open] .notice') and 'أبطأ' in pg.inner_text('dialog[open] .notice'), 'نافذة المسار تنبّه: دروس أقصر وأبطأ')
    pg.fill('form[data-form="gen"] input[name=name]', 'مسار محلي'); pg.click('form[data-form="gen"] button[type=submit]'); done(pg)
    W_ = pg.evaluate("window.__web")
    check(W_['max'] == 1 and len(W_['prompts']) == 9, 'طلب واحد بالتوازي (%d) و٩ طلبات (%d)' % (W_['max'], len(W_['prompts'])))
    lp = [x for x in W_['prompts'] if 'اكتب نص درس' in x['prompt']]
    check(lp and all('280 و420' in x['prompt'] and x['max'] == 2048 for x in lp), 'الدروس بصيغة «قصيرة» وحد رموز 2048')
    check(pg.evaluate("window.__web.loads.length") == 1, 'النموذج لا يُحمَّل ثانية (استُعمل المحرّك المحمّل)')
    check(pg.locator('#cres .resi').count() == 2, 'مصادر المسار ظاهرة')
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()

    # إيقاف يدوي يقاطع التوليد
    ctx, pg, errs = web_ctx(); prefs(pg); add_model(pg, 'webllm', web='Qwen2.5-1.5B-Instruct-q4f16_1-MLC')
    pg.evaluate("window.__webDelay = 1500"); new_path(pg, 'مسار توقف')
    pg.wait_for_function("window.__web && window.__web.prompts.length >= 1", timeout=8000); pg.wait_for_selector('[data-act="gen-stop"]'); pg.click('[data-act="gen-stop"]'); pg.wait_for_timeout(400)
    check(pg.evaluate("window.__web.interrupted") >= 1, 'زر «إيقاف» يستدعي interruptGenerate'); check('أوقفت البناء' in pg.inner_text('#toasts'), 'رسالة الإيقاف'); ctx.close()
    # بلا WebGPU
    ctx, pg, errs = web_ctx(init="Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});"); prefs(pg)
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'webllm')
    check('⚠' in pg.inner_text('#ai-hint') and 'ما يدعم WebGPU' in pg.inner_text('#ai-hint'), 'بلا WebGPU: تحذير بالتلميح')
    r = test_res(pg); check('ما يدعم WebGPU' in r, 'الاختبار يفشل برسالة WebGPU'); ctx.close()
    # فشل تحميل المكتبة
    ctx, pg, errs = make(b, init=GPU); ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.abort()); prefs(pg)
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'webllm'); r = test_res(pg)
    check('فشل تحميل النموذج المحلي' in r, 'تعذّر تحميل المكتبة ⇒ رسالة مفهومة'); ctx.close()

    print('— 11) المقاسات: لا تمرير أفقي بالإعدادات والنافذة')
    for w in (320, 390, 1280):
        ctx, pg, errs = make(b, w, 800); prefs(pg)
        add_model(pg, 'custom', BASE + '/v1', 'نموذج-بإسم-طويل-جداً-' + 'x' * 60, 'sk-test-123', name='اسم طويل جداً ' * 6)
        o = pg.evaluate("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})"); check(o['sw'] <= o['cw'] + 1, 'الإعدادات %dpx بلا تمرير أفقي %s' % (w, o))
        if w == 320: pg.screenshot(path='dist/mod-2-prefs-320.png', full_page=True)
        pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'ollama')
        o = pg.evaluate("(()=>{const d=document.querySelector('dialog[open] .dlg-in');return {sw:d.scrollWidth,cw:d.clientWidth}})()"); check(o['sw'] <= o['cw'] + 1, 'نافذة الإضافة %dpx بلا تمرير أفقي %s' % (w, o))
        if w == 390: pg.screenshot(path='dist/mod-3-dialog-phone.png')
        if w == 1280: pg.screenshot(path='dist/mod-4-dialog-laptop.png')
        pg.keyboard.press('Escape'); ctx.close()
    print('— 14) إصلاح إضافة النموذج: أخطاء ظاهرة، جلب القائمة، إعادة المحاولة عند الازدحام')
    ctx, pg, errs = make(b); prefs(pg)
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'gemini')
    check(pg.locator('input[name=model]').get_attribute('placeholder') == 'gemini-3.8-flash', 'Gemini: مثال الاسم بالخانة')
    pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(200)
    check('اكتب اسم النموذج' in pg.inner_text('#ai-test-res') and pg.eval_on_selector('input[name=model]', 'e=>e===document.activeElement && e.getAttribute("aria-invalid")==="true"'), 'حفظ بلا اسم: رسالة ثابتة بالنافذة والتركيز على الخانة')
    pg.fill('input[name=model]', 'x'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(200)
    check('يحتاج مفتاح' in pg.inner_text('#ai-test-res') and pg.eval_on_selector('input[name=key]', 'e=>e===document.activeElement'), 'حفظ بلا مفتاح: رسالة والتركيز على المفتاح')
    pg.fill('input[name=model]', ''); pg.fill('input[name=base]', BASE + '/gemini/v1beta'); LOG.clear()
    pg.click('[data-act="ai-list"]'); pg.wait_for_timeout(200)
    check('الصق مفتاح' in pg.inner_text('#ai-test-res') and not LOG, 'جلب القائمة بلا مفتاح: لا طلب ويطلب المفتاح')
    pg.fill('input[name=key]', 'g-key-1'); pg.click('[data-act="ai-list"]'); pg.wait_for_function("document.querySelectorAll('#ai-dl option').length > 0", timeout=5000)
    opts = pg.eval_on_selector_all('#ai-dl option', 'e=>e.map(x=>x.value)')
    check(opts == ['gemini-3.8-pro', 'gemini-3.8-flash'], 'القائمة: نماذج generateContent فقط وبدون «models/»: %s' % opts)
    q = LOG[-1]; check(q['path'].startswith('/gemini/v1beta/models?') and 'key=' not in q['path'] and q['h'].get('x-goog-api-key') == 'g-key-1', 'الجلب بالترويسة وليس بالرابط')
    check('لقينا 2' in pg.inner_text('#ai-list-res'), 'يخبر بعدد النماذج')
    pg.fill('input[name=model]', 'gemini-3.8-flash'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250)
    check(len(state(pg, 'nasaq:ai:v1')['list']) == 1, 'الحفظ بعد اختيار الاسم ينجح'); ctx.close()
    ctx, pg, errs = make(b); prefs(pg)   # متوافق مع OpenAI
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'custom'); pg.fill('input[name=base]', BASE + '/v1'); pg.fill('input[name=key]', 'sk-test-123')
    pg.click('[data-act="ai-list"]'); pg.wait_for_function("document.querySelectorAll('#ai-dl option').length > 0", timeout=5000)
    check(pg.eval_on_selector_all('#ai-dl option', 'e=>e.map(x=>x.value)') == ['alpha-1', 'zeta-1'], 'قائمة OpenAI-compatible مرتبة'); ctx.close()
    # خطأ مفتاح عند الجلب
    ctx, pg, errs = make(b); prefs(pg)
    pg.click('[data-act="ai-add"]'); pg.wait_for_selector('form[data-form="aimodel"]'); pg.select_option('select[name=preset]', 'gemini'); pg.fill('input[name=base]', BASE + '/gemini/v1beta'); pg.fill('input[name=key]', 'wrong')
    pg.click('[data-act="ai-list"]'); pg.wait_for_function("document.querySelector('#ai-list-res').textContent.includes('403')", timeout=5000); check(True, 'مفتاح خاطئ عند الجلب: رسالة بدل صمت'); ctx.close()
    # ازدحام 503
    BUSY['n'] = 0; LOG.clear(); ctx, pg, errs = make(b); ctx.route('https://api.fake-llm.test/**', remote); prefs(pg)
    r = add_model(pg, 'gemini', 'https://api.fake-llm.test/gemini/v1beta', 'busyalways', 'g-key-1', test=True)
    n = len([x for x in LOG if 'busyalways' in x['path']]); check('503' in r and n == 1, 'زر الاختبار لا يعيد المحاولة (طلب واحد، 503 ظاهر): n=%d' % n)
    pg.fill('input[name=model]', 'busy'); pg.click('form[data-form="aimodel"] button[type=submit]'); pg.wait_for_timeout(250); LOG.clear(); BUSY['n'] = 0
    t0 = time.time(); new_path(pg, 'مسار وقت الازدحام'); done(pg, 40000)
    nb = len([x for x in LOG if 'models/busy:' in x['path']]); check(nb == 10 and not pg.locator('[data-act="gen-resume"]').count(), '503 مؤقت: أُعيد الطلب تلقائياً وكمل البناء (طلبات=%d)' % nb)
    check(not errs, 'بلا أخطاء صفحة: %s' % errs[:2]); ctx.close()
    b.close()
print('\nPROBLEMS:' if problems else '\nNO PROBLEMS'); [print(' -', x) for x in problems]; sys.exit(1 if problems else 0)
