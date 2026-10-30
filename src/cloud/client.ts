import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export type CloudConfig = { supabaseUrl: string; supabaseKey: string };
export function cloudClient(config: CloudConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { flowType: "pkce" },
  });
}
export type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  condition: string;
  dimensions: string;
  pickup: string;
  images: string[];
  status: "active" | "reserved" | "sold" | "withdrawn";
  created_at: string;
  pickup_by?: string | null;
  tags?: string[];
};
export type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export function photoUrl(client: SupabaseClient, path: string) {
  return client.storage.from("listing-photos").getPublicUrl(path).data
    .publicUrl;
}
export function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
