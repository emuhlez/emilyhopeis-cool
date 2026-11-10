// Project viewer: a full-screen sequence of photos and videos with a short
// description. Tiles link to #<project-id>, so a viewer state is shareable.
(function () {
  // The planning clips were recorded without a pointer. These are the clicks
  // in each clip, as percentages of the 1600×900 frame, timed to the cuts.
  var CHAT_CURSOR = [
    { t: 0.00, x: 47.0, y: 49.3 },
    { t: 0.30, x: 41.5, y: 60.9 },
    { t: 0.45, x: 41.5, y: 60.9, click: true },
    { t: 0.62, x: 41.5, y: 60.9 },
    { t: 2.80, x: 60.0, y: 61.1 },
    { t: 3.28, x: 60.0, y: 61.1, click: true },
    { t: 3.46, x: 60.0, y: 61.1 },
    { t: 6.30, x: 43.8, y: 42.9 },
    { t: 7.12, x: 43.8, y: 42.9, click: true },
    { t: 7.30, x: 43.8, y: 42.9 },
    { t: 8.10, x: 43.8, y: 32.1 },
    { t: 8.68, x: 43.8, y: 32.1, click: true },
    { t: 8.86, x: 43.8, y: 32.1 },
    { t: 9.70, x: 43.8, y: 32.1 },
    { t: 10.28, x: 43.8, y: 32.1, click: true },
    { t: 10.46, x: 43.8, y: 32.1 },
    { t: 10.85, x: 53.3, y: 71.2 },
    { t: 11.08, x: 53.3, y: 71.2, click: true },
    { t: 11.26, x: 53.3, y: 71.2 },
    { t: 12.15, x: 43.8, y: 27.0 },
    { t: 12.62, x: 43.8, y: 27.0, click: true },
    { t: 12.80, x: 43.8, y: 27.0 },
    { t: 12.98, x: 43.8, y: 37.6 },
    { t: 13.15, x: 43.8, y: 37.6, click: true },
    { t: 13.33, x: 43.8, y: 37.6 },
    { t: 13.80, x: 53.3, y: 76.7 },
    { t: 14.06, x: 53.3, y: 76.7, click: true },
    { t: 14.24, x: 53.3, y: 76.7 },
    { t: 15.60, x: 51.1, y: 68.8 },
    { t: 16.34, x: 51.1, y: 68.8, click: true },
    { t: 16.52, x: 51.1, y: 68.8 },
    { t: 17.30, x: 56.0, y: 70.1 },
    { t: 18.40, x: 56.0, y: 70.1 }
  ].map(function (p) {
    // the clip is zoomed 1.25× around its center after these were measured
    return { t: p.t, x: 50 + (p.x - 50) * 1.25, y: 50 + (p.y - 50) * 1.25, click: p.click };
  });

  var QA_CURSOR = [
    { t: 0.25, x: 61.5, y: 70.0 },
    { t: 1.20, x: 43.1, y: 44.6 },
    { t: 2.05, x: 43.1, y: 44.6, click: true },
    { t: 2.24, x: 43.1, y: 44.6 },
    { t: 3.05, x: 43.8, y: 31.1 },
    { t: 3.55, x: 43.8, y: 31.1, click: true },
    { t: 3.74, x: 43.8, y: 31.1 },
    { t: 4.55, x: 42.5, y: 30.8 },
    { t: 5.12, x: 42.5, y: 30.8, click: true },
    { t: 5.30, x: 42.5, y: 30.8 },
    { t: 6.15, x: 54.1, y: 80.7 },
    { t: 6.64, x: 54.1, y: 80.7, click: true },
    { t: 6.82, x: 54.1, y: 80.7 },
    { t: 7.60, x: 41.9, y: 24.0 },
    { t: 8.25, x: 41.9, y: 24.0, click: true },
    { t: 8.42, x: 41.9, y: 24.0 },
    { t: 8.72, x: 41.9, y: 37.8, click: true },
    { t: 8.90, x: 41.9, y: 37.8 },
    { t: 9.70, x: 54.1, y: 87.6 },
    { t: 10.44, x: 54.1, y: 87.6, click: true },
    { t: 10.62, x: 54.1, y: 87.6 },
    { t: 11.45, x: 51.3, y: 73.8 },
    { t: 12.90, x: 51.3, y: 73.8 }
  ];

  function easeInOut(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  var CURSOR_TRACKS = {
    'planning-mode-chat': CHAT_CURSOR,
    'planning-mode-qa': QA_CURSOR
  };

  function trackFor(src) {
    for (var name in CURSOR_TRACKS) {
      if ((src || '').indexOf(name) !== -1) return CURSOR_TRACKS[name];
    }
    return null;
  }

  function sampleCursor(track, time) {
    var a = track[0];
    for (var i = 1; i < track.length; i++) {
      var b = track[i];
      if (time <= b.t || i === track.length - 1) {
        var u = Math.max(0, Math.min(1, (time - a.t) / ((b.t - a.t) || 1)));
        var e = easeInOut(u);
        return {
          x: a.x + (b.x - a.x) * e,
          y: a.y + (b.y - a.y) * e,
          down: !!(a.click && time < a.t + 0.16)
        };
      }
      a = b;
    }
    return { x: a.x, y: a.y, down: false };
  }

  var CURSOR_SVG =
    '<svg viewBox="0 0 18 22" aria-hidden="true">' +
      '<path d="M2.1 1.1 L2.1 16.6 L5.6 13.3 L8.5 19.6 L10.8 18.5 L7.8 12.2 L13 12.2 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.2" stroke-linejoin="round"/>' +
    '</svg>';

  // Follows video.currentTime so the pointer stays on the clicks, including loops.
  function attachDemoCursor(host, video) {
    if (!host || !video || host.querySelector('.demo-cursor')) return;
    var el = document.createElement('span');
    el.className = 'demo-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = CURSOR_SVG;
    host.appendChild(el);

    var raf = 0;
    function track() {
      return trackFor(video.currentSrc || video.getAttribute('src'));
    }
    function matches() { return !!track(); }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      el.classList.remove('is-on', 'is-down');
    }
    function tick() {
      raf = requestAnimationFrame(tick);
      var tr = track();
      if (!video.isConnected || !tr || video.paused) { stop(); return; }
      var s = sampleCursor(tr, video.currentTime || 0);
      el.style.left = s.x + '%';
      el.style.top = s.y + '%';
      el.classList.toggle('is-down', s.down);
      el.classList.add('is-on');
    }
    function start() { if (matches() && !raf) tick(); }
    video.addEventListener('play', start);
    video.addEventListener('playing', start);
    video.addEventListener('pause', stop);
    if (!video.paused && matches()) tick();
  }
  var PROJECTS = {
    'planning-mode': {
      title: 'Planning Mode',
      client: 'Roblox Studio · 2026',
      description: "Giving Studio's AI Assistant a place to plan with the creator before it acts. Creators review and direct intent before anything gets built.",
      media: [
        { type: 'video', src: 'images/work/planning-mode-chat.mp4', dark: 'images/work/planning-mode-chat-dark.mp4', poster: 'images/work/planning-mode-chat.jpg', posterDark: 'images/work/planning-mode-chat-dark.jpg', alt: 'The Assistant asking clarifying questions about an obby before planning it' },
        { type: 'video', src: 'images/work/planning-mode-flow.mp4', dark: 'images/work/planning-mode-flow-dark.mp4', poster: 'images/work/planning-mode-built.jpg', posterDark: 'images/work/planning-mode-built-dark.jpg', alt: 'Roblox Studio going from a /plan prompt through questions and a task list to a built obby' },
        { type: 'video', src: 'images/work/planning-mode-card.mp4', dark: 'images/work/planning-mode-card-dark.mp4', poster: 'images/work/planning-mode.jpg', posterDark: 'images/work/planning-mode-dark.jpg' }
      ]
    },
    'skills': {
      title: 'Skills',
      client: 'Roblox Studio · 2025–26',
      description: 'A system for teaching the Assistant new abilities: the architecture, the settings, and the conventions that keep it legible to creators.',
      media: [
        { type: 'video', src: 'images/work/skills-card.mp4', dark: 'images/work/skills-card-dark.mp4', poster: 'images/work/skills.jpg', posterDark: 'images/work/skills-dark.jpg' },
        { type: 'image', src: 'images/work/skills.jpg', dark: 'images/work/skills-dark.jpg', alt: 'Roblox Studio with the Assistant creating a new skill' }
      ]
    },
    'build': {
      title: 'BUILD',
      client: 'Roblox · 2026',
      description: 'The new way to make games on Roblox. One prompt, and a player becomes a creator.',
      media: [
        { type: 'image', src: 'images/work/build.jpg', dark: 'images/work/build-dark.jpg', alt: 'The BUILD mobile app listing games in progress', tile: 'alt' },
        { type: 'image', src: 'images/work/build-new-chat.jpg', dark: 'images/work/build-new-chat-dark.jpg', alt: 'A new chat in the BUILD mobile app, waiting on a first prompt', tile: 'alt' }
      ]
    },
    'emilys-desktop': {
      title: "Emily's Desktop",
      client: 'Personal · 2026',
      description: 'A living desktop of notes, tools, and experiments: a personal operating system for how I think and work.',
      link: { href: 'https://emilysdesk.top', label: 'Open Emily\u2019s Desktop' },
      media: [
        { type: 'video', src: 'images/work/emilys-desktop-card.mp4', dark: 'images/work/emilys-desktop-card-dark.mp4', poster: 'images/work/emilys-desktop.jpg', posterDark: 'images/work/emilys-desktop-dark.jpg', tile: 'alt' },
        { type: 'image', src: 'images/work/emilys-desktop.jpg', dark: 'images/work/emilys-desktop-dark.jpg', alt: "Emily's Desktop lock screen on a studio display", tile: 'alt' }
      ]
    }
  };

  var root = document.documentElement;
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkMq.matches;
  }
  function themed(item, key, darkKey) {
    return isDark() && item[darkKey] ? item[darkKey] : item[key];
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.tabIndex = -1;
  dialog.setAttribute('aria-labelledby', 'viewer-title');
  dialog.innerHTML =
    '<div class="viewer-top">' +
      '<button type="button" class="viewer-back" data-viewer-close aria-label="Back to work">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
      '</button>' +
      '<span class="viewer-count" aria-live="polite"></span>' +
    '</div>' +
    '<p class="viewer-hint" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd> next <span></span> <kbd>Esc</kbd> back to work</p>' +
    '<div class="viewer-stage"><div class="viewer-media"></div></div>' +
    '<div class="viewer-info">' +
      '<h2 class="viewer-title" id="viewer-title"></h2>' +
      '<p class="viewer-client"></p>' +
      '<p class="viewer-desc"></p>' +
      '<a class="viewer-link" target="_blank" rel="noopener"></a>' +
    '</div>' +
    '<nav class="viewer-thumbs" aria-label="Choose media"></nav>';
  document.body.appendChild(dialog);

  var els = {
    count: dialog.querySelector('.viewer-count'),
    hint: dialog.querySelector('.viewer-hint'),
    stage: dialog.querySelector('.viewer-stage'),
    media: dialog.querySelector('.viewer-media'),
    title: dialog.querySelector('.viewer-title'),
    client: dialog.querySelector('.viewer-client'),
    desc: dialog.querySelector('.viewer-desc'),
    link: dialog.querySelector('.viewer-link'),
    thumbs: dialog.querySelector('.viewer-thumbs')
  };

  var current = null;
  var index = 0;
  var hintTimer = null;
  var pushed = false;

  function renderMedia() {
    var item = current.media[index];
    els.media.classList.toggle('viewer-media--alt', item.tile === 'alt');
    var node;
    if (item.type === 'video') {
      node = document.createElement('video');
      node.muted = true;
      node.loop = true;
      node.playsInline = true;
      node.autoplay = true;
      node.poster = themed(item, 'poster', 'posterDark');
      node.src = themed(item, 'src', 'dark');
      node.setAttribute('aria-label', current.title + ' walkthrough');
    } else {
      node = document.createElement('img');
      node.src = themed(item, 'src', 'dark');
      node.alt = item.alt || '';
    }
    node.className = 'viewer-asset';
    els.media.replaceChildren(node);
    if (node.play) {
      node.play().catch(function () {});
      if (trackFor(node.src)) attachDemoCursor(els.media, node);
    }

    els.count.textContent = (index + 1) + ' / ' + current.media.length;
    Array.prototype.forEach.call(els.thumbs.children, function (btn, i) {
      if (i === index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  }

  function renderThumbs() {
    els.thumbs.replaceChildren();
    current.media.forEach(function (item, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'viewer-thumb';
      btn.setAttribute('aria-label', 'Show item ' + (i + 1) + ' of ' + current.media.length);
      var img = document.createElement('img');
      img.src = item.type === 'video' ? themed(item, 'poster', 'posterDark') : themed(item, 'src', 'dark');
      img.alt = '';
      btn.appendChild(img);
      if (item.type === 'video') btn.classList.add('viewer-thumb--video');
      btn.addEventListener('click', function () { go(i); });
      els.thumbs.appendChild(btn);
    });
    els.thumbs.hidden = current.media.length < 2;
  }

  function go(i) {
    var n = current.media.length;
    index = (i + n) % n;
    renderMedia();
  }

  function open(id, opts) {
    var project = PROJECTS[id];
    if (!project) return;
    current = project;
    index = 0;
    els.title.textContent = project.title;
    els.client.textContent = project.client;
    els.desc.textContent = project.description;
    if (project.link) {
      els.link.hidden = false;
      els.link.href = project.link.href;
      els.link.textContent = project.link.label + ' \u2197';
    } else {
      els.link.hidden = true;
    }
    renderThumbs();
    renderMedia();
    if (!dialog.open) {
      dialog.showModal();
      dialog.focus();
    }
    document.body.classList.add('is-viewing');
    if (!(opts && opts.fromHash)) {
      if (pushed) history.replaceState({ viewer: id }, '', '#' + id);
      else history.pushState({ viewer: id }, '', '#' + id);
      pushed = true;
    }

    dialog.classList.add('show-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { dialog.classList.remove('show-hint'); }, 2800);
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  // Closing undoes the history entry open() added, so the browser Back button
  // and Esc land in the same place.
  dialog.addEventListener('close', function () {
    els.media.replaceChildren();
    document.body.classList.remove('is-viewing');
    current = null;
    if (pushed) {
      pushed = false;
      history.back();
    } else if (PROJECTS[location.hash.slice(1)]) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  });

  dialog.querySelector('[data-viewer-close]').addEventListener('click', function () { close(); });

  // Clicking the empty backdrop area (not the media, text, or controls) closes.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog || e.target === els.stage) close();
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  dialog.addEventListener('cancel', function (e) {
    e.preventDefault();
    close();
  });

  // Swipe between items on touch screens.
  var touchX = null;
  els.stage.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  els.stage.addEventListener('touchend', function (e) {
    if (touchX === null || !current) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  });

  document.querySelectorAll('[data-video*="planning-mode-"]').forEach(function (card) {
    if (!trackFor(card.dataset.video)) return;
    var host = card.querySelector('.work-frame') || card.querySelector('.work-media');
    attachDemoCursor(host, card.querySelector('video'));
  });

  document.querySelectorAll('[data-open]').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      open(card.getAttribute('data-open'));
    });
  });

  function syncToHash() {
    var id = location.hash.slice(1);
    if (PROJECTS[id]) open(id, { fromHash: true });
    else if (dialog.open) { pushed = false; dialog.close(); }
  }
  window.addEventListener('popstate', syncToHash);
  syncToHash();

  // Re-render with the right light/dark assets if the theme changes while open.
  function onTheme() { if (current) { renderThumbs(); renderMedia(); } }
  new MutationObserver(onTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkMq.addEventListener) darkMq.addEventListener('change', onTheme);
})();
