// Ring order is portfolio order. Reordering this array moves the artwork,
// project index, metadata, and overlay content together.
export const PROJECTS = [
  {
    file: "project-01.jpg",
    darkFile: "project-01-dark.jpg",
    name: "Emily's Desktop",
    fullName: "Emily's Desktop",
    type: "Personal",
    year: "2026",
    role: "Designer and builder",
    description:
      "A living desktop of notes, tools, and experiments: a personal operating system for how I think and work. A 1 to 1 reflection of my desktop.",
    href: "https://emilysdesk.top",
    linkLabel: "Open Emily's Desktop",
    external: true,
    // A recorded walkthrough of the desk, seated in an iMac mockup that is cut
    // at the ring plane's own 1.5:1 so neither placement needs crop correction.
    // `file` stays the poster: it is already on the atlas, so it covers the
    // wait for the first frame and is what shows if the video cannot play. It is
    // the card cut's own opening frame, so the handover is invisible.
    //
    // Two cuts, because the ring card is a few hundred pixels wide and the
    // detail panel is several times that. The panel cut pushes in on the notes,
    // the dock, and Studio; at card size those moves just read as a cropped
    // slab, so the card holds the whole monitor throughout.
    video: "emilys-desktop-card.mp4",
    darkVideo: "emilys-desktop-card-dark.mp4",
    detailVideo: "emilys-desktop-panel.mp4",
    darkDetailVideo: "emilys-desktop-panel-dark.mp4",
  },
  {
    file: "project-02.jpg",
    darkFile: "project-02-dark.jpg",
    name: "BUILD",
    fullName: "BUILD",
    type: "Roblox",
    year: "2026",
    role: "Designer",
    description:
      "Roblox BUILD: the gathering of creators, engineers, and designers shaping what gets made next.",
    // The project is private, so the panel shows a chat with nothing in it yet:
    // the mobile shell, the composer, and the prompt, and no real work. The card
    // keeps the home screen, where at atlas size nothing on it is legible.
    previewFile: "build-new-chat.jpg",
    darkPreviewFile: "build-new-chat-dark.jpg",
    previewAlt: "A new chat in the BUILD mobile app, waiting on a first prompt",
    // The still is a whole phone, so the panel has to shape its box to the shot
    // or the crop takes the header and the composer off both ends.
    previewAspect: "3 / 2",
    // No label over it: this one opens a screenshot, not a prototype, and there
    // is nothing here to go and try.
    previewHint: "",
  },
  {
    // Lightweight card cuts keep the main ring moving without making it fetch
    // the sharper panel encodes until a project is opened.
    file: "planning-mode.jpg",
    darkFile: "planning-mode-dark.jpg",
    video: "planning-mode-card.mp4",
    darkVideo: "planning-mode-card-dark.mp4",
    detailVideo: "planning-mode-panel.mp4",
    darkDetailVideo: "planning-mode-panel-dark.mp4",
    name: "Planning Mode",
    fullName: "Roblox Studio's Assistant in Planning Mode",
    type: "Roblox Studio",
    year: "2026",
    role: "Designer",
    description:
      "Giving Roblox's AI Assistant a place to collaborate with the creator before it acts. Creators review and direct intent before any creation begins.",
    href: "/portfolio-site.html#/work/planning-mode",
    linkLabel: "View full case study",
  },
  {
    file: "skills.jpg",
    darkFile: "skills-dark.jpg",
    video: "skills-card.mp4",
    darkVideo: "skills-card-dark.mp4",
    detailVideo: "skills-panel.mp4",
    darkDetailVideo: "skills-panel-dark.mp4",
    name: "Skills",
    fullName: "Roblox Studio has Skills",
    type: "Roblox Studio",
    year: "2025–26",
    role: "Designer",
    description:
      "A system for teaching an assistant new abilities: the architecture, the settings, and the conventions that keep it legible to creators.",
    href: "/portfolio-site.html#/work/skills",
    linkLabel: "View full case study",
  },
  {
    name: "Studio for Designers",
    fullName: "Roblox Studio for Designers",
    type: "Design resource",
    year: "2025",
    role: "Designer and prototyper",
    description:
      "A working prototype made by a designer, for designers — built as a real application so the hard questions answered themselves at fidelity.",
    href: "/portfolio-site.html#/work/ai-native-studio",
    linkLabel: "View full case study",
  },
  {
    name: "Asset Permissions",
    fullName: "Asset Permissions",
    type: "Roblox",
    year: "2025–26",
    role: "Designer",
    description:
      "Designing clear, scalable controls for who can use and manage assets across experiences, groups, and teams.",
  },
];

const darkKey = (key) => `dark${key[0].toUpperCase()}${key.slice(1)}`;

// Theme variants stay beside the project they belong to. Light is the base
// asset and dark falls back to it, so projects without a second rendering do
// not need duplicate metadata.
export const projectMedia = (project, key, theme) =>
  theme === "dark" ? project?.[darkKey(key)] || project?.[key] : project?.[key];

// One entry per card, in ring order, so a cell index is a project index. A
// project without a cover contributes null and its cell keeps the blank fill.
export const imageFilesFor = (theme) =>
  PROJECTS.map((project) => projectMedia(project, "file", theme) ?? null);

// The ring still binds one video sampler. Its source follows the centred card,
// so only one decoder and one texture are active even when several projects
// have moving covers.
export const videoFilesFor = (theme) =>
  PROJECTS.map((project) => projectMedia(project, "video", theme) ?? null);
