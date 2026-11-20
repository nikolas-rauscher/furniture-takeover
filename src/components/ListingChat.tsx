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
import { Button } from "./ui/button";
import "./listing-chat.css";

/** Room kept above Pako when the column brings him into view. */
const REVEAL_MARGIN = 12;

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

/**
 * Scrolls the least that shows the whole element, or its top when it is taller than
 * the column.
 */
function scrollToShow(element: HTMLElement, column: HTMLElement) {
  const top =
    element.getBoundingClientRect().top -
    column.getBoundingClientRect().top +
    column.scrollTop;
  const bottom = top + element.offsetHeight;
  const room = column.clientHeight - 2 * REVEAL_MARGIN;
  const shownTop = column.scrollTop + REVEAL_MARGIN;
  const target =
    element.offsetHeight > room || top < shownTop
      ? top - REVEAL_MARGIN
      : bottom > shownTop + room
        ? bottom - room - REVEAL_MARGIN
        : column.scrollTop;
  if (target !== column.scrollTop)
    column.scrollTo({ top: target, behavior: motionBehavior() });
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
  const pako = useRef<HTMLElement | null>(null);
  const [pakoNode, setPakoNode] = useState<HTMLElement | null>(null);
  useScrollFade(column, { size: 24, shrink: 0, blur: 0 });
  const away = useOutOfView(pakoNode, column);
  const mark = useCallback((node: HTMLElement | null) => {
    pako.current = node;
    setPakoNode(node);
  }, []);
  const reveal = useCallback(() => {
    if (pako.current && column.current)
      scrollToShow(pako.current, column.current);
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
            <div className="listing-chat-column">
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
