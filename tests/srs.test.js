// اختبار خوارزمية المراجعة: node tests/srs.test.js
const fs = require('fs');
const code = fs.readFileSync('src/js/00-util.js', 'utf8') + fs.readFileSync('src/js/21-srs.js', 'utf8') + '\nreturn SRS;';
const SRS = new Function(code)();
const T = 1e12, DAY = 864e5; let fail = 0;
const eq = (name, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) fail++; console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
let c = { reps: 0, lapses: 0, ease: 2.5, interval: 0 };
// تمام × 4 : 1, 3, 8, 20 (≈ 3*2.5=7.5→8, 8*2.5=20)
const seq = []; for (let i = 0; i < 4; i++) { const n = SRS.next(c, 2, T); seq.push(n.interval); c = n; }
eq('good sequence', seq, [1, 3, 8, 20]);
// ما عرفتها: ترجع بعد 10 دقائق وتصفّر السلسلة وتزيد lapses
let a = SRS.next(c, 0, T);
eq('again interval', [a.interval, a.reps, a.lapses, a.due - T], [0, 0, 1, 600000]);
eq('again ease drops', a.ease, 2.3);
// بعد النسيان ثم تمام: يوم واحد
eq('good after again', SRS.next(a, 2, T).interval, 1);
// سهلة لبطاقة جديدة: 3 أيام ويزيد المعامل
let e = SRS.next({ reps: 0, lapses: 0, ease: 2.5, interval: 0 }, 3, T);
eq('easy new', [e.interval, e.ease], [3, 2.65]);
// صعبة: لا تنقص عن يوم، ويقل المعامل ولا يقل عن 1.3
let h = SRS.next({ reps: 0, lapses: 0, ease: 2.5, interval: 0 }, 1, T);
eq('hard new', [h.interval, h.ease], [1, 2.35]);
let low = { reps: 3, lapses: 5, ease: 1.3, interval: 10 };
eq('ease floor', SRS.next(low, 0, T).ease, 1.3);
eq('ease floor hard', SRS.next(low, 1, T).ease, 1.3);
// الفترة لا تتجاوز 365
eq('cap 365', SRS.next({ reps: 9, lapses: 0, ease: 3, interval: 300 }, 3, T).interval, 365);
// التقييم الأعلى لا يعطي فترة أقصر
const p = SRS.preview({ reps: 2, lapses: 0, ease: 2.5, interval: 3 });
eq('preview monotonic', p[1] <= p[2] && p[2] <= p[3] && p[0] < p[1], true);
eq('due uses interval', SRS.next({ reps: 1, lapses: 0, ease: 2.5, interval: 1 }, 2, T).due, T + 3 * DAY);
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0);
