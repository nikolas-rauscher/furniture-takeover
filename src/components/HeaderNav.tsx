import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { TAB_GLIDE, type MobileDestination } from "../MobileNav";
import { Button } from "./ui/button";

export type HeaderDestination =
  "browse" | "searches" | "favorites" | "messages" | "account";

/** The phone tab bar's destinations, named as on the pages they open. */
const items: { id: HeaderDestination; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "searches", label: "Searches" },
  { id: "favorites", label: "Saved" },
  { id: "messages", label: "Messages" },
  { id: "account", label: "My listings" },
];

/** Selling and settings have no tab; they open from the header's actions. */
export function headerDestination(
  destination: MobileDestination | "settings",
): HeaderDestination | null {
  if (destination === "sell" || destination === "settings") return null;
  return destination;
}

type HeaderNavProps = {
  active: HeaderDestination | null;
  savedSearches: number;
  /** Matches for saved searches the student has not opened yet. */
  unreadMatches: number;
  /** Conversations with news from the other student. */
  unreadMessages: number;
  onNavigate: (destination: HeaderDestination) => void;
};

function searchesName(label: string, saved: number, unread: number) {
  if (!unread) return `${label} (${saved} saved)`;
  return `${label} (${saved} saved, ${unread} new ${unread === 1 ? "match" : "matches"})`;
}

/** What each tab says to assistive technology; tabs without news keep their label. */
function itemName(
  id: HeaderDestination,
  label: string,
  { savedSearches, unreadMatches, unreadMessages }: HeaderNavProps,
) {
  if (id === "searches")
    return searchesName(label, savedSearches, unreadMatches);
  if (id === "messages" && unreadMessages)
    return `${label} (${unreadMessages} new)`;
  return undefined;
}

/**
 * The active tab's pill, placed from the tab's offset within the nav, so page
 * scroll never enters its path. It glides when the page changes, follows its tab
 * at once when a label's width changes, and fades in after a page without a tab.
 */
function TabPill({ active }: { active: HeaderDestination | null }) {
  const pill = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const width = useMotionValue(0);
  const opacity = useMotionValue(0);
  const shown = useRef<HeaderDestination | null>(null);
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    // The nav is found from the pill itself: on the first render a child's layout
    // effect runs before React attaches its parent's ref.
    const element = pill.current?.parentElement;
    if (!element) throw new Error("The tab pill must sit inside the nav.");
    const activeTab = () =>
      element.querySelector<HTMLElement>('[aria-current="page"]');
    const tab = activeTab();
    if (!tab) {
      opacity.jump(0);
      shown.current = null;
      return;
    }
    if (shown.current === null || reduce) {
      x.jump(tab.offsetLeft);
      width.jump(tab.offsetWidth);
      if (reduce) opacity.jump(1);
      else animate(opacity, 1, { duration: 0.15 });
    } else {
      animate(x, tab.offsetLeft, TAB_GLIDE);
      animate(width, tab.offsetWidth, TAB_GLIDE);
    }
    shown.current = active;
    const follow = new ResizeObserver(() => {
      const current = activeTab();
      if (!current) return;
      x.jump(current.offsetLeft);
      width.jump(current.offsetWidth);
    });
    for (const child of element.children) follow.observe(child);
    return () => follow.disconnect();
  }, [active, reduce, x, width, opacity]);
  return (
    <motion.span
      ref={pill}
      className="header-nav-highlight"
      style={{ x, width, opacity }}
      aria-hidden="true"
    />
  );
}

/** Desktop navigation: a pill glides to the page on screen, like the phone tab bar. */
export default function HeaderNav(props: HeaderNavProps) {
  const { active, savedSearches, unreadMatches, unreadMessages, onNavigate } =
    props;
  return (
    <nav aria-label="Main navigation">
      <TabPill active={active} />
      {items.map(({ id, label }) => (
        <Button
          key={id}
          className="header-nav-item"
          data-prefetch={id === "messages" ? id : undefined}
          aria-current={active === id ? "page" : undefined}
          aria-label={itemName(id, label, props)}
          onClick={() => onNavigate(id)}
        >
          <span className="header-nav-label">{label}</span>
          {id === "searches" && (
            <span
              className="nav-count"
              data-new={unreadMatches > 0 || undefined}
              aria-hidden="true"
            >
              {unreadMatches > 0 ? `${unreadMatches} new` : savedSearches}
            </span>
          )}
          {id === "messages" && unreadMessages > 0 && (
            <span className="nav-count" data-new aria-hidden="true">
              {unreadMessages} new
            </span>
          )}
        </Button>
      ))}
    </nav>
  );
}
