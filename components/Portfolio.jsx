"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Carousel from "./Carousel";
import { PROJECTS } from "./ring/projects";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

// Breathing room between the monitor and the edges of the viewer stage.
const MAC_STAGE_MARGIN = 40;

// Every part of the monitor is a fraction of its screen width, so the whole
// display is driven by a single measured number and stays in proportion.
// Ratios are taken off a straight-on 24-inch iMac: thin bezels, a deep chin,
// and a flat rectangular stand.
const MAC_FRAME = {
  padSide: 0.025,
  padTop: 0.03,
  chin: 0.115,
  neckHeight: 0.153,
  baseHeight: 0.017,
};

function computeMacWidth(stageWidth, stageHeight, screenRatio) {
  if (stageWidth <= 0 || stageHeight <= 0 || screenRatio <= 0) return 0;

  const widthLimit =
    (stageWidth - MAC_STAGE_MARGIN * 2) / (1 + MAC_FRAME.padSide * 2);
  const heightLimit =
    (stageHeight - MAC_STAGE_MARGIN * 2) /
    (MAC_FRAME.padTop +
      screenRatio +
      MAC_FRAME.chin +
      MAC_FRAME.neckHeight +
      MAC_FRAME.baseHeight);

  return Math.max(0, Math.min(widthLimit, heightLimit));
}

function fallbackMacWidth(screenRatio) {
  if (typeof window === "undefined" || screenRatio <= 0) return 960;
  // Dialog inset, toolbar, and stage padding — enough to size the monitor
  // before the hidden viewer has reported its real dimensions.
  return computeMacWidth(
    window.innerWidth - 48,
    window.innerHeight - 120,
    screenRatio,
  );
}

const ABOUT = {
  title: "About Emily",
  body: [
    "Emily is a product designer working on agentic UX: the layer of a product that decides how an AI plans, acts, recovers, and explains itself.",
    "Currently at Roblox, she designs the Studio Assistant experience used by millions of creators. Her work spans north-star vision, systems design, and working prototypes built at fidelity.",
    "Based in San Francisco. Off hours: knitting, baking, and a very good dog named Goose.",
  ],
};

