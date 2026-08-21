"use client";

import { useEffect, useState } from "react";
import Carousel from "./Carousel";
import { PROJECTS } from "./ring/projects";

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
  const panelOpen = Boolean(project || aboutOpen);

  useEffect(() => {
    document.body.dataset.overlayOpen = panelOpen ? "true" : "false";
    return () => {
      delete document.body.dataset.overlayOpen;
    };
  }, [panelOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && panelOpen) {
        setProject(null);
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen]);

  const closePanel = () => {
    setProject(null);
    setAboutOpen(false);
  };

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
        onOpenProject={setProject}
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
              <div className="detail-image">
                {/* The carousel uses the same source in its atlas. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/${project.file}`} alt="" />
              </div>
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
    </main>
  );
}
