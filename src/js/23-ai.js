/* ═══ طبقة الذكاء الاصطناعي ═══
   مصدر الجواب، بالترتيب:
   1) نموذج أضافه المستخدم من الإعدادات وجعله المستخدم الحالي: مفتاح API، أو خادم محلي (Ollama، LM Studio)، أو نموذج داخل المتصفح (WebGPU)
   2) مزوّد سجّله المطوّر: NASAQ.setAssistantProvider(fn)
   3) قدرة sample في منصة العرض (تعمل على حساب Claude الخاص بالمشاهد وبموافقته)
   4) لا شي: نقول ذلك بصدق ولا نمثّل أن هناك ذكاءً اصطناعياً.

   أمان المفاتيح: تُحفظ في مفتاح تخزين مستقل (nasaq:ai:v1) لا يدخل النسخ الاحتياطي ولا التصدير، ولا تُرسل إلا للعنوان الذي حدّده المستخدم. */
const IN_VIEWER = !!(window.claude && typeof window.claude.use === 'function');   // داخل منصة العرض الاتصال الخارجي محجوب
const AI = { sample: null, hooks: new Set(), web: { engine: null, model: '', want: '', loading: null, p: 0, text: '' } };
AI.ready = (async () => {
  try { if (IN_VIEWER) AI.sample = (await window.claude.use('sample')) || null; }
  catch (e) { AI.sample = null; }
})();

/* ───── النماذج المضافة (مخزن مستقل) ───── */
const AIKEY = 'nasaq:ai:v1';
const AIC = { active: 'auto', list: [] };
const AIKINDS = { openai: 'متوافق مع OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', webllm: 'داخل المتصفح' };
const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';
const SYS_JSON = 'أجب بكائن JSON صالح فقط، بلا أي نص خارجه ولا Markdown.';

function aiNorm(m) {
  if (!m || typeof m !== 'object' || !AIKINDS[m.kind] || !/^[A-Za-z0-9-]{3,60}$/.test(String(m.id))) return null;
  const kind = m.kind;
  let base = '';
  if (kind !== 'webllm') {
    try { const u = new URL(String(m.base || '')); if (!/^https?:$/.test(u.protocol)) return null; base = u.href.replace(/\/+$/, ''); } catch (e) { return null; }
  }
  const model = PS.clean(m.model, 120).replace(/\s+/g, ''); if (!model) return null;
  const mx = Math.round(Number(m.max));
  return {
    id: String(m.id), kind, base, model, name: PS.clean(m.name, 60) || model,
    key: kind === 'webllm' ? '' : String(m.key || '').replace(/\s+/g, '').slice(0, 400),
    max: Number.isFinite(mx) && mx >= 256 ? Math.min(mx, 64000) : 0
  };
}
function aiLoad() {
  try {
    const o = JSON.parse(localStorage.getItem(AIKEY) || 'null');
    if (o && Array.isArray(o.list)) {
      const seen = new Set();
      AIC.list = o.list.map(aiNorm).filter(m => m && !seen.has(m.id) && seen.add(m.id)).slice(0, 8);
      AIC.active = AIC.list.some(m => m.id === o.active) ? o.active : 'auto';
    }
  } catch (e) { }
}
function aiSave() {
  try {
    if (!AIC.list.length) localStorage.removeItem(AIKEY);
    else localStorage.setItem(AIKEY, JSON.stringify({ v: 1, active: AIC.active, list: AIC.list }));
    return true;
  } catch (e) { return false; }
}
function aiWipe() { AIC.list = []; AIC.active = 'auto'; try { localStorage.removeItem(AIKEY); } catch (e) { } }
const aiMask = k => k ? '••••' + (k.length >= 8 ? k.slice(-4) : '') : 'بلا مفتاح';

