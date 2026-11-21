import type { InboxDeals } from "./useInboxDeals";
import { homeDealNews, homeGuide } from "../pakoMoods";
import { useAgentAssist } from "./useAgentAssist";
import type { PakoStatus } from "./usePakoStatus";
import type { SearchSession } from "./useSearchSession";

/**
 * What Pako says on home and the searches he suggests while the student
 * types: news of a deal, new matches, a photo being read, or a nudge to search.
 */
export function useHomeGuide({
  search,
  pako,
  home,
  location,
  firstDeal,
  unreadMatches,
  now,
}: {
  search: SearchSession;
  pako: PakoStatus;
  /** Home is on screen. */
  home: boolean;
  location: string;
  firstDeal: InboxDeals["homeDeals"][number] | undefined;
  unreadMatches: number;
  now: Date;
}) {
  const { criteria, photo } = search;
  const suggestions = useAgentAssist(
    pako.configured && home && !search.running
      ? {
          intent: "search",
          text: search.query,
          context: {
            location,
            currentQuery: criteria.query,
            maxPrice: criteria.maxPrice,
            radius: criteria.radius,
            pickupBy: criteria.pickup,
          },
        }
      : null,
  );
  const guide = homeGuide({
    allowanceUsed: pako.quotaExhausted,
    photo: photo.dragging
      ? "dragging"
      : photo.busy
        ? "reading"
        : (photo.notice ?? (photo.hint ? "hint" : null)),
    deal: firstDeal
      ? homeDealNews({
          deal: firstDeal.item.deal,
          role: firstDeal.item.role,
          other: firstDeal.item.otherName,
          title: firstDeal.listing.title,
          now,
        })
      : null,
    unreadMatches,
    suggestionsLoading: suggestions.status === "loading",
    typing: search.fieldFocused || search.query.trim().length > 0,
    location,
  });
  return { suggestions, guide };
}
