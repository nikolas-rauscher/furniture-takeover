import { useEffect, useState, type CSSProperties } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const PHONE = "(max-width: 760px)";

type Area = { top: number; height: number };

/** The focused field stays in view after the sheet shrinks for the keyboard. */
function keepFocusInView() {
  const focused = document.activeElement;
  if (focused?.matches("input, textarea"))
    focused.scrollIntoView({ block: "nearest" });
}

/**
 * On phones the study's sheet covers the visible part of the page only, so an
 * open keyboard or the browser's bars never hide the field or Continue.
 */
export function useVisibleArea(): CSSProperties | undefined {
  const phone = useMediaQuery(PHONE);
  const [area, setArea] = useState<Area | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    // Browsers without it lay the sheet over the whole window, as on desktop.
    if (!phone || !viewport) return;
    const follow = () =>
      setArea({ top: viewport.offsetTop, height: viewport.height });
    follow();
    viewport.addEventListener("resize", follow);
    viewport.addEventListener("scroll", follow);
    return () => {
      viewport.removeEventListener("resize", follow);
      viewport.removeEventListener("scroll", follow);
      setArea(null);
    };
  }, [phone]);
  useEffect(() => {
    if (area) keepFocusInView();
  }, [area]);
  return area
    ? { top: area.top, height: area.height, bottom: "auto" }
    : undefined;
}
