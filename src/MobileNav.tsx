import {
  BottomNavigation,
  BottomNavigationHighlight,
  BottomNavigationHighlightItem,
  BottomNavigationItem,
  BottomNavigationLabel,
} from "@animate-ui/react/primitives/bottom-navigation";
import { Button } from "./components/ui/button";
import {
  MessageCircle,
  Heart,
  House,
  Search,
  SquarePlus,
  Package,
} from "@/components/icons";
import "./mobile-nav.css";

export type MobileDestination =
  "browse" | "searches" | "sell" | "favorites" | "account" | "messages";

type MobileNavProps = {
  active: MobileDestination | null;
  onNavigate: (destination: MobileDestination) => void;
  badges?: Partial<Record<MobileDestination, number>>;
};

const destinations = [
  { id: "browse", label: "Browse", Icon: House },
  { id: "searches", label: "Searches", Icon: Search },
  { id: "sell", label: "Sell", Icon: SquarePlus },
  { id: "favorites", label: "Saved", Icon: Heart },
  { id: "messages", label: "Messages", Icon: MessageCircle },
  { id: "account", label: "My listings", Icon: Package },
] as const;

export default function MobileNav({
  active,
  onNavigate,
  badges,
}: MobileNavProps) {
  return (
    <BottomNavigation
      className="mobile-nav"
      aria-label="Mobile navigation"
      value={active ?? ""}
      scrollBehavior="none"
      onValueChange={(value) => {
        if (value !== active) onNavigate(value as MobileDestination);
      }}
    >
      <BottomNavigationHighlight className="mobile-nav-highlight">
        <ul className="mobile-nav-items">
          {destinations.map(({ id, label, Icon }) => (
            <li key={id}>
              <BottomNavigationHighlightItem value={id}>
                <BottomNavigationItem value={id} asChild>
                  <Button
                    className={`mobile-nav-item${id === "sell" ? " mobile-nav-sell" : ""}`}
                    type="button"
                    aria-label={
                      (id === "account" ? "My listings" : label) +
                      (badges?.[id] ? `, ${badges[id]} new` : "")
                    }
                  >
                    <Icon
                      size={id === "sell" ? 26 : 22}
                      strokeWidth={active === id ? 2 : 1.65}
                      aria-hidden="true"
                    />
                    <BottomNavigationLabel>
                      {id === "account" ? "Listings" : label}
                    </BottomNavigationLabel>
                    {Boolean(badges?.[id]) && (
                      <span
                        className="mobile-nav-badge"
                        aria-hidden="true"
                      >
                        {badges?.[id]}
                      </span>
                    )}
                  </Button>
                </BottomNavigationItem>
              </BottomNavigationHighlightItem>
            </li>
          ))}
        </ul>
      </BottomNavigationHighlight>
    </BottomNavigation>
  );
}
