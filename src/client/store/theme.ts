import { create } from "zustand";

export type ThemeMode = "dark" | "light";

interface ThemeState {
  mode: ThemeMode;
  hydrate: () => void;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const THEME_STORAGE_KEY = "webide.theme";

function readPersistedTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore quota / privacy mode
  }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.classList.toggle("light", mode === "light");
  document.documentElement.dataset.theme = mode;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readPersistedTheme() ?? "dark",

  hydrate: () => {
    const mode = readPersistedTheme() ?? get().mode;
    applyTheme(mode);
    set({ mode });
  },

  setMode: (mode) => {
    applyTheme(mode);
    persistTheme(mode);
    set({ mode });
  },

  toggle: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
}));
