import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CloudConfig } from "./client.ts";
import { demoSessionStorage } from "./demoLogin.ts";

/** The account SDK, imported only once the server configures accounts. */
export function cloudClient(config: CloudConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { flowType: "pkce", ...demoSessionStorage() },
  });
}

export type CreateCloudClient = typeof cloudClient;
