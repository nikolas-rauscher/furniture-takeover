import type {
  Deal,
  DealAction,
  DealEvent,
  DealRole,
  PickupAction,
  PickupEvent,
  PickupStatusChange,
  pickupDay,
} from "../../shared/deal.ts";
import type { Product } from "../../shared/marketplace.ts";
import type { SellerConversation } from "../../shared/messages.ts";

export type DealListing = Pick<
  Product,
  "id" | "title" | "seller" | "status"
> & {
  image?: string;
  buyerKey?: string;
};

export type DealStatusChange = "reserved" | PickupStatusChange;

export type DealResult = {
  deal: Deal;
  statusChange?: DealStatusChange;
  conversation?: SellerConversation;
};

type DealTarget = {
  conversationId?: string;
  listing?: DealListing;
  role: DealRole;
};

type DealCommand<Action> = {
  action: Action;
  text: string;
  expectedVersion: number;
  messageId?: string;
};

type ThreadEventDetails = {
  id: string;
  messageId: string | null;
  actorRole: DealRole | null;
  at: string;
};
export type ThreadDealEvent = DealEvent & ThreadEventDetails;
export type ThreadPickupEvent = PickupEvent & ThreadEventDetails;

type DealHistoryApi = {
  unavailable: string;
  pickupUnavailable: string;
  load: (id: string) => Promise<{
    events: ThreadDealEvent[];
    pickupEvents: ThreadPickupEvent[];
  }>;
  subscribe: (id: string, refresh: () => void) => () => void;
};

type ListingAgreement = {
  threadId: string;
  other: string;
  cancel: (
    text: string,
    messageId: string,
  ) => Promise<DealStatusChange | undefined>;
  /** Present for a shipping deal, which Mark sold completes. */
  completeShipping?: (
    text: string,
    messageId: string,
  ) => Promise<DealStatusChange | undefined>;
  pickup?: {
    day: NonNullable<ReturnType<typeof pickupDay>>;
    deal: Deal;
    send: (
      action: PickupAction,
      text: string,
      messageId: string,
    ) => Promise<DealStatusChange | undefined>;
  };
};

export type DealsApi = {
  submit: (
    target: DealTarget,
    command: DealCommand<DealAction>,
  ) => Promise<DealResult>;
  pickup: (
    target: DealTarget,
    command: DealCommand<PickupAction>,
  ) => Promise<DealResult>;
  listingAgreement: (
    listing: Product,
    knownAgreement: boolean,
  ) => Promise<ListingAgreement | undefined>;
  history?: DealHistoryApi;
};
