import { motion } from "motion/react";
import type { MobileDestination } from "../MobileNav";
import { Button } from "./ui/button";

export type HeaderDestination =
  "browse" | "searches" | "favorites" | "messages" | "account";

/** The phone tab bar's destinations, named as on the pages they open. */
const items: { id: HeaderDestination; label: string }[] = [
  { id: "browse", label: "Find" },
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

/** Desktop navigation: a pill glides to the page on screen, like the phone tab bar. */
export default function HeaderNav(props: HeaderNavProps) {
  const { active, savedSearches, unreadMatches, unreadMessages, onNavigate } =
    props;
  return (
    <nav aria-label="Main navigation">
      {items.map(({ id, label }) => (
        <Button
          key={id}
          className="header-nav-item"
          aria-current={active === id ? "page" : undefined}
          aria-label={itemName(id, label, props)}
          onClick={() => onNavigate(id)}
        >
          {active === id && (
            // Measured only when the page changes: a pill that loads or moves
            // with its tab stays put, and glides only to another tab.
            <motion.span
              layoutId="header-nav-highlight"
              layoutDependency={active}
              className="header-nav-highlight"
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              aria-hidden="true"
            />
          )}
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
