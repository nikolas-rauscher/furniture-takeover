import type { DealAction, DealRole } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import { randomUuid } from "../randomUuid";
function workspace() {
  const key = "takeover-message-workspace";
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomUuid();
    localStorage.setItem(key, id);
  }
  return id;
}
async function request(init?: RequestInit, path = "/api/messages") {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Message-Workspace": workspace(),
    },
  });
  const body = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(body.error?.message ?? "Messages are unavailable. Please try again."),
      { key: body.error?.code },
    );
  return body;
}
export async function listMessages(): Promise<SellerConversation[]> {
  return (await request()).conversations;
}
export async function sendMessage(
  listing: { id: string; title: string; seller: string; image?: string },
  text: string,
  sender: "buyer" | "seller" = "buyer",
  messageId: string = randomUuid(),
): Promise<SellerConversation> {
  return (
    await request({
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        title: listing.title,
        image: listing.image,
        seller: listing.seller,
        text,
        sender,
        messageId,
      }),
    })
  ).conversation;
}

export async function setConversationDeleted(
  id: string,
  deleted: boolean,
): Promise<SellerConversation> {
  return (
    await request({
      method: deleted ? "DELETE" : "PATCH",
      body: JSON.stringify({ id }),
    })
  ).conversation;
}

export type DealListing = Pick<
  Product,
  "id" | "title" | "seller" | "status"
> & { image?: string; buyerKey?: string };
export async function sendDemoDeal(
  listing: DealListing,
  sender: DealRole,
  action: DealAction,
  text: string,
  expectedVersion: number,
  messageId = randomUuid(),
): Promise<{
  conversation: SellerConversation;
  statusChange?: "active" | "reserved";
}> {
  return request(
    {
      method: "POST",
      body: JSON.stringify({
        listingId: listing.id,
        title: listing.title,
        seller: listing.seller,
        buyerKey: listing.buyerKey,
        listingStatus: listing.status,
        sender,
        action,
        text,
        expectedVersion,
        messageId,
      }),
    },
    "/api/messages/deal",
  );
}
