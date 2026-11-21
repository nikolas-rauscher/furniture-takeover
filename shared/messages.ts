import type {
  Deal,
  DealEvent,
  PickupEvent,
  PickupStatusChange,
} from "./deal.ts";
export type ChatMessage = {
  id: string;
  deal?: DealEvent;
  pickupEvent?: PickupEvent;
  pickupStatusChange?: PickupStatusChange;
  sender: "buyer" | "seller";
  text: string;
  createdAt: string;
};
export type SellerConversation = {
  id: string;
  listingId: string;
  title: string;
  seller: string;
  image?: string;
  buyerKey?: string;
  deal?: Deal;
  systemEvents?: {
    kind: "superseded" | "pickup_check_due" | "pickup_expired";
    at: string;
  }[];
  deletedAt?: string;
  messages: ChatMessage[];
};
