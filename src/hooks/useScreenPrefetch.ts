import type { AccountConnection } from "../cloud/connection";
import type { View } from "../navigation";
import {
  AccountSettings,
  AdminArea,
  Auth,
  ComparePage,
  DeveloperSettings,
  LIKELY_NEXT,
  ListingConversation,
  LocalSettings,
  MessagesPage,
  Onboarding,
  SellFlow,
} from "../screens";
import { useIntentPrefetch } from "./useIntentPrefetch";

/** Loads the screens the student is likely to open next, and the one a pointer heads for. */
export function useScreenPrefetch({
  account,
  view,
  comparing,
  introInvited,
}: {
  account: AccountConnection | undefined;
  view: View;
  /** Two or more listings wait to be compared. */
  comparing: boolean;
  /** The intro is being offered. */
  introInvited: boolean;
}) {
  useIntentPrefetch(
    {
      sell: () =>
        Promise.all([SellFlow.prefetch(), ListingConversation.prefetch()]),
      messages: MessagesPage.prefetch,
      compare: ComparePage.prefetch,
      settings: () =>
        Promise.all([
          account?.session
            ? AccountSettings.prefetch()
            : account
              ? Auth.prefetch()
              : LocalSettings.prefetch(),
          DeveloperSettings.prefetch(),
        ]),
      admin: AdminArea.prefetch,
      intro: Onboarding.prefetch,
    },
    [
      ...(LIKELY_NEXT[view] ?? []),
      ...(comparing ? (["compare"] as const) : []),
      ...(introInvited ? (["intro"] as const) : []),
    ],
  );
}
