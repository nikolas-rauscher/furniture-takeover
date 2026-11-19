import { motion } from "motion/react";
import type { MobileDestination } from "../MobileNav";
import { Button } from "./ui/button";

export type HeaderDestination = "browse" | "searches" | "messages" | "account";

const items: { id: HeaderDestination; label: string }[] = [
  { id: "browse", label: "Find" },
  { id: "searches", label: "Saved searches" },
  { id: "messages", label: "Messages" },
  { id: "account", label: "My listings" },
];

/** Saved listings live on the My listings page; selling and settings have no tab. */
export function headerDestination(
  destination: MobileDestination | "settings",
): HeaderDestination | null {
  if (destination === "favorites") return "account";
  if (destination === "sell" || destination === "settings") return null;
  return destination;
}

type HeaderNavProps = {
  active: HeaderDestination | null;
  savedSearches: number;
  onNavigate: (destination: HeaderDestination) => void;
};

/** Desktop navigation: a pill glides to the page on screen, like the phone tab bar. */
export default function HeaderNav({
  active,
  savedSearches,
  onNavigate,
}: HeaderNavProps) {
  return (
    <nav aria-label="Main navigation">
      {items.map(({ id, label }) => (
        <Button
          key={id}
          className="header-nav-item"
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          {active === id && (
            <motion.span
              layoutId="header-nav-highlight"
              className="header-nav-highlight"
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              aria-hidden="true"
            />
          )}
          <span className="header-nav-label">{label}</span>
          {id === "searches" && (
            <span className="nav-count">{savedSearches}</span>
          )}
        </Button>
      ))}
    </nav>
  );
}