AI.tick = () => AI.hooks.forEach(f => { try { f(); } catch (e) { } });   // تقدّم تحميل النموذج المحلي
AI.cfg = () => AIC.list.find(m => m.id === AIC.active) || null;
const isLocalHost = h => /^(localhost|127\.|0\.0\.0\.0$|\[::1\]$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(h) || /\.local$/i.test(h);
AI.local = (c = AI.cfg()) => { if (!c) return false; if (c.kind === 'webllm') return true; try { return isLocalHost(new URL(c.base).hostname); } catch (e) { return false; } };
AI.concurrency = () => AI.local() ? 1 : 2;       // النماذج المحلية تعالج طلباً واحداً في الوقت نفسه
AI.lite = () => { const c = AI.cfg(); return !!c && c.kind === 'webllm'; }   // نموذج صغير: دروس أقصر
AI.available = () => !!(AI.cfg() || AI.sample || (typeof ASSIST !== 'undefined' && ASSIST.provider));
AI.source = () => AI.cfg() ? 'custom' : ((typeof ASSIST !== 'undefined' && ASSIST.provider) ? 'provider' : (AI.sample ? 'claude' : 'none'));
AI.label = () => { const s = AI.source(); return s === 'custom' ? AI.cfg().name : (s === 'provider' ? 'خدمة مربوطة' : (s === 'claude' ? 'Claude عبر المنصة' : 'غير متاح')); };

AI.PRESETS = [
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai', base: 'https://openrouter.ai/api/v1', key: 'req', hint: 'مفتاح من حسابك في OpenRouter. يعطيك نماذج كثيرة من مزوّدين مختلفين، وبعضها رخيص أو مجاني. اكتب اسم النموذج كما يظهر في صفحة النماذج عندهم (بصيغة «مزوّد/نموذج»).' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai', base: 'https://api.deepseek.com', key: 'req', hint: 'مفتاح من منصة DeepSeek. اكتب اسم النموذج كما في توثيقهم. إذا المتصفح منع الاتصال المباشر (CORS) ما راح يشتغل بدون وسيط.' },
  { id: 'groq', name: 'Groq', kind: 'openai', base: 'https://api.groq.com/openai/v1', key: 'req', hint: 'مفتاح من Groq. سريع جداً. اكتب اسم النموذج كما يظهر عندهم.' },
  { id: 'openai', name: 'OpenAI', kind: 'openai', base: 'https://api.openai.com/v1', key: 'req', hint: 'مفتاح من حساب OpenAI. اكتب اسم النموذج كما يظهر عندهم.' },
  { id: 'mistral', name: 'Mistral', kind: 'openai', base: 'https://api.mistral.ai/v1', key: 'req', hint: 'مفتاح من Mistral. اكتب اسم النموذج كما في توثيقهم.' },
  { id: 'anthropic', name: 'Anthropic (Claude بمفتاحك)', kind: 'anthropic', base: 'https://api.anthropic.com/v1', key: 'req', hint: 'مفتاح من حسابك في Anthropic. يُحسب على رصيد الـAPI عندك، مو على اشتراك Claude. نرسل الترويسة اللي تسمح بالاتصال من المتصفح.' },
  { id: 'gemini', name: 'Google Gemini', kind: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', key: 'req', hint: 'مفتاح من Google AI Studio. اكتب اسم النموذج كما يظهر هناك. راجع صفحة أسعارهم، قد يكون فيه مستوى مجاني محدود.' },
  { id: 'ollama', name: 'Ollama على جهازك', kind: 'openai', base: 'http://localhost:11434/v1', key: 'none', local: true, hint: 'شغّل Ollama على جهازك واكتب اسم النموذج الموجود عندك (الأمر ollama list). السياق الافتراضي 4096 صغير على الدروس، فشغّله مع OLLAMA_CONTEXT_LENGTH=8192. وإذا فتحت نَسَق من نطاق أو من ملف، لازم تسمح له بالمتغير OLLAMA_ORIGINS.' },
  { id: 'lmstudio', name: 'LM Studio على جهازك', kind: 'openai', base: 'http://localhost:1234/v1', key: 'none', local: true, hint: 'شغّل الخادم المحلي من LM Studio وفعّل CORS من إعداداته، واكتب اسم النموذج المحمّل عندك.' },
  { id: 'custom', name: 'خادم آخر متوافق مع OpenAI', kind: 'openai', base: '', key: 'opt', hint: 'أي خادم يدعم المسار chat/completions (مثل vLLM أو llama.cpp أو وسيط خاص بك). اكتب العنوان لحد /v1.' },
  { id: 'webllm', name: 'نموذج داخل المتصفح (WebGPU)', kind: 'webllm', key: 'none', local: true, hint: 'يشتغل كله على جهازك بدون إنترنت بعد التحميل الأول، بس يحتاج متصفحاً يدعم WebGPU وذاكرة رسوميات كافية. النماذج الصغيرة ضعيفة بالعربية وبالتزام صيغة JSON، فجرّب مساراً «مختصراً» أول.' }
];
/* نماذج WebLLM المبنية مسبقاً (المعرّفات من حزمة @mlc-ai/web-llm 0.2.85؛ الرقم = ذاكرة GPU التقريبية بالغيغابايت). نتجنب نماذج التفكير لأنها تطيل الرد */
AI.WEB = [
  ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen 2.5 · 1.5B', 1.6], ['Qwen2.5-3B-Instruct-q4f16_1-MLC', 'Qwen 2.5 · 3B', 2.5], ['Qwen2.5-7B-Instruct-q4f16_1-MLC', 'Qwen 2.5 · 7B', 5.1],
  ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Llama 3.2 · 3B', 2.3], ['gemma-2-2b-it-q4f16_1-MLC', 'Gemma 2 · 2B', 1.9], ['Qwen2.5-1.5B-Instruct-q4f32_1-MLC', 'Qwen 2.5 · 1.5B (يعمل على أجهزة أكثر)', 1.9]
];

/* ───── مساعدات الاتصال ───── */
const aiRedact = (t, key) => {
  t = String(t || '').slice(0, 300); if (key && key.length >= 6) t = t.split(key).join('•••');
  return t.replace(/(sk-|sk_|gsk_|AIza|xai-|or-v1-)[A-Za-z0-9_-]{6,}/g, '•••').replace(/\s+/g, ' ').trim();   // لا نعرض أي شي يشبه مفتاحاً
};
function aiStatus(status, text, c) {
  if (status === 403 && AI.local(c)) return 'origin_blocked';
  if (status === 401 || status === 403) return 'auth_failed';
  if (status === 402) return 'quota';
  if (status === 404) return 'model_not_found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 429) return /quota|billing|credit|balance|insufficient/i.test(text) ? 'quota' : 'rate_limited';
  if (status === 400 || status === 413 || status === 422) return 'bad_request';
  return 'upstream_error';
}
/* نصوص التفكير (R1 وأمثالها) ليست جزءاً من الجواب */
const aiPost = t => String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '').trim();

async function aiFetch(url, init, o, c) {
  if (o.signal && o.signal.aborted) throw { code: 'cancelled' };
  const ctl = new AbortController(); let timedOut = false, res, text = '';
  const onAbort = () => ctl.abort();
  if (o.signal) o.signal.addEventListener('abort', onAbort, { once: true });
  const to = setTimeout(() => { timedOut = true; ctl.abort(); }, o.timeout || (AI.local(c) ? 600000 : 180000));
  try {
    res = await fetch(url, Object.assign({}, init, { signal: ctl.signal, cache: 'no-store', referrerPolicy: 'no-referrer' }));
    text = await res.text();
  } catch (e) {
    if (o.signal && o.signal.aborted) throw { code: 'cancelled' };
    throw { code: timedOut ? 'timeout' : 'network' };
  } finally { clearTimeout(to); if (o.signal) o.signal.removeEventListener('abort', onAbort); }
  if (!res.ok) throw { code: aiStatus(res.status, text, c), status: res.status, detail: aiRedact(text, c.key) };
  try { return JSON.parse(text); } catch (e) { throw { code: 'invalid_json' }; }
}
const aiOut = (t, o, why) => {                // يوحّد معالجة النص الراجع من كل الأنواع
  t = aiPost(t);
  if (!t) throw { code: why === 'refused' ? 'refused' : 'empty_completion' };
  if (why === 'length' && o.json) throw { code: 'truncated' };   // رد JSON مقطوع لا يُصلَح
  return t;
};

async function callOpenAI(c, prompt, o) {
  const msgs = []; if (o.json) msgs.push({ role: 'system', content: SYS_JSON }); msgs.push({ role: 'user', content: prompt });
  const body = { model: c.model, messages: msgs }, mx = o.maxTokens || c.max; if (mx) body.max_tokens = mx;
  const headers = { 'Content-Type': 'application/json' }; if (c.key) headers.Authorization = 'Bearer ' + c.key;
  const j = await aiFetch(c.base + '/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) }, o, c);
  const ch = j && j.choices && j.choices[0]; if (!ch) throw { code: 'empty_completion' };
  let t = ch.message && ch.message.content; if (Array.isArray(t)) t = t.map(p => (p && p.text) || '').join('');
  return aiOut(t, o, ch.finish_reason === 'length' ? 'length' : (ch.finish_reason === 'content_filter' ? 'refused' : ''));
}
async function callAnthropic(c, prompt, o) {
  const body = { model: c.model, max_tokens: o.maxTokens || c.max || 4096, messages: [{ role: 'user', content: prompt }] };
  if (o.json) body.system = SYS_JSON;
  const headers = { 'Content-Type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  const j = await aiFetch(c.base + '/messages', { method: 'POST', headers, body: JSON.stringify(body) }, o, c);
  const t = Array.isArray(j && j.content) ? j.content.filter(b => b && b.type === 'text').map(b => b.text || '').join('') : '';
  return aiOut(t, o, j && j.stop_reason === 'max_tokens' ? 'length' : (j && j.stop_reason === 'refusal' ? 'refused' : ''));
}
async function callGemini(c, prompt, o) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {} }, mx = o.maxTokens || c.max;
  if (o.json) { body.systemInstruction = { parts: [{ text: SYS_JSON }] }; body.generationConfig.responseMimeType = 'application/json'; }
  if (mx) body.generationConfig.maxOutputTokens = mx;
  const url = c.base + '/models/' + encodeURIComponent(c.model.replace(/^models\//, '')) + ':generateContent';
  const j = await aiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.key }, body: JSON.stringify(body) }, o, c);
  if (j && j.promptFeedback && j.promptFeedback.blockReason) throw { code: 'refused' };
  const cand = j && j.candidates && j.candidates[0], parts = cand && cand.content && cand.content.parts;
  const t = Array.isArray(parts) ? parts.filter(p => p && !p.thought).map(p => p.text || '').join('') : '';
  const fr = cand && cand.finishReason;
  return aiOut(t, o, fr === 'MAX_TOKENS' ? 'length' : (/SAFETY|BLOCKLIST|PROHIBITED|RECITATION/.test(fr || '') ? 'refused' : ''));
}

