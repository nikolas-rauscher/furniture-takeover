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
  onNavigate: (destination: HeaderDestination) => void;
};

function searchesName(label: string, saved: number, unread: number) {
  return unread > 0
    ? `${label} (${saved} saved, ${unread} new matches)`
    : `${label} (${saved} saved)`;
}

/** Desktop navigation: a pill glides to the page on screen, like the phone tab bar. */
export default function HeaderNav({
  active,
  savedSearches,
  unreadMatches,
  onNavigate,
}: HeaderNavProps) {
  return (
    <nav aria-label="Main navigation">
      {items.map(({ id, label }) => (
        <Button
          key={id}
          className="header-nav-item"
          aria-current={active === id ? "page" : undefined}
          aria-label={
            id === "searches"
              ? searchesName(label, savedSearches, unreadMatches)
              : undefined
          }
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
            <span className="nav-count" aria-hidden="true">
              {savedSearches}
            </span>
          )}
          {id === "searches" && unreadMatches > 0 && (
            <span className="nav-count unread" aria-hidden="true">
              {unreadMatches}
            </span>
          )}
        </Button>
      ))}
    </nav>
  );
}
