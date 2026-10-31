/* ═══ المراجعة المتباعدة: خوارزمية بسيطة على نمط SM-2 ═══
   التقييم: 0 ما عرفتها · 1 صعبة · 2 تمام · 3 سهلة
   - ما عرفتها: تعود بعد ١٠ دقائق، وتُصفَّر سلسلة النجاح، ويقلّ معامل السهولة.
   - صعبة: تُزاد الفترة بنسبة ١٫٢ (يوم على الأقل) ويقلّ المعامل قليلاً.
   - تمام: ١ يوم ثم ٣ أيام ثم الفترة × المعامل.
   - سهلة: ٣ أيام ثم الفترة × المعامل × ١٫٣، ويزيد المعامل. */
const SRS = {
  GRADES: [
    { g: 0, name: 'ما عرفتها', key: '1' },
    { g: 1, name: 'صعبة', key: '2' },
    { g: 2, name: 'تمام', key: '3' },
    { g: 3, name: 'سهلة', key: '4' }
  ],
  fresh() { return { reps: 0, lapses: 0, ease: 2.5, interval: 0, due: now(), last: 0 }; },
  /* يعيد الحالة الجديدة للبطاقة بعد التقييم g. t = لحظة المراجعة */
  next(card, g, t) {
    t = t || now();
    let reps = card.reps || 0, lapses = card.lapses || 0, ease = card.ease || 2.5, prev = card.interval || 0, iv;
    if (g === 0) {
      return { reps: 0, lapses: lapses + 1, ease: Math.max(1.3, +(ease - 0.2).toFixed(2)), interval: 0, due: t + 10 * 60e3, last: t };
    }
    if (g === 1) {
      ease = Math.max(1.3, ease - 0.15); reps = Math.max(reps, 1);
      iv = Math.max(1, Math.round((prev || 1) * 1.2));
    } else if (g === 2) {
      reps += 1;
      iv = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(prev * ease);
    } else {
      reps += 1; ease += 0.15;
      iv = reps === 1 ? 3 : Math.round(Math.max(prev, 1) * ease * 1.3);
    }
    if (g >= 2) iv = Math.max(iv, Math.floor(prev) + 1);
    iv = Math.min(365, iv);
    return { reps, lapses, ease: +ease.toFixed(2), interval: iv, due: t + iv * DAY, last: t };
  },
  /* الفترة (بالأيام) التي ستنتج عن كل تقييم، لعرضها على الأزرار */
  preview(card) {
    return [0, 1, 2, 3].map(g => { const n = SRS.next(card, g, 0); return g === 0 ? 10 / 1440 : n.interval; });
  }
};
if (typeof module !== 'undefined') module.exports = { SRS };