/* نموذج داخل المتصفح: تحميل كسول لمكتبة WebLLM من CDN ثم النموذج (يُخزَّن بالمتصفح فيسرع التحميل لاحقاً) */
async function webEngine(c) {
  if (!navigator.gpu) throw { code: 'no_webgpu' };
  const W = AI.web;
  if (W.engine && W.model === c.model) return W.engine;
  if (W.loading && W.want === c.model) return W.loading;
  W.want = c.model; W.p = 0; W.text = 'نبدأ التحميل…';
  const job = (async () => {
    try {
      const mod = await import(WEBLLM_URL);
      if (W.engine) { try { await W.engine.unload(); } catch (e) { } W.engine = null; W.model = ''; }
      const eng = await mod.CreateMLCEngine(c.model, { initProgressCallback: p => { W.p = (p && p.progress) || 0; W.text = (p && p.text) || ''; AI.tick(); } });
      W.engine = eng; W.model = c.model; return eng;
    } catch (e) { throw { code: 'load_failed' }; }
    finally { W.loading = null; W.p = 1; AI.tick(); }
  })();
  W.loading = job; return job;
}
let webQ = Promise.resolve();                       // طلب واحد في الوقت نفسه على المحرّك
const webRun = fn => { const p = webQ.then(fn); webQ = p.then(() => { }, () => { }); return p; };
async function callWeb(c, prompt, o) {
  const eng = await webEngine(c);
  return webRun(async () => {
    if (o.signal && o.signal.aborted) throw { code: 'cancelled' };
    const msgs = []; if (o.json) msgs.push({ role: 'system', content: SYS_JSON }); msgs.push({ role: 'user', content: prompt });
    const stop = () => { try { eng.interruptGenerate(); } catch (e) { } };
    if (o.signal) o.signal.addEventListener('abort', stop, { once: true });
    let r;
    try { r = await eng.chat.completions.create({ messages: msgs, max_tokens: o.maxTokens || c.max || 2048, temperature: 0.4 }); }
    catch (e) { if (o.signal && o.signal.aborted) throw { code: 'cancelled' }; throw { code: 'upstream_error' }; }
    finally { if (o.signal) o.signal.removeEventListener('abort', stop); }
    if (o.signal && o.signal.aborted) throw { code: 'cancelled' };
    const ch = r && r.choices && r.choices[0];
    return aiOut(ch && ch.message && ch.message.content, o, ch && ch.finish_reason === 'length' ? 'length' : '');
  });
}
AI.callCfg = (c, prompt, o) => ({ openai: callOpenAI, anthropic: callAnthropic, gemini: callGemini, webllm: callWeb })[c.kind](c, prompt, o);
/* اختبار اتصال: طلب صغير. لا نحدّد حد رموز إلا حيث يلزم (Anthropic) لأن بعض النماذج ترفضه */
AI.test = (c, o = {}) => AI.callCfg(c, 'ردّ بكلمة واحدة فقط: تمام', Object.assign({ timeout: AI.local(c) ? 90000 : 25000, maxTokens: c.kind === 'anthropic' ? 64 : 0 }, o));

