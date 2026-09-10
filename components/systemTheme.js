"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onChange) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const snapshot = () =>
  window.matchMedia(QUERY).matches ? "dark" : "light";

// The server has no system preference to inspect. Light is only the hydration
// snapshot; useSyncExternalStore reads the real preference as soon as the
// client takes over and keeps listening if it changes while the site is open.
const serverSnapshot = () => "light";

export function useSystemTheme() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
