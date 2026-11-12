import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export type CloudConfig = { supabaseUrl: string; supabaseKey: string };
/** Supabase dashboard invitations use a token fragment, rather than a PKCE code. */
export function readAuthRedirect(url: URL) {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const access_token = fragment.get("access_token"),
    refresh_token = fragment.get("refresh_token");
  const invite = fragment.get("type") === "invite";
  const failed =
    fragment.has("error") ||
    fragment.has("error_description") ||
    url.searchParams.has("error") ||
    url.searchParams.has("error_description");
  const invitation =
    invite && access_token && refresh_token && !failed
      ? { access_token, refresh_token }
      : null;
  const error =
    failed || (invite && !invitation)
      ? "This sign-in link is invalid or has expired. Ask for a new invitation or reset your password."
      : "";
  if (invitation || error) {
    url.hash = "settings";
    for (const key of ["error", "error_description", "error_code", "code"])
      url.searchParams.delete(key);
  }
  return { invitation, error };
}
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
