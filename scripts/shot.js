#!/usr/bin/env node
/**
 * One screenshot/verify harness for the site, replacing the one-off scripts
 * that kept getting rewritten in /tmp.
 *
 * The ring has an entry animation that takes several seconds to play out, but
 * Carousel's skipEntry() lands it immediately on any wheel, drag or project
 * click. Nudging the wheel is what makes this fast: waiting the animation out
 * cost 35s or more per shot, and a shot taken too early silently captured a
 * half-built ring.
 *
 * Usage:
 *   node scripts/shot.js --out /tmp/a.png
 *   node scripts/shot.js --theme dark --project "Planning Mode" --out /tmp/b.png
 *   node scripts/shot.js --project "Planning Mode" --panel --out /tmp/c.png
 *   node scripts/shot.js --tokens "--bg:#f4f4f2;--card-blank:#d6d6d2" --out /tmp/d.png
 *
 * Flags:
 *   --theme    light | dark            (default light)
 *   --project  exact name in the list  (travels the ring to that card)
 *   --panel    open the detail panel for --project
 *   --tokens   CSS custom properties applied before boot, ";" separated
 *   --url      default http://localhost:5190/
 *   --width/--height/--scale
 *   --out      png path (default /tmp/shot.png)
 *   --quiet    suppress the report
 */

const path = require("path");

// Playwright is not a dependency of this project; it is borrowed from whichever
// checkout has it. Resolved rather than hardcoded so a missing path fails with
// something actionable instead of a stack trace.
const PLAYWRIGHT_PATHS = [
  "playwright",
  "/Users/elouie/Documents/repos/build/node_modules/playwright",
];

function loadPlaywright() {
  for (const p of PLAYWRIGHT_PATHS) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error(
    `playwright not found. Tried:\n  ${PLAYWRIGHT_PATHS.join("\n  ")}\n` +
      `Install it here with: npm i -D playwright`
  );
}

function parseArgs(argv) {
  const args = { theme: "light", url: "http://localhost:5190/", out: "/tmp/shot.png" };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (name === "panel" || name === "quiet") {
      args[name] = true;
      continue;
    }
    args[name] = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { chromium } = loadPlaywright();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: args.theme === "dark" ? "dark" : "light",
    viewport: {
      width: Number(args.width || 1600),
      height: Number(args.height || 1000),
    },
    deviceScaleFactor: Number(args.scale || 1),
  });
  const page = await context.newPage();

  const pageErrors = [];
  const badResponses = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("response", (r) => {
    if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
  });

  if (args.tokens) {
    // Applied on DOMContentLoaded so the ring reads them when it builds its
    // uniforms, not just the CSS box behind the canvas.
    await page.addInitScript((css) => {
      const style = document.createElement("style");
      style.textContent = `:root{${css}}`;
      document.addEventListener("DOMContentLoaded", () =>
        document.head.appendChild(style)
      );
    }, args.tokens);
  }

  const started = Date.now();
  await page.goto(args.url, { waitUntil: "load" });

  // Land the ring rather than waiting for its entry to finish.
  await page.mouse.move(800, 500);
  await page.mouse.wheel(0, 1);

  if (args.project) {
    await page.getByText(args.project, { exact: true }).first().click();
    await page.waitForTimeout(2200);
  } else {
    await page.waitForTimeout(1200);
  }

  if (args.panel) {
    if (!args.project) throw new Error("--panel needs --project");
    // The centred card is the one nearest viewport centre. Planes turned away
    // from the camera are drawn wider and sit far offscreen, so width is not a
    // usable proxy for which card is in front.
    const box = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".ring-card")];
      const mid = window.innerWidth / 2;
      const best = cards
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { r, d: Math.abs(r.left + r.width / 2 - mid) };
        })
        .sort((a, b) => a.d - b.d)[0];
      return best ? { x: best.r.left + best.r.width / 2, y: best.r.top + best.r.height / 2 } : null;
    });
    if (!box) throw new Error("no .ring-card found");
    for (let i = 0; i < 4; i++) {
      if (await page.locator(".detail-overlay.is-open").count()) break;
      await page.mouse.click(box.x, box.y);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: args.out });

  if (!args.quiet) {
    const report = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (n) => cs.getPropertyValue(n).trim();
      const video = document.querySelector(".detail-image.is-video video, .detail-overlay video");
      return {
        theme: document.querySelector(".portfolio-shell")?.dataset.theme ?? null,
        bg: read("--bg"),
        ink: read("--ink"),
        cardBlank: read("--card-blank"),
        mediaPlate: read("--media-plate"),
        panelOpen: !!document.querySelector(".detail-overlay.is-open"),
        panelTitle: document.querySelector(".detail-overlay h1")?.textContent?.trim() ?? null,
        video: video
          ? {
              src: new URL(video.currentSrc || video.src, location.href).pathname,
              poster: video.poster ? new URL(video.poster, location.href).pathname : null,
              paused: video.paused,
            }
          : null,
      };
    });
    console.log(
      JSON.stringify(
        { out: args.out, elapsedMs: Date.now() - started, ...report, badResponses, pageErrors },
        null,
        2
      )
    );
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
