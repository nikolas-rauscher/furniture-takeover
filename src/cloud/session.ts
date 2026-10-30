import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudClient, type CloudConfig } from "./client.ts";
let client: SupabaseClient | null = null;
let scope = "";
export function configureCloud(config: CloudConfig | null) {
  client = config ? cloudClient(config) : null;
  scope = client ? "guest" : "";
}
export function getCloudClient() {
  return client;
}
export function setAccountScope(userId?: string) {
  scope = client ? (userId ?? "guest") : "";
}
export function accountStorageKey(key: string) {
  return scope ? `${key}:account:${scope}` : key;
}
export async function accountAccessToken() {
  if (!client) return undefined;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error("Sign in to use the assistant.");
  return data.session.access_token;
}
