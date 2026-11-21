import { useEffect, useState, type CSSProperties } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const PHONE = "(max-width: 760px)";
/**
 * How much smaller than the screen the visible area must be to count as an open
 * keyboard. The browser's bars take less, so they never resize the sheet.
 */
const KEYBOARD_MIN_PX = 120;

type Area = { top: number; height: number };

/** The focused field stays in view after the sheet shrinks for the keyboard. */
function keepFocusInView() {
  const focused = document.activeElement;
  if (focused?.matches("input, textarea"))
    focused.scrollIntoView({ block: "nearest" });
}

/** The height the page holds for its layout; see `holdScreenHeight`. */
function screenHeight() {
  const held = getComputedStyle(document.documentElement).getPropertyValue(
    "--tour-screen-height",
  );
  const height = Number.parseFloat(held);
  if (Number.isNaN(height))
    throw new Error("The tour's screen height is not held.");
  return height;
}

const typing = () =>
  document.activeElement?.matches("input, textarea") ?? false;

/**
 * On phones the study's sheet keeps the screen's height, so the browser's bars
 * collapsing never resize it. Only an open keyboard shrinks it to the visible
 * part of the page, so the field and Continue stay in view while typing.
 */
export function useVisibleArea(): CSSProperties | undefined {
  const phone = useMediaQuery(PHONE);
  const [area, setArea] = useState<Area | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    // Browsers without it keep the sheet at the screen's height, as without a keyboard.
    if (!phone || !viewport) return;
    const follow = () => {
      const keyboard =
        typing() && viewport.height < screenHeight() - KEYBOARD_MIN_PX;
      setArea(
        keyboard ? { top: viewport.offsetTop, height: viewport.height } : null,
      );
    };
    follow();
    viewport.addEventListener("resize", follow);
    viewport.addEventListener("scroll", follow);
    document.addEventListener("focusin", follow);
    document.addEventListener("focusout", follow);
    return () => {
      viewport.removeEventListener("resize", follow);
      viewport.removeEventListener("scroll", follow);
      document.removeEventListener("focusin", follow);
      document.removeEventListener("focusout", follow);
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
