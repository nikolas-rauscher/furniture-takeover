import MobileNav from "../MobileNav";
import CompareTray from "../components/CompareTray";
import Toast from "../components/Toast";
import type { Comparison } from "../hooks/useComparison";
import type { Toasts } from "../hooks/useToast";
import type { Destination } from "../navigation";

/** What rests over the bottom of the app: the mobile bar, the comparison tray and the note. */
export default function AppFooter({
  destination,
  pageKey,
  badges,
  onNavigate,
  compare,
  trayVisible,
  onCompare,
  toast,
  toastOnTop,
}: {
  destination: Destination;
  /** Identifies the page on screen; each page restores its own scroll position. */
  pageKey: string;
  badges: { unreadMatches: number; unreadMessages: number };
  onNavigate: (destination: Destination) => void;
  compare: Comparison;
  /** The page shows listings that can be compared, and no dialog covers it. */
  trayVisible: boolean;
  onCompare: () => void;
  toast: Toasts;
  /** The page's composer or main action rests at the bottom, so the note shows on top. */
  toastOnTop: boolean;
}) {
  return (
    <>
      <MobileNav
        active={destination === "settings" ? null : destination}
        pageKey={pageKey}
        onNavigate={onNavigate}
        newMatches={badges.unreadMatches}
        unreadMessages={badges.unreadMessages}
      />
      <CompareTray
        count={compare.items.length}
        visible={compare.items.length > 0 && trayVisible}
        onCompare={onCompare}
        onClear={compare.clear}
      />
      <Toast
        message={toast.notice?.message || ""}
        placement={toastOnTop ? "top" : "bottom"}
        mood={toast.notice?.mood}
        action={toast.notice?.action}
        onDismiss={() => toast.say("")}
      />
    </>
  );
}
