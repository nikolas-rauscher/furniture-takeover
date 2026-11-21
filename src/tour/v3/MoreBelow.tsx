import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";

/** The share of the last item that counts as seen, so a sliver at the edge still cues. */
const SEEN = 0.6;

/**
 * A hint that more follows, shown in the footer while the step's last item is mostly out
 * of view. In the footer it takes its own room, so it never covers what it points to; it
 * is not shown when nothing more follows.
 */
export default function MoreBelow({
  last,
  label,
}: {
  /** The step's last item, found within the step. */
  last: string;
  /** The words of the hint; answers by default. */
  label?: string;
}) {
  const { v3 } = useTourText();
  const marker = useRef<HTMLSpanElement>(null);
  const [footer, setFooter] = useState<Element | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const step = marker.current?.closest(".ob-step");
    const target = step?.querySelector(last);
    if (!step || !target)
      throw new Error(`The step has no last item ${last} to watch.`);
    setFooter(step.closest("main")?.querySelector(".ob-footer") ?? null);
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.intersectionRatio < SEEN),
      { root: step.closest(".ob-body"), threshold: [0, SEEN, 1] },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [last]);

  return (
    <>
      <span ref={marker} hidden />
      {footer &&
        hidden &&
        createPortal(
          <p className="tour-more-below" aria-hidden="true">
            {label ?? v3.moreBelow}
            <ChevronDown size={16} strokeWidth={2.4} />
          </p>,
          footer,
        )}
    </>
  );
}
