import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") return window.matchMedia(MOBILE_QUERY).matches;
  return window.innerWidth < 768;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}
