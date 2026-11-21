import type { RefObject } from "react";
import { useWindowScrolled } from "../hooks/useWindowScrolled";
import { CircleHelp, Plus, UserRound } from "@/components/icons";
import HeaderNav, { headerDestination } from "../components/HeaderNav";
import { Button } from "../components/ui/button";
import type { Destination } from "../navigation";

type Badges = {
  savedSearches: number;
  unreadMatches: number;
  unreadMessages: number;
};

/** The top bar: brand, destinations, Sell, the intro and settings. */
export default function AppHeader({
  destination,
  settingsOpen,
  badges,
  settingsLabel,
  helpButton,
  onHome,
  onNavigate,
  onHelp,
}: {
  destination: Destination;
  settingsOpen: boolean;
  badges: Badges;
  settingsLabel: string;
  helpButton: RefObject<HTMLButtonElement | null>;
  onHome: () => void;
  onNavigate: (destination: Destination) => void;
  onHelp: () => void;
}) {
  // Read here, so only the header renders again when the page leaves its top.
  const scrolled = useWindowScrolled();
  return (
    <header className="app-header" data-scrolled={scrolled || undefined}>
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onHome();
        }}
        aria-label="Browse takeover listings"
      >
        takeover
      </a>
      <HeaderNav
        active={headerDestination(destination)}
        savedSearches={badges.savedSearches}
        unreadMatches={badges.unreadMatches}
        unreadMessages={badges.unreadMessages}
        onNavigate={onNavigate}
      />
      <div className="header-actions">
        <Button
          animateIcon
          className="button primary sell-nav"
          data-prefetch="sell"
          onClick={() => onNavigate("sell")}
        >
          <Plus size={17} aria-hidden="true" />
          <span className="header-action-label">Sell an item</span>
        </Button>
        <Button
          ref={helpButton}
          className="icon-button help-nav"
          data-prefetch="intro"
          aria-label="How it works"
          onClick={onHelp}
        >
          <CircleHelp size={20} aria-hidden="true" />
          <span className="header-action-label">How it works</span>
        </Button>
        <Button
          className={`icon-button${settingsOpen ? " active" : ""}`}
          data-prefetch="settings"
          aria-current={settingsOpen ? "page" : undefined}
          aria-label={settingsLabel}
          onClick={() => onNavigate("settings")}
        >
          <UserRound size={20} />
        </Button>
      </div>
    </header>
  );
}
