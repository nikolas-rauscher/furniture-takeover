import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import { ChevronDown } from "@/components/icons";
import { motionBehavior } from "../uiMotion";
import { revealTop } from "./listingReveal";
import { Button } from "./ui/button";
import "./listing-chat.css";

type PakoPlace = {
  /** Marks the element where Pako speaks now. */
  mark: (node: HTMLElement | null) => void;
  /** Brings Pako's current words into view. */
  reveal: () => void;
};

const PakoPlaceContext = createContext<PakoPlace | null>(null);

/** Where Pako speaks in the listing column; only inside a ListingChat. */
export function usePakoPlace() {
  const place = use(PakoPlaceContext);
  if (!place) throw new Error("usePakoPlace must be used inside ListingChat.");
  return place;
}

/** The input with which the student scrolls the column by hand. */
const HAND_SCROLL = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/** An element ListingChat always renders, read once it is on the page. */
function rendered<T>(ref: RefObject<T | null>): T {
  if (!ref.current) throw new Error("ListingChat has not rendered its column.");
  return ref.current;
}

/**
 * Brings Pako's words into view with the least scrolling from where the student
 * left the column. Until they scroll it by hand, the column follows the listing as
 * it settles: whenever the column, its content or Pako changes size, it is aligned
 * anew in the same frame, so lines that leave after Pako spoke (his working line,
 * the card's "Pako is writing…") do not keep the draft's top scrolled away.
 */
function usePakoReveal(
  column: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  pako: RefObject<HTMLElement | null>,
  pakoNode: HTMLElement | null,
) {
  /** Where the student left the column; null once they scroll it by hand. */
  const origin = useRef<number | null>(null);
  /** Where the column was last sent. */
  const aim = useRef(0);
  const align = useCallback(
    (cause: "reveal" | "layout") => {
      const scroller = rendered(column);
      const block = pako.current;
      if (!block || origin.current === null) return;
      // Still gliding to the last place (as far as the content still reaches): the new
      // one is sent even if the column is there now.
      const furthest = scroller.scrollHeight - scroller.clientHeight;
      const gliding =
        Math.abs(scroller.scrollTop - Math.min(aim.current, furthest)) >= 1;
      aim.current = revealTop(
        {
          top:
            block.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top +
            scroller.scrollTop,
          height: block.offsetHeight,
        },
        { height: scroller.clientHeight, scrollHeight: scroller.scrollHeight },
        origin.current,
      );
      if (!gliding && Math.abs(aim.current - scroller.scrollTop) < 1) return;
      // A glide goes on to the new place; a column at rest moves with the layout, in the same frame.
      scroller.scrollTo({
        top: aim.current,
        behavior: cause === "layout" && !gliding ? "auto" : motionBehavior(),
      });
    },
    [column, pako],
  );
  const reveal = useCallback(() => {
    const scroller = rendered(column);
    if (origin.current === null) {
      origin.current = scroller.scrollTop;
      aim.current = scroller.scrollTop;
    }
    align("reveal");
  }, [column, align]);
  useEffect(() => {
    const scroller = rendered(column);
    const inner = rendered(content);
    const follow = new ResizeObserver(() => align("layout"));
    for (const element of [scroller, inner, ...inner.children, pakoNode])
      if (element) follow.observe(element);
    const release = () => {
      origin.current = null;
    };
    for (const type of HAND_SCROLL)
      scroller.addEventListener(type, release, { passive: true });
    return () => {
      follow.disconnect();
      for (const type of HAND_SCROLL)
        scroller.removeEventListener(type, release);
    };
  }, [column, content, pakoNode, align]);
  return reveal;
}

/** Whether the element is out of the column's view. */
function useOutOfView(
  element: HTMLElement | null,
  column: RefObject<HTMLElement | null>,
) {
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!element || !column.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAway(!entry.isIntersecting),
      { root: column.current },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, column]);
  return element !== null && away;
}

/**
 * Writing a listing: the card, Pako and what is still needed share one scrolling
 * column, above a dock with the composer and the save actions. Nothing overlaps;
 * the Latest pill shows only once Pako has scrolled out of view.
 */
export default function ListingChat({
  card,
  needed,
  dock,
  children,
}: {
  card: ReactNode;
  /** What the listing still needs, under the conversation. */
  needed: ReactNode;
  dock: ReactNode;
  children: ReactNode;
}) {
  const column = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pako = useRef<HTMLElement | null>(null);
  const [pakoNode, setPakoNode] = useState<HTMLElement | null>(null);
  useScrollFade(column, { size: 24, shrink: 0, blur: 0 });
  const away = useOutOfView(pakoNode, column);
  const reveal = usePakoReveal(column, content, pako, pakoNode);
  const mark = useCallback((node: HTMLElement | null) => {
    pako.current = node;
    setPakoNode(node);
  }, []);
  const place = useMemo(() => ({ mark, reveal }), [mark, reveal]);
  return (
    <PakoPlaceContext value={place}>
      <div className="listing-chat">
        <div className="listing-chat-frame">
          <div
            ref={column}
            className="listing-chat-scroll"
            role="region"
            aria-label="Your listing"
            tabIndex={0}
          >
            <div ref={content} className="listing-chat-column">
              {card}
              {children}
              {needed}
            </div>
          </div>
          <AnimatePresence>
            {away && (
              <motion.div
                className="listing-chat-latest"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Latest from Pako"
                  onClick={reveal}
                >
                  <ChevronDown size={16} aria-hidden="true" />
                  Latest
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="listing-chat-dock">{dock}</div>
      </div>
    </PakoPlaceContext>
  );
}
