// Ring order is portfolio order. Reordering this array moves the artwork,
// project index, metadata, and overlay content together.
export const PROJECTS = [
  {
    file: "project-01.jpg",
    name: "Emily's Desktop",
    fullName: "Emily's Desktop",
    type: "Personal",
    year: "2026",
    role: "Designer and builder",
    description:
      "A living desktop of notes, tools, and experiments — a personal operating system for how Emily thinks and works.",
    href: "https://emilysdesk.top",
    linkLabel: "Open Emily's Desktop",
    external: true,
  },
  {
    file: "project-02.jpg",
    name: "BUILD",
    fullName: "BUILD",
    type: "Roblox",
    year: "2026",
    role: "Designer",
    description:
      "Roblox BUILD: the gathering of creators, engineers, and designers shaping what gets made next.",
  },
  {
    file: "project-03.jpg",
    name: "Planning Mode",
    fullName: "Roblox Studio's Assistant in Planning Mode",
    type: "Product design",
    year: "2026",
    role: "Designer",
    description:
      "Giving Roblox's AI Assistant a place to collaborate with the creator before it acts. Creators review and direct intent before any creation begins.",
    href: "/portfolio-site.html#/work/planning-mode",
    linkLabel: "View full case study",
  },
  {
    file: "project-04.jpg",
    name: "Skills",
    fullName: "Roblox Studio has Skills",
    type: "Systems design",
    year: "2025–26",
    role: "Designer",
    description:
      "A system for teaching an assistant new abilities: the architecture, the settings, and the conventions that keep it legible to creators.",
    href: "/portfolio-site.html#/work/skills",
    linkLabel: "View full case study",
  },
  {
    file: "project-05.jpg",
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
];

export const IMAGE_FILES = PROJECTS.map((p) => p.file);
