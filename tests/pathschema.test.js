// اختبار محقّق المسارات المولَّدة: node tests/pathschema.test.js
const fs = require('fs');
const { PS } = new Function(fs.readFileSync('src/js/24-pathschema.js', 'utf8') + '\nreturn { PS };')();
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' → ' + JSON.stringify(a));

// extractJSON
eq(PS.extractJSON('{"a":1}'), { a: 1 }, 'plain json');
eq(PS.extractJSON('تفضل:\n```json\n{"a":1,}\n```\nانتهى'), { a: 1 }, 'fence + trailing comma');
eq(PS.extractJSON('هذا الرد: {"a":[1,2,]} شكراً'), { a: [1, 2] }, 'prose around + trailing comma');
eq(PS.extractJSON('لا شيء هنا'), null, 'no json');
eq(PS.extractJSON(''), null, 'empty'); eq(PS.extractJSON(null), null, 'null');

// clean
eq(PS.clean('  مرحبا   \n بك  ', 50), 'مرحبا بك', 'collapse ws');
eq(PS.clean('انظر [[spaced-repetition|التكرار المتباعد]] و[[x]]', 80), 'انظر التكرار المتباعد وx', 'strip internal links');
eq(PS.clean('a‮b\u0007c', 10), 'abc', 'strip bidi override + control');
eq(PS.clean('x'.repeat(30), 10), 'x'.repeat(10) + '…', 'truncate');
eq(PS.clean({}, 10), '', 'non-string');
eq(PS.clean('<img src=x onerror=alert(1)>', 60), '<img src=x onerror=alert(1)>', 'html kept as text (escaped at render)');

// blocks
const lorem = Array(60).fill('كلمة').join(' ');
eq(PS.blocks([['p', 'a'], ['evil', 'x'], ['ul', ['1', '', '2']], ['ol', 'a\nb'], ['note', 5], 'bad', ['h']]),
  [['p', 'a'], ['ul', ['1', '2']], ['ol', ['a', 'b']], ['note', '5']], 'block filtering');
eq(PS.blocks([{ type: 'p', text: 'نص' }, { type: 'ul', items: ['x'] }]), [['p', 'نص'], ['ul', ['x']]], 'object blocks tolerated');
eq(PS.blocks([['code', 'print(1)\n\nprint(2)\n']]), [['code', 'print(1)\n\nprint(2)']], 'code keeps newlines');
ok(PS.blocks(Array(200).fill(['p', 'x'])).length === 60, 'cap 60 blocks');
ok(PS.blocks([['ul', Array(50).fill('x')]])[0][1].length === 14, 'cap 14 items');
eq(PS.blocks('nope'), [], 'non-array');

// cards
eq(PS.cards([['س', 'ج'], { q: 'a', a: 'b' }, ['فقط سؤال'], ['', 'x']]), [['س', 'ج'], ['a', 'b']], 'cards');
ok(PS.cards(Array(30).fill(['q', 'a'])).length === 8, 'cap 8 cards');

// lesson
const good = JSON.stringify({ blocks: [['p', lorem], ['h', 'قسم'], ['p', lorem], ['note', 'فكرة']], cards: [['س', 'ج']] });
const L = PS.lesson(good); ok(!L.err && L.blocks.length === 4 && L.cards.length === 1 && L.min >= 3, 'good lesson');
eq(PS.lesson('{"blocks":[["p","قصير"]]}').err, 'too_short', 'too short');
eq(PS.lesson('مو json').err, 'invalid_json', 'lesson invalid');
ok(!PS.lesson('```json\n' + good + '\n```').err, 'lesson in fence');

// outline
const mk = (u, per) => ({ sub: 'فرعي', desc: 'وصف', units: Array.from({ length: u }, (_, i) => ({ t: 'مرحلة ' + i, goal: 'هدف', lessons: Array.from({ length: per }, (_, j) => ({ t: `درس ${i}-${j}`, brief: 'ملخص', min: 6 })) })) });
let O = PS.outline(JSON.stringify(mk(4, 3)), 12); ok(!O.err && O.data.units.length === 4, 'outline ok');
O = PS.outline(JSON.stringify(mk(4, 9)), 8);
const total = O.data.units.reduce((s, u) => s + u.lessons.length, 0);
ok(total <= 14 && O.data.units.length === 4 && O.data.units.every(u => u.lessons.length >= 3), 'cap keeps all stages (total ' + total + ')');
eq(PS.outline(JSON.stringify(mk(1, 6)), 8).err, 'too_small', 'one unit too small');
eq(PS.outline('{"units":"x"}', 8).err, 'invalid_json', 'units not array');
O = PS.outline(JSON.stringify({ units: [{ title: 'أ', lessons: [{ title: 'د1', summary: 's' }, { title: 'د2' }] }, { name: 'ب', lessons: [{ t: 'د3' }, { t: 'د4' }] }] }), 8);
ok(!O.err && O.data.units[0].t === 'أ' && O.data.units[0].lessons[0].brief === 's', 'alias keys tolerated');

// normCourse
eq(PS.normCourse(null), null, 'null course'); eq(PS.normCourse({ id: 'a b', title: 'x' }), null, 'bad id');
eq(PS.normCourse({ id: 'ai-123', title: '  ' }), null, 'empty title');
const c = PS.normCourse({ id: 'ai-123', title: 'بايثون', d: 'zzz', created: 5, spec: { size: 'q' }, units: [{ t: 'تأسيس', lessons: [
  { id: 'ai-123-1', t: 'أ', blocks: [['p', 'x']], ok: false }, { id: 'ltl-1', t: 'ب' }, { id: 'ai-123-1', t: 'ج', err: 'rate_limited' }, { t: '', blocks: [] }] }, 'junk', { t: 'فارغة', lessons: [] }] });
