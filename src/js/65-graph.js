/* ═══ شبكة المعرفة: العقد والروابط التي صنعها المستخدم فقط ═══ */
const GR = { view: null, sel: null };
const grView = () => GR.view || (innerWidth < 700 ? 'list' : 'map');

function graphData() {
  const map = new Map(), edges = [];
  const add = r => { const x = resolve(r); if (!x) return null; x.key = x.kind + ':' + x.id; if (!map.has(x.key)) map.set(x.key, x); return map.get(x.key); };
  S.notes.forEach(n => add({ kind: 'note', id: n.id }));
  Object.keys(S.saved).forEach(id => add({ kind: 'topic', id }));
  S.links.forEach(l => { const a = add(l.a), b = add(l.b); if (a && b) edges.push({ id: l.id, a: a.key, b: b.key, label: l.label }); });
  const deg = new Map(); edges.forEach(e => { deg.set(e.a, (deg.get(e.a) || 0) + 1); deg.set(e.b, (deg.get(e.b) || 0) + 1); });
  const nodes = [...map.values()]; nodes.forEach(n => { n.deg = deg.get(n.key) || 0; });
  return { nodes, edges };
}

/* توزيع بسيط بالقوى: تنافر بين العقد وشدّ على الروابط. حتمي (بلا عشوائية) فتبقى الخريطة ثابتة. */
function forceLayout(nodes, edges, W, H) {
  const n = nodes.length; if (!n) return;
  nodes.forEach((p, i) => { const a = i / n * Math.PI * 2; p.x = W / 2 + Math.cos(a) * W * .3; p.y = H / 2 + Math.sin(a) * H * .3; p.vx = 0; p.vy = 0; });
  const by = new Map(nodes.map(p => [p.key, p]));
  for (let it = 0; it < 260; it++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y; if (!dx && !dy) { dx = .5; dy = .5; }
      const d2 = Math.max(dx * dx + dy * dy, 60), d = Math.sqrt(d2), f = 14000 / d2;
      a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
    }
    edges.forEach(e => {
      const a = by.get(e.a), b = by.get(e.b), dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 150) * .03;
      a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
    });
    nodes.forEach(p => {
      p.vx += (W / 2 - p.x) * .012; p.vy += (H / 2 - p.y) * .012;
      p.x = Math.max(80, Math.min(W - 80, p.x + p.vx)); p.y = Math.max(44, Math.min(H - 54, p.y + p.vy)); p.vx *= .82; p.vy *= .82;
    });
  }
}

function graphSVG(g) {
  const W = 800, H1 = 460, conn = g.nodes.filter(n => n.deg), iso = g.nodes.filter(n => !n.deg);
  const per = 6, rows = Math.ceil(iso.length / per), H = H1 + (iso.length ? rows * 78 + 46 : 0);
  forceLayout(conn, g.edges, W, H1);
  iso.forEach((n, i) => { const row = Math.floor(i / per), inRow = Math.min(per, iso.length - row * per), gap = (W - 160) / (per - 1); n.x = W / 2 + ((inRow - 1) / 2 - (i % per)) * gap; n.y = H1 + 62 + row * 78; });  // صف متوسّط، الأول من اليمين
  const by = new Map(g.nodes.map(n => [n.key, n]));
  const edges = g.edges.map(e => {
    const a = by.get(e.a), b = by.get(e.b), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    const cx = mx - dy / d * 22, cy = my + dx / d * 22, lx = .25 * a.x + .5 * cx + .25 * b.x, ly = .25 * a.y + .5 * cy + .25 * b.y;
    return `<path class="ge" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}"/>${e.label ? `<text class="gl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${esc(excerpt(e.label, 16))}</text>` : ''}`;
  }).join('');
  const nodes = g.nodes.map(n => {
    const r = 15 + Math.min(n.deg, 4) * 2.5;
    return `<g class="gn${GR.sel === n.key ? ' sel' : ''}${n.deg ? '' : ' lone'}" tabindex="0" role="button" data-act="gr-sel" data-key="${esc(n.key)}" aria-label="${esc(n.label + ': ' + n.title)}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r}" fill="${n.color}"/><text x="${n.x.toFixed(1)}" y="${(n.y + r + 18).toFixed(1)}" text-anchor="middle">${esc(excerpt(n.title, 20))}</text></g>`;
  }).join('');
  const sep = iso.length ? `<line class="gsep" x1="40" x2="${W - 40}" y1="${H1 + 10}" y2="${H1 + 10}"/><text class="gcap" x="${W / 2}" y="${H1 + 34}" text-anchor="middle">غير مربوطة بعد</text>` : '';
  return `<div class="gmap"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="خريطة شبكة المعرفة">${sep}${edges}${nodes}</svg></div>`;
}

