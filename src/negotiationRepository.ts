import type { SellerConversation } from "../shared/messages.ts";
import {
  negotiationSchema,
  markNegotiationSent,
  type Negotiation,
  type NegotiationUpdate,
} from "../shared/negotiation.ts";

export interface NegotiationRepository {
  list(): Negotiation[];
  save(value: Negotiation, expectedVersion: number): void;
}
export function mergeNegotiationSnapshot(
  items: Negotiation[],
  value: Negotiation,
  expectedVersion: number,
): Negotiation[] {
  const next = negotiationSchema.parse(value);
  const current = items.find((item) => item.id === next.id);
  if (
    (current?.version ?? 0) !== expectedVersion ||
    next.version !== expectedVersion + 1 ||
    (current &&
      (current.listingId !== next.listingId || current.status !== "draft"))
  )
    throw new Error(
      "This proposal changed in another view. Reopen it to use the latest details.",
    );
  if (!current && items.length >= 100)
    throw new Error("The local proposal limit has been reached.");
  return [...items.filter((item) => item.id !== next.id), next];
}
/** Storage is injected so the UI and domain logic don't depend on localStorage. */
export function createNegotiationRepository(
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
): NegotiationRepository {
  const list = () => {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = negotiationSchema.array().max(100).parse(JSON.parse(raw));
    if (new Set(parsed.map((item) => item.id)).size !== parsed.length)
      throw new Error("Duplicate saved proposals.");
    return parsed;
  };
  return {
    list,
    save(value, expectedVersion) {
      storage.setItem(
        key,
        JSON.stringify(
          mergeNegotiationSnapshot(list(), value, expectedVersion),
        ),
      );
    },
  };
}
export function applyNegotiationUpdate(
  repo: NegotiationRepository,
  event: NegotiationUpdate,
) {
  // Re-delivery is idempotent; an older/different revision remains a conflict.
  const current = repo.list().find((item) => item.id === event.negotiation.id);
  if (
    current?.version === event.negotiation.version &&
    JSON.stringify(current) === JSON.stringify(event.negotiation)
  )
    return;
  repo.save(event.negotiation, event.previousVersion);
}

/** One-time repair for drafts saved before successful sends closed proposals. */
export function reconcileDeliveredDrafts(
  repo: NegotiationRepository,
  snapshot: Negotiation[],
  conversations: SellerConversation[],
) {
  for (const draft of snapshot) {
    if (draft.status !== "draft" || !draft.draft) continue;
    const delivered = conversations.some(
      (conversation) =>
        conversation.listingId === draft.listingId &&
        conversation.messages.some(
          (message) =>
            message.sender === "buyer" &&
            message.text.trim() === draft.draft!.message.trim(),
        ),
    );
    if (!delivered) continue;
    const current = repo.list().find((item) => item.id === draft.id);
    // A draft edited while the inbox was loading must not be closed.
    if (
      !current ||
      current.version !== draft.version ||
      current.status !== "draft"
    )
      continue;
    repo.save(markNegotiationSent(current, current.version), current.version);
  }
}