/* يرجع نصاً. o: { json, signal, tier, command, label, payload }. يرفض دائماً بكائن { code } */
AI.ask = async function (prompt, o = {}) {
  const aborted = () => o.signal && o.signal.aborted;
  if (aborted()) throw { code: 'cancelled' };
  const c = AI.cfg();
  if (c) {
    try { return await AI.callCfg(c, prompt, o); }
    catch (e) { throw { code: (e && e.code) || 'upstream_error', detail: e && e.detail }; }
  }
  if (typeof ASSIST !== 'undefined' && ASSIST.provider) {
    let t;
    try { t = await ASSIST.provider(o.payload || { command: o.command || 'generate', question: o.label || '', context: [], prompt, json: !!o.json }); }
    catch (e) { throw { code: (e && e.code) || 'upstream_error' }; }
    if (aborted()) throw { code: 'cancelled' };
    return typeof t === 'string' ? t : JSON.stringify(t);
  }
  if (AI.sample) {
    const opts = { cache: false, modelTier: o.tier || 'default' };
    if (o.signal) opts.signal = o.signal;
    try {
      if (o.json && typeof AI.sample.json === 'function') {
        try { return JSON.stringify(await AI.sample.json(prompt, opts)); }
        catch (e) { if (e && e.code === 'invalid_json' && e.text) return e.text; throw e; }
      }
      return (await AI.sample(prompt, opts)).text;
    } catch (e) { throw { code: (e && e.code) || 'upstream_error' }; }
  }
  throw { code: 'unavailable' };
};

