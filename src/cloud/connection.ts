import type { Session, SupabaseClient } from "@supabase/supabase-js";

/** The signed-in student's Supabase client and session. */
export type AccountConnection = {
  client: SupabaseClient;
  session: Session | null;
};
