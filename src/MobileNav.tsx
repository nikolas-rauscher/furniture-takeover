import {
  BottomNavigation,
  BottomNavigationAccessory,
  BottomNavigationItem,
} from "@animate-ui/react/primitives/bottom-navigation";
import { AnimateIcon } from "@animate-ui/react/icons";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
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

/** A tab's name with its news, such as "Messages, 2 new". */
function tabName(name: string, count: number, unit?: [string, string]) {
  if (!count) return name;
  return unit
    ? `${name}, ${count} new ${count === 1 ? unit[0] : unit[1]}`
    : `${name}, ${count} new`;
}

/** The pill's glide from one tab to the next, shared with the desktop header. */
export const TAB_GLIDE = {
  type: "spring",
  stiffness: 420,
  damping: 36,
} as const;

/**
 * The active tab's pill. Tabs are equally wide, so it moves by whole tab widths
 * with a transform inside the bar: nothing is measured, and neither page scroll
 * nor a page transition can enter its path. Coming back from a page without a
 * tab, it fades in where it belongs.
 */
function TabHighlight({ index }: { index: number }) {
  if (index < 0) return null;
  const x = `${index * 100}%`;
  return (
    <motion.span
      className="mobile-nav-highlight"
      aria-hidden="true"
      initial={{ x, opacity: 0 }}
      animate={{ x, opacity: 1 }}
      transition={{ x: TAB_GLIDE, opacity: { duration: 0.15 } }}
    />
  );
}

/** Floating tab bar: the highlight glides between tabs; Sell sits beside it as the primary action. */
export default function MobileNav({
  active,
  onNavigate,
  newMatches,
  unreadMessages,
}: MobileNavProps) {
  const counts: Partial<Record<MobileDestination, number>> = {
    searches: newMatches,
    messages: unreadMessages,
  };
  const selling = active === "sell";
  // Wider screens navigate from the header, so the bar is only mounted on phones.
  const phone = useMediaQuery("(max-width: 760px)");
  if (!phone) return null;
  return (
    <BottomNavigation
      className="mobile-nav"
      aria-label="Mobile navigation"
      value={active ?? ""}
      onValueChange={(value) => {
        if (value !== active) onNavigate(value as MobileDestination);
      }}
    >
      <div className="mobile-nav-tabs">
        <TabHighlight index={tabs.findIndex(({ id }) => id === active)} />
        <ul className="mobile-nav-items">
          {tabs.map(({ id, label, name, Icon }) => (
            <li key={id}>
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
                    <span className="mobile-nav-label">{label}</span>
                    <CountBadge count={counts[id] ?? 0} />
                  </Button>
                </AnimateIcon>
              </BottomNavigationItem>
            </li>
          ))}
        </ul>
      </div>
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