ok(c && c.user && PS.PAL.includes(c.d) && c.spec.size === 'm', 'course basics');
ok(c.units.length === 1 && c.units[0].lessons.length === 3, 'junk units/lessons dropped');
const ids = c.units[0].lessons.map(l => l.id); ok(new Set(ids).size === 3 && ids.every(i => i.startsWith('ai-123-')), 'unique ids ' + ids);
ok(c.units[0].lessons[0].ok === true && c.units[0].lessons[1].ok === false && c.units[0].lessons[2].err === 'rate_limited', 'ok derived from blocks, err kept');
ok(PS.colorFor('ai-123') === PS.colorFor('ai-123'), 'color stable');
// مصادر مقترحة: لا روابط من النموذج أبداً، وتطبيع الأنواع، وإزالة التكرار
let R = PS.resources([
  { k: 'book', t: 'كتاب أ', by: 'مؤلف', why: 'سبب' }, { type: 'Youtube', title: 'سلسلة ب', channel: 'قناة' },
  { k: 'course', t: 'دورة ج' }, { k: 'website', t: 'توثيق د' }, { k: 'book', t: 'كتاب  أ' },            // مكرّر
  { k: 'book', t: 'https://evil.example/x' }, { k: 'book', t: 'www.evil.example' }, { k: 'book', t: 'x' }, { k: 'video' }, 'junk', null,
  ['video', 'من مصفوفة', 'قناة ه', 'لأنه']
], 10);
eq(R.map(r => r.k), ['book', 'video', 'course', 'site', 'video'], 'kinds normalized, duplicates/urls/junk dropped');
eq(R[1].by, 'قناة', 'channel → by'); eq(R[4].t, 'من مصفوفة', 'array form accepted');
ok(R.every(r => !('url' in r) && !('href' in r) && !('link' in r)), 'no url fields survive');
eq(PS.resources([{ k: 'book', t: 'a'.repeat(300), by: 'b'.repeat(300), why: 'w'.repeat(500) }], 5).map(r => [r[0], r.t.length, r.by.length, r.why.length])[0], [undefined, 121, 81, 221], 'length caps (with ellipsis)');
eq(PS.resources(Array.from({ length: 40 }, (_, i) => ({ k: 'book', t: 'كتاب ' + i })), 3).length, 3, 'max respected');
eq(PS.resources('ليس json', 5), [], 'garbage → []'); eq(PS.resources({ res: [{ k: 'book', t: 'ع' + 'ن' }] }, 5).length, 1, 'object with res key');
eq(PS.resources([{ t: '<img src=x onerror=alert(1)>', k: 'book' }], 5)[0].t, '<img src=x onerror=alert(1)>', 'html kept as text (escaped at render)');
eq(PS.resources([{ t: 'انظر [[x|رابط داخلي]]', k: 'book' }], 5)[0].t, 'انظر رابط داخلي', 'internal links stripped');
// الدرس يحمل refs، والمخطط يحمل res
const lor2 = lorem + ' ' + lorem;
let Ls = PS.lesson({ blocks: [['p', lor2], ['h', 'ع'], ['p', 'ن'], ['p', 'ن']], cards: [], refs: [{ k: 'book', t: 'كتاب' }, { k: 'video', t: 'فيديو' }, { k: 'site', t: 'موقع' }, { k: 'site', t: 'زائد' }] });
ok(!Ls.err && Ls.refs.length === 3, 'lesson keeps up to 3 refs');
const L0 = PS.lesson({ blocks: [['p', lor2], ['h', 'ع'], ['p', 'ن'], ['p', 'ن']] });
ok(!L0.err && L0.refs.length === 0, 'lesson without refs OK');
let O2 = PS.outline(JSON.stringify({ units: [{ t: 'أ', lessons: [{ t: 'د1' }, { t: 'د2' }] }, { t: 'ب', lessons: [{ t: 'د3' }, { t: 'د4' }] }], res: [{ k: 'book', t: 'كتاب' }, { k: 'video', t: 'فيديو' }] }), 8);
ok(!O2.err && O2.data.res.length === 2, 'outline carries res');
ok(PS.outline(JSON.stringify({ units: [{ t: 'أ', lessons: [{ t: 'د1' }, { t: 'د2' }] }, { t: 'ب', lessons: [{ t: 'د3' }, { t: 'د4' }] }] }), 8).data.res.length === 0, 'outline without res OK');
eq(PS.resOnly('{"res":[{"k":"book","t":"ع1"}]}').err, 'too_small', 'one resource is too few');
ok(PS.resOnly('```json\n{"res":[{"k":"book","t":"ع1"},{"k":"video","t":"ع2"}]}\n```').res.length === 2, 'resOnly parses fenced json');
eq(PS.resOnly('x').err, 'invalid_json', 'resOnly invalid');
const cr = PS.normCourse({ id: 'ai-9', title: 'م', res: [{ k: 'book', t: 'كتاب', url: 'https://evil' }, { k: 'x', t: 'https://evil' }], units: [{ t: 'أ', lessons: [{ t: 'د', blocks: [['p', 'x']], refs: [{ k: 'video', t: 'ف' + 'ي' }, 5] }] }] });
ok(cr.res.length === 1 && !('url' in cr.res[0]) && cr.units[0].lessons[0].refs.length === 1, 'normCourse sanitizes res/refs');
console.log(fail ? `\n${fail} من ${n} فشلت` : `all passed (${n})`); process.exit(fail ? 1 : 0);
