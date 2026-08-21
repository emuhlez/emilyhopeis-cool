/**
 * Playful spring circle cursor.
 *
 * @example
 * import { initCircleCursor } from "./circle-cursor.js";
 * const cursor = initCircleCursor();
 */

const STYLE_ID = "circle-cursor-styles";

const HOT =
  "a, button, [role='button'], .nav-link, .cw, .peek-t, .pgroup, .file, summary, label, input, textarea, select";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
  .circle-cursor {
    position: fixed;
    top: 0;
    left: 0;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2147483646;
    opacity: 0;
    background: color-mix(in srgb, var(--text, #f2f2f5) 55%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--text, #fff) 35%, transparent),
      0 2px 8px rgba(0, 0, 0, 0.18);
    mix-blend-mode: difference;
    will-change: transform, opacity;
  }
  .circle-cursor.is-on { opacity: 1; }
  @media (hover: hover) and (pointer: fine) {
    html.has-circle-cursor,
    html.has-circle-cursor *,
    html.has-circle-cursor body,
    html.has-circle-cursor body * {
      cursor: none !important;
    }
  }
  `;
  document.head.appendChild(style);
}

export function initCircleCursor() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches) return null;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  injectStyles();

  const el = document.createElement("div");
  el.className = "circle-cursor";
  el.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(el);
  document.documentElement.classList.add("has-circle-cursor");
  document.documentElement.style.setProperty("cursor", "none", "important");
  document.body.style.setProperty("cursor", "none", "important");

  let x = -100, y = -100;
  let tx = -100, ty = -100;
  let vx = 0, vy = 0;
  let scale = 1, tScale = 1, vScale = 0;
  let raf = 0;
  let on = false;

  function tick() {
    raf = 0;
    if (reduce.matches) {
      x = tx;
      y = ty;
      scale = tScale;
      vx = vy = vScale = 0;
    } else {
      // Spring follow — soft overshoot for bounce
      const spring = 0.18;
      const damp = 0.72;
      vx = vx * damp + (tx - x) * spring;
      vy = vy * damp + (ty - y) * spring;
      x += vx;
      y += vy;

      vScale = vScale * 0.7 + (tScale - scale) * 0.22;
      scale += vScale;
    }

    el.style.transform =
      "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";

    const moving =
      Math.abs(tx - x) > 0.05 ||
      Math.abs(ty - y) > 0.05 ||
      Math.abs(vx) > 0.05 ||
      Math.abs(vy) > 0.05 ||
      Math.abs(tScale - scale) > 0.002 ||
      Math.abs(vScale) > 0.002;

    if (moving) raf = requestAnimationFrame(tick);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function move(e) {
    tx = e.clientX;
    ty = e.clientY;
    if (!on) {
      on = true;
      x = tx;
      y = ty;
      el.classList.add("is-on");
    }
    const under = document.elementFromPoint(e.clientX, e.clientY);
    tScale = under && under.closest && under.closest(HOT) ? 1.55 : 1;
    kick();
  }

  function onDown() {
    tScale = 0.72;
    vScale -= 0.35; // punch the spring for a playful squash
    kick();
  }

  function onUp(e) {
    const under = document.elementFromPoint(e.clientX || tx, e.clientY || ty);
    tScale = under && under.closest && under.closest(HOT) ? 1.55 : 1;
    vScale += 0.45; // bounce back
    kick();
  }

  function onLeave() {
    on = false;
    el.classList.remove("is-on");
  }

  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointercancel", onUp, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeave);
  window.addEventListener("blur", onLeave);

  function destroy() {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.documentElement.removeEventListener("mouseleave", onLeave);
    window.removeEventListener("blur", onLeave);
    if (raf) cancelAnimationFrame(raf);
    el.remove();
    document.documentElement.classList.remove("has-circle-cursor");
    document.documentElement.style.removeProperty("cursor");
    document.body.style.removeProperty("cursor");
  }

  return { destroy, el };
}
