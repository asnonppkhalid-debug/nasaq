/* ═══ مساحة التقدم: أرقام من نشاطك الفعلي فقط ═══ */
function reviewDays(n) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const out = []; for (let i = n - 1; i >= 0; i--) out.push({ t: t0.getTime() - i * DAY, n: 0 });
  S.reviews.forEach(r => { const d = new Date(r.t); d.setHours(0, 0, 0, 0); const b = out.find(x => x.t === d.getTime()); if (b) b.n++; });
  return out;
}
const activeDays = () => new Set(S.reviews.map(r => { const d = new Date(r.t); d.setHours(0, 0, 0, 0); return d.getTime(); })).size;

function reviewChart(days) {
  const W = 560, H = 176, pl = 38, pr = 8, pt = 12, pb = 28, max = Math.max(...days.map(d => d.n), 1), top = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const bw = (W - pl - pr) / days.length, ch = H - pt - pb, y = v => pt + ch - v / top * ch;
  const bars = days.map((d, i) => {
    const x = W - pr - (i + 1) * bw + bw * .2, h = d.n / top * ch, today = i === days.length - 1, dd = new Date(d.t).getDate();
    return `<rect class="cb${today ? ' today' : ''}" x="${x.toFixed(1)}" y="${(pt + ch - h).toFixed(1)}" width="${(bw * .6).toFixed(1)}" height="${Math.max(h, d.n ? 2 : 0).toFixed(1)}" rx="3"><title>${fmtDate(d.t)}: ${d.n}</title></rect>`
      + (i % 2 === days.length % 2 || today ? `<text x="${(x + bw * .3).toFixed(1)}" y="${H - 8}" text-anchor="middle"${today ? ' class="b"' : ''}>${dd}</text>` : '');
  }).join('');
  return `<svg class="cx" viewBox="0 0 ${W} ${H}" role="img" aria-label="عدد المراجعات في كل يوم خلال آخر ${days.length} يوماً">
    <line class="cg" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/><line class="cg" x1="${pl}" x2="${W - pr}" y1="${y(top)}" y2="${y(top)}"/>
    <text x="${pl - 8}" y="${y(0) + 4}" text-anchor="end">0</text><text x="${pl - 8}" y="${y(top) + 4}" text-anchor="end">${top}</text>${bars}</svg>`;
}

V.progress = {
  html() {
    const vl = visibleLessons().filter(lessonReady), doneL = vl.filter(l => lessonDone(l.id)).length, totalL = vl.length;
    const solid = S.cards.filter(c => (c.interval || 0) >= 21).length, savedT = Object.keys(S.saved).length;
    const rows = [[doneL, `من ${num(totalL)} درساً مكتملاً`], [S.reviews.length, 'مراجعة نفّذتها'], [S.cards.length, 'بطاقة في مراجعتك'], [solid, 'بطاقة ثابتة (فترتها ٢١ يوماً أو أكثر)'], [S.notes.length, 'عنصراً في مكتبتك'], [savedT, 'موضوعاً محفوظاً من الموسوعة'], [S.links.length, 'رابطاً بين أفكارك']].filter(r => r[0] > 0);
    const head = phead('التقدّم', 'ما أنجزته فعلاً', 'كل رقم هنا مأخوذ من نشاطك، ولا يوجد شيء مصطنع.');
    if (!rows.length && !S.activity.length) return head + empty('calm', 'ما اكو شي نعرضه بعد', 'أكمل درساً أو دوّن فكرة أو راجع بطاقة، وهنا يبين تقدّمك الحقيقي.', '<a class="btn primary" href="#academy">ابدأ درساً</a><button class="btn" data-act="new-note">دوّن فكرة</button>');
    const days = reviewDays(14), enough = activeDays() >= 2;
    const cs = visibleCourses().filter(c => courseDone(c) > 0);
    return head + `<div class="prog">
      <section><h2>الحصيلة</h2><dl class="ledger">${rows.map(r => `<div><dt>${r[1]}</dt><dd class="num">${num(r[0])}</dd></div>`).join('')}</dl>
        ${cs.length ? `<h3>المسارات</h3><ul class="plist">${cs.map(c => `<li><a href="#course-${c.id}">${bead(dcol(c.d))}<span><b>${esc(c.title)}</b><ol class="${lbeadsCls(c.lessons.length)}">${c.lessons.map(l => `<li class="${lessonDone(l.id) ? 'on' : ''}"></li>`).join('')}</ol></span></a></li>`).join('')}</ul>` : ''}</section>
      <section><h2>المراجعات في آخر ١٤ يوماً</h2>${enough ? reviewChart(days) : '<p class="muted">يحتاج الرسم لمراجعات في يومين مختلفين على الأقل. كمّل مراجعتك وراح يظهر هنا.</p>'}
        <h2>آخر الأنشطة</h2>${S.activity.length ? `<ul class="acts">${S.activity.slice(0, 10).map(a => `<li>${a.route ? `<a href="#${a.route}">${esc(a.label)}</a>` : esc(a.label)}<time class="muted">${rel(a.t)}</time></li>`).join('')}</ul>` : '<p class="muted">ما سجّلنا أنشطة بعد.</p>'}
        <p class="muted small">${S.backup.last ? 'آخر نسخة احتياطية: ' + rel(S.backup.last) + '.' : 'ما أخذت نسخة احتياطية بعد.'} <a href="#prefs">النسخ الاحتياطي</a></p></section></div>`;
  }
};