/* أخطاء لا فائدة من تكرار الطلب بعدها: نوقف البناء ونخبر المستخدم */
AI.FATAL = new Set(['not_granted', 'sampling_disabled', 'capability_disabled', 'capability_removed', 'not_declared', 'session_expired', 'rate_limited', 'unavailable',
  'auth_failed', 'model_not_found', 'network', 'quota', 'origin_blocked', 'no_webgpu', 'load_failed']);
AI.errText = code => ({
  unavailable: 'ما اكو خدمة ذكاء اصطناعي مربوطة بنَسَق هنا. أضف نموذجاً من الإعدادات.',
  not_granted: 'ما سمحت لنَسَق يستخدم Claude بهالجلسة. افتح الصفحة من جديد واسمح له إذا تريد.',
  sampling_disabled: 'Claude غير متاح لحسابك أو مؤسستك هنا.',
  capability_disabled: 'Claude غير متاح لحسابك أو مؤسستك هنا.',
  capability_removed: 'نسخة التطبيق عندك قديمة وما تدعم هالميزة. حدّثها وجرّب.',
  not_declared: 'هالصفحة ما عندها إذن استخدام Claude.',
  session_expired: 'انتهت جلستك. سجّل دخول من جديد وكمّل البناء.',
  rate_limited: 'وصلت حد الاستخدام أو الطلبات كثيرة. انتظر شوية وكمّل البناء.',
  invalid_json: 'الرد ما جا بصيغة سليمة. جرّب مرة ثانية.',
  too_short: 'الرد كان قصير ومو كافي كدرس. جرّب مرة ثانية.',
  too_small: 'الرد طلع صغير أو ناقص. جرّب مرة ثانية.',
  empty_completion: 'ما رجع شي من الخدمة. جرّب مرة ثانية.',
  refused: 'الخدمة رفضت هذا الطلب. غيّر اسم المسار أو تفاصيله وجرّب.',
  repeated: 'تكرر الفشل فأوقفنا البناء حتى ما نصرف استخدامك على الفاضي. جرّب بعد شوية.',
  auth_failed: 'المزوّد رفض المفتاح. تأكد أنه صحيح وفعّال، وعدّله من الإعدادات.',
  model_not_found: 'ما لكيت النموذج أو العنوان عند المزوّد. راجع اسم النموذج وعنوان الخدمة في الإعدادات.',
  quota: 'رصيدك عند المزوّد خلص أو غير كافٍ. راجع حسابك عندهم.',
  bad_request: 'المزوّد رفض الطلب. غالباً السبب اسم النموذج أو حد الرموز. راجع إعدادات النموذج وجرّب.',
  timeout: 'تأخر الرد كثيراً. النموذج البطيء يحتاج مساراً أقصر أو نموذجاً أسرع.',
  truncated: 'انقطع الرد قبل ما يكتمل لأنه وصل حد الرموز. ارفع «الحد الأقصى للرموز» من إعدادات النموذج وجرّب.',
  origin_blocked: 'الخادم المحلي رفض الاتصال من هالصفحة (CORS). مثلاً Ollama: شغّله مع OLLAMA_ORIGINS يسمح بعنوان صفحتك.',
  no_webgpu: 'جهازك أو متصفحك ما يدعم WebGPU اللازم للنماذج داخل المتصفح.',
  load_failed: 'فشل تحميل النموذج المحلي. تأكد من الإنترنت ومساحة التخزين، أو جرّب نموذجاً أصغر. وإذا الصفحة داخل منصة عرض فالتحميل الخارجي محجوب هناك.',
  network: IN_VIEWER ? 'تعذّر الاتصال. منصة العرض اللي تفتح فيها الصفحة تحجب الاتصال بأي موقع خارجها، فالنماذج الخارجية والمحلية ما تشتغل هنا. افتح نَسَق كملف مستقل أو على استضافتك.'
    : 'تعذّر الاتصال بالخدمة. تأكد من العنوان والإنترنت، وإذا الخدمة على جهازك تأكد أنها شغّالة وتسمح بالاتصال من هالصفحة (CORS).'
})[code] || 'صار خلل مؤقت بالاتصال. جرّب مرة ثانية.';
