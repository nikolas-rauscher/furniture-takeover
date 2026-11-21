import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CloudConfig } from "./client.ts";

/** The account SDK, imported only once the server configures accounts. */
export function cloudClient(config: CloudConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { flowType: "pkce" },
  });
}

export type CreateCloudClient = typeof cloudClient;
