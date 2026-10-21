import { useLayoutEffect, useRef, type ReactNode } from "react";
import { motionBehavior } from "../uiMotion";

/** Animate intrinsic content changes without scaling text or reserving empty space. */
export default function SmoothHeight({
  children,
  duration = 280,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const outer = shell.current;
    const inner = content.current;
    if (!outer || !inner) return;
    let previous = inner.getBoundingClientRect().height;
    outer.style.height = `${previous}px`;
    const observer = new ResizeObserver(() => {
      const next = inner.getBoundingClientRect().height;
      if (Math.abs(next - previous) < 0.5) return;
      previous = next;
      outer.style.transition =
        motionBehavior() === "auto"
          ? "none"
          : `height ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      outer.style.height = `${next}px`;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [duration]);
  return (
    <div ref={shell} className="smooth-height">
      <div ref={content} className="smooth-height-content">
        {children}
      </div>
    </div>
  );
}