export default function Portfolio() {
  const [project, setProject] = useState(null);
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [macWidth, setMacWidth] = useState(0);
  const [embedMounted, setEmbedMounted] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const dragRef = useRef(null);
  const imageTriggerRef = useRef(null);
  const viewerCloseRef = useRef(null);
  const stageRef = useRef(null);
  const panelOpen = Boolean(project || aboutOpen);
  const previewFile = project?.previewFile || project?.file;
  const prototype = project?.prototype;
  const isEmbed = prototype?.kind === "site";
  const screenRatio = isEmbed
    ? prototype.viewport.height / prototype.viewport.width
    : 0;

  const resetViewer = () => {
    setViewerOpen(false);
    setZoom(MIN_ZOOM);
    setImageOffset({ x: 0, y: 0 });
    setMacWidth(0);
    setEmbedMounted(false);
    setEmbedLoaded(false);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setZoom(MIN_ZOOM);
    setImageOffset({ x: 0, y: 0 });
    requestAnimationFrame(() => imageTriggerRef.current?.focus());
  };

  const openViewer = () => {
    setZoom(MIN_ZOOM);
    setImageOffset({ x: 0, y: 0 });
    if (isEmbed) {
      setEmbedLoaded(false);
      setEmbedMounted(true);
    }
    setViewerOpen(true);
  };

  const measureMac = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !isEmbed) return;

    const next = computeMacWidth(
      stage.clientWidth,
      stage.clientHeight,
      screenRatio,
    );
    if (next > 0) setMacWidth(next);
  }, [isEmbed, screenRatio]);

  const changeZoom = (nextZoom) => {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clampedZoom);
    if (clampedZoom === MIN_ZOOM) setImageOffset({ x: 0, y: 0 });
  };

  // Moving to another card must not leave the previous project's prototype
  // running behind the closed viewer.
  const openProject = (nextProject) => {
    resetViewer();
    setProject(nextProject);

    if (nextProject?.prototype?.kind === "site") {
      setEmbedLoaded(false);
      setEmbedMounted(true);
      setViewerOpen(true);
    }
  };

  const closePanel = () => {
    resetViewer();
    setProject(null);
    setAboutOpen(false);
  };

  useEffect(() => {
    document.body.dataset.overlayOpen = panelOpen ? "true" : "false";
    return () => {
      delete document.body.dataset.overlayOpen;
    };
  }, [panelOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;

      if (viewerOpen) {
        setViewerOpen(false);
        setZoom(MIN_ZOOM);
        setImageOffset({ x: 0, y: 0 });
        requestAnimationFrame(() => imageTriggerRef.current?.focus());
      } else if (panelOpen) {
        setProject(null);
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen, viewerOpen]);

  useEffect(() => {
    if (viewerOpen) viewerCloseRef.current?.focus();
  }, [viewerOpen]);

  // The monitor is sized to the largest screen width that still leaves room for
  // the bezel, chin, and stand inside the stage.
  useEffect(() => {
    if (!isEmbed) return;

    measureMac();
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(measureMac);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [isEmbed, measureMac]);

  // The viewer is visibility-hidden until it opens, so some browsers report a
  // zero-sized stage until then. Measure again once it is actually on screen.
  useEffect(() => {
    if (!viewerOpen || !isEmbed) return;

    measureMac();
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(measureMac);
    });
    return () => cancelAnimationFrame(frame);
  }, [viewerOpen, isEmbed, measureMac]);

  const baseMacWidth =
    macWidth > 0 ? macWidth : fallbackMacWidth(screenRatio);
  const displayMacWidth = baseMacWidth * zoom;

  // React attaches wheel listeners passively at the root, so the zoom gesture
  // needs its own listener to be allowed to cancel the page scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!viewerOpen || isEmbed || !stage) return;

    const onWheel = (event) => {
      event.preventDefault();
      changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  });

  return (
    <main className="portfolio-shell">
      <header className="site-nav">
        <button
          className="wordmark"
          type="button"
          onClick={closePanel}
          aria-label="Return to work"
        >
          Emily Hope
        </button>
        <nav aria-label="Portfolio">
          <button type="button" onClick={closePanel}>
            Work
          </button>
          <button
            type="button"
            onClick={() => {
              setProject(null);
              setAboutOpen(true);
            }}
          >
            About
          </button>
          <a
            href="https://emilysdesk.top"
            target="_blank"
            rel="noopener noreferrer"
          >
            Desk ↗
          </a>
        </nav>
      </header>

      <Carousel
        onOpenProject={openProject}
        onActiveProject={setActiveProject}
      />

      <div className="mobile-project-meta" aria-live="polite">
        <span>{activeProject.name}</span>
        <small>
          {activeProject.type} · {activeProject.year}
        </small>
      </div>

      <div
        className={`detail-overlay ${panelOpen ? "is-open" : ""}`}
        aria-hidden={!panelOpen}
      >
        <button
          className="overlay-scrim"
          type="button"
          onClick={closePanel}
          aria-label="Close details"
          tabIndex={panelOpen ? 0 : -1}
        />

        <section
          className="detail-panel"
          role="dialog"
          aria-modal="true"
          aria-label={project?.fullName || ABOUT.title}
        >
          <button
            className="detail-close"
            type="button"
            onClick={closePanel}
            tabIndex={panelOpen ? 0 : -1}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>

          {project ? (
            <div className="project-detail">
              <button
                ref={imageTriggerRef}
                className="detail-image"
                type="button"
                onClick={openViewer}
                aria-label={
                  isEmbed
                    ? `Launch the live ${project.fullName || project.name} prototype`
                    : `Open full-screen prototype preview for ${project.fullName || project.name}`
                }
              >
                {/* The carousel uses the same source in its atlas. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/${project.file}`}
                  alt={`Prototype preview for ${project.fullName || project.name}`}
                />
                <span className="detail-image-hint" aria-hidden="true">
                  <span>{isEmbed ? "Launch live prototype" : "View prototype"}</span>
                  <span>↗</span>
                </span>
              </button>
              <div className="detail-copy">
                <p className="detail-kicker">
                  {project.type} · {project.year}
                </p>
                <h1>{project.fullName || project.name}</h1>
                <p className="detail-description">{project.description}</p>
                <dl>
                  <div>
                    <dt>Role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt>Year</dt>
                    <dd>{project.year}</dd>
                  </div>
                </dl>
                {project.href ? (
                  <a
                    className="detail-link"
                    href={project.href}
                    target={project.external ? "_blank" : undefined}
                    rel={project.external ? "noopener noreferrer" : undefined}
                  >
                    {project.linkLabel || "View full case study"}{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="about-detail">
              <p className="detail-kicker">About</p>
              <h1>{ABOUT.title}</h1>
              {ABOUT.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="about-links">
                <a href="mailto:emilyhlouie@gmail.com">Email ↗</a>
                <a
                  href="https://www.linkedin.com/in/emilyhlouie/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn ↗
                </a>
              </div>
            </div>
          )}
        </section>
      </div>

      <div
        className={`image-viewer ${viewerOpen ? "is-open" : ""}`}
        aria-hidden={!viewerOpen}
      >
        <button
          className="image-viewer-scrim"
          type="button"
          onClick={closeViewer}
          aria-label="Close prototype viewer"
          tabIndex={viewerOpen ? 0 : -1}
        />
        <section
          className="image-viewer-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={`${project?.fullName || project?.name || "Project"} prototype preview`}
        >
          <div className="image-viewer-toolbar">
            <span>{project?.fullName || project?.name}</span>
            <div className="image-viewer-controls">
              <button
                type="button"
                onClick={() => changeZoom(zoom - ZOOM_STEP)}
                disabled={zoom === MIN_ZOOM}
                tabIndex={viewerOpen ? 0 : -1}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                className="zoom-level"
                type="button"
                onClick={() => changeZoom(MIN_ZOOM)}
                disabled={zoom === MIN_ZOOM}
                tabIndex={viewerOpen ? 0 : -1}
                aria-label={`Reset zoom, currently ${Math.round(zoom * 100)} percent`}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => changeZoom(zoom + ZOOM_STEP)}
                disabled={zoom === MAX_ZOOM}
                tabIndex={viewerOpen ? 0 : -1}
                aria-label="Zoom in"
              >
                +
              </button>
              {isEmbed ? (
                <a
                  className="image-viewer-open"
                  href={prototype.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={viewerOpen ? 0 : -1}
                >
                  Open ↗
                </a>
              ) : null}
              <button
                ref={viewerCloseRef}
                className="image-viewer-close"
                type="button"
                onClick={closeViewer}
                tabIndex={viewerOpen ? 0 : -1}
                aria-label="Close prototype viewer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M6 6 L18 18 M18 6 L6 18" />
                </svg>
              </button>
            </div>
          </div>
          <div
            ref={stageRef}
            className={`image-viewer-stage ${isEmbed ? "is-embed" : ""} ${
              !isEmbed && zoom > MIN_ZOOM ? "is-zoomed" : ""
            }`}
            onPointerDown={
              isEmbed
                ? undefined
                : (event) => {
                    if (zoom === MIN_ZOOM) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = {
                      pointerId: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                      originX: imageOffset.x,
                      originY: imageOffset.y,
                    };
                  }
            }
            onPointerMove={
              isEmbed
                ? undefined
                : (event) => {
                    if (dragRef.current?.pointerId !== event.pointerId) return;
                    setImageOffset({
                      x:
                        dragRef.current.originX +
                        event.clientX -
                        dragRef.current.x,
                      y:
                        dragRef.current.originY +
                        event.clientY -
                        dragRef.current.y,
                    });
                  }
            }
            onPointerUp={
              isEmbed
                ? undefined
                : (event) => {
                    if (dragRef.current?.pointerId !== event.pointerId) return;
                    dragRef.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
            }
            onPointerCancel={
              isEmbed
                ? undefined
                : () => {
                    dragRef.current = null;
                  }
            }
          >
            {isEmbed && viewerOpen ? (
              // Zoom grows the whole monitor and lets the stage scroll. Scaling
              // inside the screen instead would strand the viewer: a
              // cross-origin iframe keeps the wheel events that would pan it.
              <div
                className="mac-display"
                style={{
                  "--mac-w": `${displayMacWidth}px`,
                  "--mac-h": `${displayMacWidth * screenRatio}px`,
                  "--mac-scale": displayMacWidth / prototype.viewport.width,
                }}
              >
                <div className="mac-display-bezel">
                  <span className="mac-display-camera" aria-hidden="true" />
                  <div className="mac-display-screen">
                    {embedMounted ? (
                      <iframe
                        className="mac-display-frame"
                        src={prototype.src}
                        title={`${project.fullName || project.name} — live prototype`}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        onLoad={() => setEmbedLoaded(true)}
                        style={{
                          width: `${prototype.viewport.width}px`,
                          height: `${prototype.viewport.height}px`,
                        }}
                      />
                    ) : null}
                    {embedLoaded ? null : (
                      <p className="mac-display-loading">Waking the desk…</p>
                    )}
                  </div>
                </div>
                <span className="mac-display-neck" aria-hidden="true" />
                <span className="mac-display-base" aria-hidden="true" />
              </div>
            ) : project ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="image-viewer-image"
                src={`/${previewFile}`}
                alt={
                  project.previewAlt ||
                  `Full prototype preview for ${project.fullName || project.name}`
                }
                draggable={false}
                style={{
                  transform: `translate3d(${imageOffset.x}px, ${imageOffset.y}px, 0) scale(${zoom})`,
                }}
                onDoubleClick={() =>
                  changeZoom(zoom === MIN_ZOOM ? MIN_ZOOM + ZOOM_STEP : MIN_ZOOM)
                }
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
