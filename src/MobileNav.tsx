import {
  MessageCircle,
  Heart,
  House,
  Search,
  SquarePlus,
  Package,
} from "lucide-react";
import "./mobile-nav.css";

export type MobileDestination =
  "browse" | "searches" | "sell" | "favorites" | "account" | "messages";

type MobileNavProps = {
  active: MobileDestination | null;
  onNavigate: (destination: MobileDestination) => void;
};

const destinations = [
  { id: "browse", label: "Browse", Icon: House },
  { id: "searches", label: "Searches", Icon: Search },
  { id: "sell", label: "Sell", Icon: SquarePlus },
  { id: "favorites", label: "Saved", Icon: Heart },
  { id: "messages", label: "Messages", Icon: MessageCircle },
  { id: "account", label: "My listings", Icon: Package },
] as const;

export default function MobileNav({ active, onNavigate }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <div className="mobile-nav-items">
        {destinations.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`mobile-nav-item${id === "sell" ? " mobile-nav-sell" : ""}`}
            type="button"
            aria-current={active === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon
              size={id === "sell" ? 28 : 23}
              strokeWidth={active === id ? 2 : 1.65}
              aria-hidden="true"
            />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
