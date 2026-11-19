import type { Deal, DealEvent } from "./deal.ts";
export type ChatMessage = {
  id: string;
  deal?: DealEvent;
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
  systemEvents?: {kind:"superseded";at:string}[];
  deletedAt?: string;
  messages: ChatMessage[];
};
