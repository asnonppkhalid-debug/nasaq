/* ═══ الإقلاع ═══ */
window.NASAQ = {
  version: '0.3.2',
  /* ربط مساعد حقيقي لاحقاً: دالة تستقبل { command, question, context, prompt } وتعيد نصاً */
  setAssistantProvider(fn) { ASSIST.provider = typeof fn === 'function' ? fn : null; },
  srs: SRS
};
(function boot() {
  const root = document.documentElement;
  root.setAttribute('lang', 'ar'); root.setAttribute('dir', 'rtl');
  loadState(); aiLoad(); indexCatalog(); indexUserCourses(); applyTheme();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  render(false);
})();
