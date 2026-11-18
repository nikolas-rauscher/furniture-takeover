import {
  BottomNavigation,
  BottomNavigationAccessory,
  BottomNavigationHighlight,
  BottomNavigationHighlightItem,
  BottomNavigationItem,
  BottomNavigationLabel,
} from "@animate-ui/react/primitives/bottom-navigation";
import { AnimateIcon } from "@animate-ui/react/icons";
import { useMemo } from "react";
import { Button } from "./components/ui/button";
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
};

const tabs = [
  { id: "browse", label: "Browse", name: "Browse", Icon: House },
  { id: "searches", label: "Searches", name: "Searches", Icon: Search },
  { id: "favorites", label: "Saved", name: "Saved", Icon: Heart },
  { id: "messages", label: "Messages", name: "Messages", Icon: MessageCircle },
  { id: "account", label: "Listings", name: "My listings", Icon: List },
] as const;

/** Floating tab bar: the highlight glides between tabs; Sell sits beside it as the primary action. */
export default function MobileNav({
  active,
  pageKey,
  onNavigate,
}: MobileNavProps) {
  const selling = active === "sell";
  // The bar measures scrolling from where a page starts. A fresh (window) scroll root per
  // page makes a restored scroll position its baseline, so switching tabs never shrinks it.
  const pageScrollRoot = useMemo(
    () => ({ current: null }) as { current: HTMLElement | null },
    [pageKey],
  );
  return (
    <BottomNavigation
      className="mobile-nav"
      aria-label="Mobile navigation"
      value={active ?? ""}
      scrollBehavior="minimize"
      scrollContainer={pageScrollRoot}
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
                      aria-label={name}
                    >
                      <Icon
                        size={22}
                        strokeWidth={active === id ? 2 : 1.65}
                        aria-hidden="true"
                      />
                      <BottomNavigationLabel className="mobile-nav-label">
                        {label}
                      </BottomNavigationLabel>
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
