"use client";

import { useEffect, useRef, useState } from "react";
import Carousel from "./Carousel";
import { PROJECTS, projectMedia } from "./ring/projects";
import { useSystemTheme } from "./systemTheme";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

const ABOUT = {
  title: "Hi! I'm Emily Hope Louie",
  body: [
    "Emily is a product designer working on agentic UX: the layer of a product that decides how an AI plans, acts, recovers, and explains itself.",
    "Currently at Roblox, she designs the Studio Assistant experience used by millions of creators. Her work spans north-star vision, systems design, and working prototypes built at fidelity.",
    "Based in San Francisco. Off hours: knitting, baking, and a very good dog named Goose.",
  ],
};

export default function Portfolio() {
  const theme = useSystemTheme();
  const [project, setProject] = useState(null);
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const imageTriggerRef = useRef(null);
  const viewerCloseRef = useRef(null);
  const stageRef = useRef(null);
  const panelOpen = Boolean(project || aboutOpen);
  const projectFile = projectMedia(project, "file", theme);
  const previewFile =
    projectMedia(project, "previewFile", theme) || projectFile;
  // The label over the still invites a closer look. A project can set it to an
  // empty string to go without one, for a still that is a screenshot rather
  // than something to try. It still opens full screen either way.
  const previewHint = project?.previewHint ?? "View prototype";
  // A project that ships a recording plays it in the panel rather than showing
  // a still, and has nothing to open full screen: the walkthrough is the
  // preview, and the link beside it goes to the real thing.
  const detailVideo = projectMedia(project, "detailVideo", theme);

  const resetViewer = () => {
    setViewerOpen(false);
    setZoom(MIN_ZOOM);
    setImageOffset({ x: 0, y: 0 });
  };

  const closeViewer = () => {
    resetViewer();
    requestAnimationFrame(() => imageTriggerRef.current?.focus());
  };

  const openViewer = () => {
    setZoom(MIN_ZOOM);
    setImageOffset({ x: 0, y: 0 });
    setViewerOpen(true);
  };

  const changeZoom = (nextZoom) => {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    setZoom(clampedZoom);
    if (clampedZoom === MIN_ZOOM) setImageOffset({ x: 0, y: 0 });
  };

  // Moving to another card must not leave the previous project's preview open
  // behind the new panel.
  const openProject = (nextProject) => {
    resetViewer();
    setProject(nextProject);
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

  // React attaches wheel listeners passively at the root, so the zoom gesture
  // needs its own listener to be allowed to cancel the page scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!viewerOpen || !stage) return;

    const onWheel = (event) => {
      event.preventDefault();
      changeZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  });

  return (
    <main className="portfolio-shell" data-theme={theme}>
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
        theme={theme}
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
              {detailVideo ? (
                <div className="detail-image is-video">
                  <video
                    key={detailVideo}
                    src={`/${detailVideo}`}
                    poster={projectFile ? `/${projectFile}` : undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={`Recorded walkthrough of ${project.fullName || project.name}`}
                  />
                </div>
              ) : !previewFile ? (
                /* No cover for this one yet. A blank box rather than a stand-in
                   image, and not a button: there is nothing to open. */
                <div className="detail-image is-blank" />
              ) : (
                <button
                  ref={imageTriggerRef}
                  className={`detail-image${project.previewAspect ? " is-shaped" : ""}${
                    previewHint ? "" : " is-plain"
                  }`}
                  style={
                    project.previewAspect
                      ? { "--preview-aspect": project.previewAspect }
                      : undefined
                  }
                  type="button"
                  onClick={openViewer}
                  aria-label={`Open full-screen prototype preview for ${project.fullName || project.name}`}
                >
                  {/* Usually the same source the carousel has in its atlas, but a
                      project can point the panel somewhere else: the card is small
                      enough to hide detail that reads plainly at panel size. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/${previewFile}`}
                    alt={
                      project.previewAlt ||
                      `Prototype preview for ${project.fullName || project.name}`
                    }
                  />
                  {previewHint ? (
                    <span className="detail-image-hint" aria-hidden="true">
                      <span>{previewHint}</span>
                      <span>↗</span>
                    </span>
                  ) : null}
                </button>
              )}
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
              <figure className="about-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/emily.jpg" alt="Emily Hope" />
              </figure>
              <div className="about-copy">
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
            className={`image-viewer-stage ${
              zoom > MIN_ZOOM ? "is-zoomed" : ""
            }`}
            onPointerDown={(event) => {
              if (zoom === MIN_ZOOM) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                originX: imageOffset.x,
                originY: imageOffset.y,
              };
            }}
            onPointerMove={(event) => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              setImageOffset({
                x: dragRef.current.originX + event.clientX - dragRef.current.x,
                y: dragRef.current.originY + event.clientY - dragRef.current.y,
              });
            }}
            onPointerUp={(event) => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              dragRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {project && previewFile ? (
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
