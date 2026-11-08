/* ---------- shared theme toggle ----------
   Tri-state cycle: System → Light → Dark → System.
   Anti-FOUC application of the saved theme happens via a tiny inline
   <script> in <head> on each page (must run before stylesheet).
   This file wires up the toggle button, persists the choice in
   localStorage under "theme", and announces changes via aria-live.
-----------------------------------------------*/
(function () {
  var STORAGE_KEY = 'theme';
  var ORDER = ['system', 'light', 'dark'];
  var LABELS = { system: 'system', light: 'light', dark: 'dark' };
  var root = document.documentElement;

  function readStored() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  }
  function writeStored(v) {
    try {
      if (v === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {}
  }
  function applyTheme(pref) {
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
  }
  function nextPref(curr) {
    var i = ORDER.indexOf(curr);
    return ORDER[(i + 1) % ORDER.length];
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

    function announce(pref) {
      if (!live) return;
      live.textContent =
        pref === 'system'
          ? 'Theme set to system default'
          : 'Theme set to ' + LABELS[pref] + ' mode';
    }
    function refresh() {
      var pref = readStored();
      var next = nextPref(pref);
      btn.setAttribute('data-theme-state', pref);
      btn.setAttribute(
        'aria-label',
        'Theme: ' + LABELS[pref] + '. Switch to ' + LABELS[next] + ' mode.'
      );
      btn.setAttribute('title', 'Theme: ' + LABELS[pref]);
    }

    btn.addEventListener('click', function () {
      var next = nextPref(readStored());
      writeStored(next);
      withTransition(function () { applyTheme(next); });
      refresh();
      announce(next);
    });

    // Keep the page in sync if the OS preference changes while the user
    // is on "system". (The CSS already swaps via media query; we just
    // re-emit the announcement so screen readers are aware.)
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var mqHandler = function () {
        if (readStored() === 'system') announce('system');
      };
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
