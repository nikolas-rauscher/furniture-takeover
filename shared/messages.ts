export type ChatMessage = {
  id: string;
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
  deletedAt?: string;
  messages: ChatMessage[];
};
