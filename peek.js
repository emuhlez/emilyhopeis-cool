// Hover card: cycles through data-peek-media on each hover and feeds the
// cursor position over the link into CSS vars for the tilt and glare.
document.querySelectorAll('[data-peek]').forEach(function (peek) {
  var link = peek.querySelector('a');
  var img = peek.querySelector('img.peek-img');
  var video = peek.querySelector('video.peek-img');
  var media = (peek.dataset.peekMedia || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var bag = [];
  var last = null;

  // Shuffle-bag so every item shows once before any repeats, never twice in a row.
  function nextMedia() {
    if (!bag.length) {
      bag = media.slice().sort(function () { return Math.random() - 0.5; });
      if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
    }
    return (last = bag.shift());
  }

  function showNext() {
    if (!media.length) return;
    var src = nextMedia();
    var angle = Math.random() * Math.PI * 2;
    peek.style.setProperty('--pan-x', (Math.cos(angle) * 8).toFixed(2) + '%');
    peek.style.setProperty('--pan-y', (Math.sin(angle) * 8).toFixed(2) + '%');
    if (/\.(mp4|webm|mov)$/i.test(src)) {
      img.hidden = true;
      video.hidden = false;
      if (video.getAttribute('src') !== src) video.src = src;
      video.currentTime = 0;
      video.play().catch(function () {});
    } else {
      video.hidden = true;
      video.pause();
      img.hidden = false;
      img.src = src;
    }
  }

  if (media.length > 1) {
    link.addEventListener('pointerenter', function () {
      media.forEach(function (src) {
        if (!/\.(mp4|webm|mov)$/i.test(src)) new Image().src = src;
      });
    }, { once: true });
  }
  link.addEventListener('pointerenter', showNext);
  link.addEventListener('focus', showNext);
  link.addEventListener('pointerleave', function () { video.pause(); });
  link.addEventListener('pointermove', function (e) {
    var r = link.getBoundingClientRect();
    peek.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3));
    peek.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3));
  });
  link.addEventListener('pointerleave', function () {
    peek.style.removeProperty('--mx');
    peek.style.removeProperty('--my');
  });
});
