import type {
  DealAction,
  DealRole,
  PickupAction,
  PickupStatusChange,
} from "../../shared/deal";
import type { SellerConversation } from "../../shared/messages";
import type { DealListing, DealStatusChange } from "./deals.ts";
import { randomUuid } from "../randomUuid.ts";

const workspaceKey = "takeover-message-workspace";

export function resetMessageWorkspace(): void {
  localStorage.removeItem(workspaceKey);
}

/** Ends this browser's demo conversations and deals on the server, then starts a new workspace. */
export async function clearMessageWorkspace(): Promise<void> {
  await request({ method: "DELETE" }, "/api/messages/workspace");
  resetMessageWorkspace();
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
    throw new Error("This demo conversation changed. Reopen it to continue.");
  if (!response.ok)
    throw Object.assign(
      new Error(body.error?.message ?? "Messages are unavailable. Try again."),
      { key: body.error?.code },
    );
  return body;
}
export async function listMessages(): Promise<SellerConversation[]> {
  return (await request()).conversations;
}
export async function sendMessage(
  listing: {
    id: string;
    title: string;
    seller: string;
    image?: string;
    buyerKey?: string;
  },
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
        ...(listing.buyerKey ? { buyerKey: listing.buyerKey } : {}),
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

export async function sendDemoDeal(
  listing: DealListing,
  sender: DealRole,
  action: DealAction,
  text: string,
  expectedVersion: number,
  messageId = randomUuid(),
): Promise<{
  conversation: SellerConversation;
  statusChange?: DealStatusChange;
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
): Promise<{
  conversation: SellerConversation;
  statusChange?: PickupStatusChange;
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
        demoNow: demoNow?.toISOString(),
      }),
    },
    "/api/messages/pickup",
  );
}