function graphList(g) {
  const by = new Map(g.nodes.map(n => [n.key, n])), iso = g.nodes.filter(n => !n.deg);
  const chain = e => { const a = by.get(e.a), b = by.get(e.b); return `<li class="chain"><a href="#${a.route}">${bead(a.color)}<b dir="auto">${esc(a.title)}</b></a><span class="rel-l" dir="auto">${esc(e.label || 'مرتبط بـ')}</span><a href="#${b.route}">${bead(b.color)}<b dir="auto">${esc(b.title)}</b></a><button class="tbtn sm" data-act="link-del" data-id="${e.id}" aria-label="حذف الرابط">${ic('x')}</button></li>`; };
  return (g.edges.length ? `<ul class="chains">${g.edges.map(chain).join('')}</ul>` : '')
    + (iso.length ? `<section class="blk-s"><h3>غير مربوطة بعد</h3><div class="chips">${iso.map(n => `<a class="chip link" href="#${n.route}" style="--b:${n.color}"><i></i><span dir="auto">${esc(excerpt(n.title, 28))}</span></a>`).join('')}</div></section>` : '');
}

function graphDetail(g) {
  const n = g.nodes.find(x => x.key === GR.sel);
  if (!n) return '';
  const ls = linksOf({ kind: n.kind, id: n.id });
  return `<section class="gdetail" style="--b:${n.color}"><div class="row between"><div><span class="eyebrow">${bead(n.color)} ${n.label}</span><h3 dir="auto">${esc(n.title)}</h3></div><button class="tbtn sm" data-act="gr-sel" data-key="" aria-label="إغلاق التفاصيل">${ic('x')}</button></div>
    ${ls.length ? `<ul class="nrows">${ls.map(x => `<li><a href="#${x.other.route}">${bead(x.other.color)}<span><b dir="auto">${esc(x.other.title)}</b><small class="muted" dir="auto">${x.link.label ? esc(x.link.label) : 'مرتبط'}</small></span></a></li>`).join('')}</ul>` : '<p class="muted">ما اكو روابط على هالعقدة بعد.</p>'}
    <div class="row"><a class="btn primary" href="#${n.route}">فتح ${ic('next')}</a><button class="btn" data-act="link-new" data-k="${n.kind}" data-i="${esc(n.id)}">${ic('link')} اربطه بفكرة</button></div></section>`;
}

V.graph = {
  html() {
    const g = graphData(), v = grView();
    const head = phead('شبكة المعرفة', 'الأفكار التي ربطتها بنفسك', 'لا يظهر هنا رابط إلا إذا أنشأته أنت، فالخريطة تعكس تفكيرك لا تخمين الجهاز.');
    if (!g.nodes.length) return head + empty('think', 'الشبكة فاضية', pick(LINES.graphEmpty, 'ge') + ' ابدأ بتدوين فكرتين.', `<button class="btn primary" data-act="new-note">${ic('plus')} دوّن فكرة</button><a class="btn" href="#wiki">احفظ موضوعاً من الموسوعة</a>`);
    const bar = `<div class="row between"><div class="seg tabs" role="group" aria-label="طريقة العرض"><button class="seg-b${v === 'map' ? ' on' : ''}" data-act="gr-view" data-v="map" aria-pressed="${v === 'map'}">${ic('graph')} خريطة</button><button class="seg-b${v === 'list' ? ' on' : ''}" data-act="gr-view" data-v="list" aria-pressed="${v === 'list'}">${ic('list')} قائمة</button></div>
      <button class="btn primary" data-act="link-new">${ic('link')} ربط فكرتين</button></div>`;
    const hint = !g.edges.length ? `<div class="empty-in">${buddy('curious', pick(LINES.graphEmpty, 'ge2'), { essential: true })}</div>` : '';
    return head + bar + hint + (v === 'map' ? graphSVG(g) + (GR.sel ? graphDetail(g) : `<p class="muted small center">اختر عقدة لتشوف روابطها وتفتح محتواها.${innerWidth < 700 ? ' اسحب الخريطة جانبياً لتشوف باقي العقد.' : ''}</p>`) : graphList(g));
  }
};
V.graph.mount = () => {
  const m = $('.gmap'); if (!m) return;
  const span = () => m.scrollWidth - m.clientWidth, sign = getComputedStyle(m).direction === 'rtl' ? -1 : 1;
  m.scrollLeft = sign * (GR.pan == null ? .5 : GR.pan) * span();   // تبدأ متوسّطة، ثم تتذكّر مكان السحب
  m.addEventListener('scroll', () => { const sp = span(); if (sp > 0) GR.pan = Math.min(1, Math.abs(m.scrollLeft) / sp); }, { passive: true });
};
A['gr-view'] = d => { GR.view = d.v; rerender(); };
A['gr-sel'] = d => { GR.sel = d.key || null; rerender(); const el = d.key && $(`.gn[data-key="${CSS.escape(d.key)}"]`); if (el) el.focus({ preventScroll: true }); };
