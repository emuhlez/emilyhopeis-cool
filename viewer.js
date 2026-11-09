// Project viewer: a full-screen sequence of photos and videos with a short
// description. Tiles link to #<project-id>, so a viewer state is shareable.
(function () {
  var PROJECTS = {
    'planning-mode': {
      title: 'Planning Mode',
      client: 'Roblox Studio · 2026',
      description: "Giving Studio's AI Assistant a place to plan with the creator before it acts. Creators review and direct intent before anything gets built.",
      media: [
        { type: 'video', src: 'images/work/planning-mode-questions.mp4', poster: 'images/work/planning-mode-questions.jpg', alt: 'The Assistant asking clarifying questions about an obby before planning it' },
        { type: 'image', src: 'images/work/planning-mode-plan.jpg', alt: 'The Assistant proposing a task list for the obby, with Ask again, Reject, and Build' },
        { type: 'video', src: 'images/work/planning-mode-flow.mp4', poster: 'images/work/planning-mode-built.jpg', alt: 'Roblox Studio going from a /plan prompt through questions and a task list to a built obby' },
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
    if (node.play) node.play().catch(function () {});

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
