import type { SellerConversation } from "../../shared/messages";
function workspace() {
  const key = "takeover-message-workspace";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
async function request(init?: RequestInit) {
  const response = await fetch("/api/messages", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Message-Workspace": workspace(),
    },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Messages are unavailable. Please try again.",
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
  messageId: string = crypto.randomUUID(),
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
