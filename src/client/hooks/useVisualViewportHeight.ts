import { useEffect } from "react";

export function useVisualViewportHeight(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const update = () => {
      document.documentElement.style.setProperty("--visual-viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
    };

    update();
    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--visual-viewport-height");
    };
  }, []);
}
