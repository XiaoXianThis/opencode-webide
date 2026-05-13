import { beforeEach, describe, expect, it } from "bun:test";

const { THEME_STORAGE_KEY, applyTheme, useThemeStore } = await import("../theme");

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  useThemeStore.setState({ mode: "dark" });
});

describe("theme store", () => {
  it("hydrates persisted light mode onto the html element", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("toggles and persists dark/light mode", () => {
    useThemeStore.getState().setMode("dark");
    useThemeStore.getState().toggle();

    expect(useThemeStore.getState().mode).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("applyTheme keeps HeroUI/Tailwind html classes mutually exclusive", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
