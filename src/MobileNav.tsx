import {
  BottomNavigation,
  BottomNavigationAccessory,
  BottomNavigationHighlight,
  BottomNavigationHighlightItem,
  BottomNavigationItem,
  BottomNavigationLabel,
} from "@animate-ui/react/primitives/bottom-navigation";
import { AnimateIcon } from "@animate-ui/react/icons";
import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { useMediaQuery } from "./hooks/useMediaQuery";
import {
  MessageCircle,
  Heart,
  House,
  Search,
  Plus,
  List,
} from "@/components/icons";
import "./mobile-nav.css";

export type MobileDestination =
  "browse" | "searches" | "sell" | "favorites" | "account" | "messages";

type MobileNavProps = {
  active: MobileDestination | null;
  /** Identifies the page on screen; each page restores its own scroll position. */
  pageKey: string;
  onNavigate: (destination: MobileDestination) => void;
  /** New matches for saved searches, counted on the Searches tab. */
  newMatches: number;
  /** Conversations with news from the other student, counted on the Messages tab. */
  unreadMessages: number;
};

/** The count pops whenever it rises, but not when the app opens with it. */
function CountBadge({ count }: { count: number }) {
  const shown = useRef(count);
  const rose = count > shown.current;
  useEffect(() => {
    shown.current = count;
  }, [count]);
  if (!count) return null;
  return (
    <span
      key={count}
      className="mobile-nav-badge"
      data-pop={rose || undefined}
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

const tabs = [
  { id: "browse", label: "Browse", name: "Browse", Icon: House },
  { id: "searches", label: "Searches", name: "Searches", Icon: Search },
  { id: "favorites", label: "Saved", name: "Saved", Icon: Heart },
  { id: "messages", label: "Messages", name: "Messages", Icon: MessageCircle },
  { id: "account", label: "Listings", name: "Listings", Icon: List },
] as const;

/** Floating tab bar: the highlight glides between tabs; Sell sits beside it as the primary action. */
/** A tab's name with its news, such as "Messages, 2 new". */
function tabName(name: string, count: number, unit?: [string, string]) {
  if (!count) return name;
  return unit
    ? `${name}, ${count} new ${count === 1 ? unit[0] : unit[1]}`
    : `${name}, ${count} new`;
}

/** A fresh scroll root for one page, so its restored scroll position is the bar's baseline. */
function pageScrollRoot(pageKey: string | undefined) {
  return { pageKey, ref: { current: null } as { current: HTMLElement | null } };
}

export default function MobileNav({
  active,
  pageKey,
  onNavigate,
  newMatches,
  unreadMessages,
}: MobileNavProps) {
  const counts: Partial<Record<MobileDestination, number>> = {
    searches: newMatches,
    messages: unreadMessages,
  };
  const selling = active === "sell";
  // The bar measures scrolling from where a page starts. A fresh (window) scroll root per
  // page makes a restored scroll position its baseline, so switching tabs never shrinks it.
  const [scrollRoot, setScrollRoot] = useState(() => pageScrollRoot(pageKey));
  if (scrollRoot.pageKey !== pageKey) setScrollRoot(pageScrollRoot(pageKey));
  // Wider screens navigate from the header. The bar is not mounted there, because its
  // size animations cannot run, nor be interrupted, on an element that is not rendered.
  const phone = useMediaQuery("(max-width: 760px)");
  if (!phone) return null;
  return (
    <BottomNavigation
      className="mobile-nav"
      aria-label="Mobile navigation"
      value={active ?? ""}
      scrollBehavior="minimize"
      scrollContainer={scrollRoot.ref}
      onValueChange={(value) => {
        if (value !== active) onNavigate(value as MobileDestination);
      }}
    >
      <BottomNavigationHighlight className="mobile-nav-highlight">
        <ul className="mobile-nav-items">
          {tabs.map(({ id, label, name, Icon }) => (
            <li key={id}>
              <BottomNavigationHighlightItem value={id}>
                <BottomNavigationItem value={id} asChild>
                  <AnimateIcon animateOnTap completeOnStop asChild>
                    <Button
                      className="mobile-nav-item"
                      type="button"
                      data-prefetch={id === "messages" ? id : undefined}
                      aria-label={
                        id === "searches"
                          ? tabName(name, newMatches, ["match", "matches"])
                          : id === "messages"
                            ? tabName(name, unreadMessages)
                            : name
                      }
                    >
                      <Icon
                        size={22}
                        strokeWidth={active === id ? 2 : 1.65}
                        aria-hidden="true"
                      />
                      <BottomNavigationLabel className="mobile-nav-label">
                        {label}
                      </BottomNavigationLabel>
                      <CountBadge count={counts[id] ?? 0} />
                    </Button>
                  </AnimateIcon>
                </BottomNavigationItem>
              </BottomNavigationHighlightItem>
            </li>
          ))}
        </ul>
      </BottomNavigationHighlight>
      <BottomNavigationAccessory className="mobile-nav-accessory">
        <AnimateIcon animateOnTap completeOnStop asChild>
          <Button
            className="mobile-nav-sell"
            type="button"
            data-prefetch="sell"
            aria-label="Sell"
            aria-current={selling ? "page" : undefined}
            onClick={() => {
              if (!selling) onNavigate("sell");
            }}
          >
            <Plus size={24} strokeWidth={2} aria-hidden="true" />
          </Button>
        </AnimateIcon>
      </BottomNavigationAccessory>
    </BottomNavigation>
  );
}
