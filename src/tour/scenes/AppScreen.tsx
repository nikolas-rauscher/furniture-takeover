import { useRef, type ReactNode } from "react";
import {
  PageTransition,
  PageTransitionView,
} from "@/components/animate-ui/components/page-transition";
import MobileNav, { type MobileDestination } from "../../MobileNav";
import { layoutClassName, type View } from "../../navigation";
import AppHeader from "../../shell/AppHeader";
// The app loads this sheet with its shell; the selling and listing layouts rely on it.
import "../../cloud/account.css";

/** The scene is inert: its controls only ever answer the script's taps. */
export const INERT = () => undefined;

const NO_BADGES = { savedSearches: 0, unreadMatches: 0, unreadMessages: 0 };

export type ScenePage = {
  /** Identifies the page; a new key plays the app's page transition. */
  key: string;
  view: View;
  home?: boolean;
  /** The tab the page belongs to. */
  destination: MobileDestination;
  /** Selling's first step is the photo, its second the conversation. */
  sellStep?: 1 | 2;
};

/** The app around a scene's page: the top bar, the page area with its transitions, the tab bar. */
export default function AppScreen({
  page,
  children,
}: {
  page: ScenePage;
  children: ReactNode;
}) {
  const main = useRef<HTMLElement>(null);
  const help = useRef<HTMLButtonElement>(null);
  return (
    <>
      <AppHeader
        destination={page.destination}
        settingsOpen={false}
        badges={NO_BADGES}
        settingsLabel="Open browser settings"
        helpButton={help}
        onHome={INERT}
        onNavigate={INERT}
        onHelp={INERT}
      />
      <div
        className={layoutClassName({
          view: page.view,
          home: page.home ?? false,
          sellMode: "single",
          sellStep: page.sellStep ?? 1,
        })}
      >
        <PageTransition container={main}>
          <main
            ref={main}
            tabIndex={-1}
            className={"main-content view-" + page.view}
          >
            <PageTransitionView key={page.key}>{children}</PageTransitionView>
          </main>
        </PageTransition>
      </div>
      <MobileNav
        active={page.destination}
        onNavigate={INERT}
        newMatches={0}
        unreadMessages={0}
      />
    </>
  );
}
