/* ---------- shared theme toggle ----------
   Two states: Light and Dark. Until the visitor picks one, the page follows
   the OS preference and the button shows whichever theme is in effect.
   Anti-FOUC application of the saved theme happens via a tiny inline
   <script> in <head> on each page (must run before stylesheet).
   This file wires up the toggle button, persists the choice in
   localStorage under "theme", and announces changes via aria-live.
-----------------------------------------------*/
(function () {
  var STORAGE_KEY = 'theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function readStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) { return null; }
  }
  function current() {
    return readStored() || (mq && mq.matches ? 'dark' : 'light');
  }
  function writeStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function withTransition(fn) {
    if (reducedMotion()) { fn(); return; }
    root.classList.add('is-theme-changing');
    fn();
    // Match the 180ms transition + a small buffer
    window.setTimeout(function () {
      root.classList.remove('is-theme-changing');
    }, 220);
  }

  function init() {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;

    var live = document.querySelector('[data-theme-live]');

    function refresh() {
      var theme = current();
      var next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('data-theme-state', theme);
      btn.setAttribute('aria-label', 'Theme: ' + theme + '. Switch to ' + next + ' mode.');
      btn.setAttribute('title', 'Switch to ' + next + ' mode');
    }

    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      writeStored(next);
      withTransition(function () { applyTheme(next); });
      refresh();
      if (live) live.textContent = 'Theme set to ' + next + ' mode';
    });

    // Until a choice is saved, follow OS changes (CSS swaps via media query).
    if (mq) {
      var mqHandler = function () { if (!readStored()) refresh(); };
      if (mq.addEventListener) mq.addEventListener('change', mqHandler);
      else if (mq.addListener) mq.addListener(mqHandler);
    }

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
