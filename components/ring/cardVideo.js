import * as THREE from "three";
import { videoFilesFor } from "./projects";

/**
 * One card on the ring can be moving footage rather than a still.
 *
 * It deliberately does not go through the atlas. Painting a frame into a cell
 * would mean re-uploading the whole sheet and regenerating its mip chain sixty
 * times a second for the sake of one card, so the video gets its own sampler
 * and the shader chooses between the two per cell.
 *
 * The still stays on the atlas underneath and is what the card wears until the
 * first frame is actually decoded, which also makes it the fallback: if
 * playback is refused — no file, a codec the browser will not take, reduced
 * motion — nothing here ever raises the mix and the card is simply the poster.
 */

// Long enough to read as a dissolve rather than a cut, short enough that it is
// over before anyone has finished looking at the card.
const FADE_SECONDS = 0.65;
const easeMix = (value) => value * value * (3 - 2 * value);

export function createCardVideo(theme) {
  const off = {
    texture: null,
    update: () => ({ cell: -1, mix: 0 }),
    dispose: () => {},
  };

  const files = videoFilesFor(theme);
  if (!files.some(Boolean)) return off;

  // Motion on a card is decoration, not content — the poster carries the same
  // material. Honouring this here rather than at the CSS layer because the ring
  // is a canvas and never sees a media query.
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return off;
  }

  const el = document.createElement("video");
  el.loop = true;
  el.muted = true; // and therefore allowed to autoplay
  el.defaultMuted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  // In the document, because a detached media element is not reliably decoded —
  // Safari and iOS in particular will not run one. Inert and effectively
  // invisible rather than display:none, which is itself grounds for a browser
  // to stop decoding the frames the texture needs.
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;" +
    "opacity:0;pointer-events:none;";
  document.body.appendChild(el);

  const texture = new THREE.VideoTexture(el);
  // Both of these match the atlas rather than the three.js defaults. The
  // shader flips every cell itself, so an upload that also flips lands the
  // card upside down; and this pass writes straight to the framebuffer with no
  // encoding step, so decoding on read would wash the card out against its
  // neighbours.
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter; // VideoTexture cannot mip
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  let playing = false;
  let mix = 0;
  let currentCell = -1;

  const tryPlay = () => {
    if (currentCell < 0 || !files[currentCell]) return;
    // Rejects when the tab has never been interacted with on some browsers, and
    // whenever the document is hidden. Neither is an error worth surfacing: the
    // card keeps wearing its poster and the next attempt may well succeed.
    el.play().then(
      () => { playing = true; },
      () => { playing = false; },
    );
  };

  const onVisibility = () => {
    if (document.hidden) {
      playing = false;
      el.pause();
    }
    else tryPlay();
  };

  const setSource = (cell) => {
    playing = false;
    mix = 0;
    currentCell = cell;
    el.pause();

    const file = cell >= 0 ? files[cell] : null;
    if (!file) {
      el.removeAttribute("src");
      el.load();
      return;
    }

    el.src = `/${file}`;
    el.load();
    tryPlay();
  };

  el.addEventListener("canplay", tryPlay);
  document.addEventListener("visibilitychange", onVisibility);
  // Cell zero is the seed during entry, so its file gets the first decode.
  setSource(files[0] ? 0 : -1);

  return {
    texture,

    /**
     * Returns how far the video has taken over from the poster, 0..1. Driven by
     * decoded frames rather than by `playing`, so the fade cannot start against
     * a texture that has nothing in it yet.
     */
    update(dt, cell) {
      const wanted = files[cell] ? cell : -1;
      if (wanted !== currentCell) {
        mix = Math.max(0, mix - dt / FADE_SECONDS);
        if (mix <= 0) setSource(wanted);
        return { cell: currentCell, mix: easeMix(mix) };
      }

      const live = playing && el.readyState >= el.HAVE_CURRENT_DATA;
      const target = live ? 1 : 0;
      const step = dt / FADE_SECONDS;
      mix += Math.max(-step, Math.min(step, target - mix));
      return { cell: currentCell, mix: easeMix(mix) };
    },

    dispose() {
      el.removeEventListener("canplay", tryPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      el.pause();
      // Dropping the source as well: without it the element can sit in the
      // decoder with the download still running after the ring is gone.
      el.removeAttribute("src");
      el.load();
      el.remove();
      texture.dispose();
    },
  };
}
