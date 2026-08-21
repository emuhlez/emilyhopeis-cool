/**
 * Everything in the ring is drawn into one canvas: the cards are rounded rects
 * in a fragment shader, the heading is a textured quad per glyph, the cursor
 * tag is rasterised into that same shader pass. None of it exists in the
 * document, so nothing that inspects the page — a picker, a screen reader, an
 * extension — can see anything but the canvas.
 *
 * These are stand-ins. One empty box per thing on screen, tracked to the
 * rectangle it is actually drawn at, turned and scaled with it.
 *
 * They live inside the container the pointer handlers are already bound to, so
 * every event they take bubbles into the carousel's own input and the ring
 * behaves exactly as it did before they existed. Nothing here reads the
 * pointer or decides anything: the shader-space hit test in Carousel remains
 * the only opinion on which card is under the cursor.
 *
 * All of them are hidden from the accessibility tree. The cards are already
 * announced once, in full, from the live region and the project column, and
 * the heading is the wordmark again — naming them here would say each of those
 * things twice. Identity rides on data- attributes instead, which is what a
 * picker reads anyway.
 */

// A 1x1 box moved entirely by transform. Size and angle ride on the
// compositor, so following the shader every frame costs no layout pass —
// setting width and height instead would reflow the container several times a
// frame. cursor:inherit because the container sets grab/grabbing on itself and
// a child would otherwise punch an arrow through the ring.
const BASE =
  "position:absolute;left:0;top:0;width:1px;height:1px;" +
  "transform-origin:0 0;will-change:transform;cursor:inherit;" +
  "user-select:none;-webkit-user-drag:none;";

function makeNode(container, className, data, extraCss = "") {
  const el = document.createElement("div");
  el.className = className;
  for (const key in data) el.dataset[key] = data[key];
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = BASE + extraCss;
  container.appendChild(el);
  return el;
}

/**
 * x, y are the centre in screen px. rot is an angle in world radians, where +y
 * is up — the document's y points the other way, hence the negation. w, h are
 * the drawn size.
 *
 * The trailing translate(-50%, -50%) is applied before the scale, so it
 * resolves against the 1px box and comes out as half the final size: the box
 * centres on x, y whatever it has been stretched to. Zero size is how a thing
 * is absent, and it takes the hit area with it.
 */
function place(el, x, y, w, h, rot) {
  el.style.transform =
    `translate(${x}px, ${y}px) rotate(${-rot}rad) ` +
    `scale(${Math.max(0, w)}, ${Math.max(0, h)}) translate(-50%, -50%)`;
}

export function createProxies(container, projects, text) {
  const cards = projects.map((project, i) =>
    makeNode(container, "ring-card", {
      card: String(i),
      cardName: project.name,
      cardType: project.type,
      cardYear: project.year,
    }),
  );

  const headingEl = makeNode(container, "ring-heading", { text });

  // The one thing here that cannot be clicked, and not for want of a hit area:
  // it is pinned to the cursor at a fixed offset, so it moves out of the way by
  // exactly as much as the pointer moves toward it. pointer-events off makes
  // that explicit rather than leaving a live box chasing the cursor around.
  const tagEl = makeNode(container, "ring-tag", { text: "" }, "pointer-events:none;"); // prettier-ignore

  const nodes = [...cards, headingEl, tagEl];

  return {
    card(i, x, y, w, h, rot) {
      const el = cards[i];
      if (el) place(el, x, y, w, h, rot);
    },

    heading(x, y, w, h) {
      place(headingEl, x, y, w, h, 0);
    },

    tag(x, y, w, h, label) {
      if (tagEl.dataset.text !== label) tagEl.dataset.text = label;
      place(tagEl, x, y, w, h, 0);
    },

    dispose() {
      for (const el of nodes) el.remove();
    },
  };
}
