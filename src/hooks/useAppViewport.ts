import { useEffect } from "react";

/** Keep the conversation and its composer inside the visible phone viewport. */
export function useAppViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const visual = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 760px)");
    let baseline = window.innerHeight;
    let width = window.innerWidth;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        const editing =
          active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLInputElement &&
            !["checkbox", "radio", "file", "button", "submit"].includes(
              active.type,
            )) ||
          (active instanceof HTMLElement && active.isContentEditable);
        const height = visual?.height ?? window.innerHeight;
        const unzoomed = !visual || Math.abs(visual.scale - 1) < 0.05;
        if (Math.abs(window.innerWidth - width) > 40 || !editing) {
          baseline = window.innerHeight;
          width = window.innerWidth;
        }
        const keyboard =
          mobile.matches && unzoomed && editing && baseline - height > 120;
        if (mobile.matches && unzoomed)
          root.style.setProperty("--app-viewport-height", `${height}px`);
        else root.style.removeProperty("--app-viewport-height");
        root.toggleAttribute("data-keyboard-open", keyboard);
        root.toggleAttribute(
          "data-compact-viewport",
          mobile.matches && unzoomed && height < 460,
        );
      });
    };
    update();
    visual?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      root.style.removeProperty("--app-viewport-height");
      root.removeAttribute("data-keyboard-open");
      root.removeAttribute("data-compact-viewport");
    };
  }, []);
}
