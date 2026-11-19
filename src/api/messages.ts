import type { DealAction, DealRole, PickupAction, PickupStatusChange } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { SellerConversation } from "../../shared/messages";
import { randomUuid } from "../randomUuid.ts";

const workspaceKey = "takeover-message-workspace";

export function resetMessageWorkspace(): void {
  localStorage.removeItem(workspaceKey);
}

export function getMessageWorkspace() {
  let id = localStorage.getItem(workspaceKey);
  if (!id) {
    id = randomUuid();
    localStorage.setItem(workspaceKey, id);
  }
  return id;
}
async function request(init?: RequestInit, path = "/api/messages") {
  const workspaceId = getMessageWorkspace();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Message-Workspace": workspaceId,
    },
  });
  const body = await response.json();
  if (workspaceId !== localStorage.getItem(workspaceKey))
    throw new Error("The demo workspace changed. Reopen the conversation to continue.");
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

export async function sendDemoPickup(
  listing: DealListing,
  sender: DealRole,
  action: PickupAction,
  text: string,
  expectedVersion: number,
  messageId = randomUuid(),
  demoNow?: Date,
): Promise<{ conversation: SellerConversation; statusChange?: PickupStatusChange }> {
  return request({
    method: "POST",
    body: JSON.stringify({
      listingId: listing.id, title: listing.title, seller: listing.seller,
      buyerKey: listing.buyerKey, listingStatus: listing.status,
      sender, action, text, expectedVersion, messageId, demoNow: demoNow?.toISOString(),
    }),
  }, "/api/messages/pickup");
}
