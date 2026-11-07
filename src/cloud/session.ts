import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { cloudClient, readAuthRedirect, type CloudConfig } from "./client.ts";
let client: SupabaseClient | null = null;
let scope = "";
let redirect: ReturnType<typeof readAuthRedirect> | null = null;
let initialSession: Promise<{
  session: Session | null;
  error: string;
  invited: boolean;
}> | null = null;
export function configureCloud(config: CloudConfig | null) {
  if (config) {
    const url = new URL(location.href);
    redirect = readAuthRedirect(url);
    // Remove invitation credentials before the SDK initializes and any UI is rendered.
    if (redirect.invitation || redirect.error)
      history.replaceState(history.state, "", url);
  } else redirect = null;
  initialSession = null;
  client = config ? cloudClient(config) : null;
  scope = client ? "guest" : "";
}
export function getCloudClient() {
  return client;
}
/** Redeem a one-time invitation once, including React Strict Mode remounts. */
export function restoreAccountSession() {
  const connection = client;
  if (!connection) throw new Error("Accounts are not configured.");
  return (initialSession ??= (async () => {
    if (redirect?.error) {
      const current = await connection.auth.getSession();
      return {
        session: current.data.session,
        error: redirect.error,
        invited: false,
      };
    }
    const initialized = await connection.auth.initialize();
    const result = initialized.error
      ? { data: { session: null }, error: initialized.error }
      : redirect?.invitation
        ? await connection.auth.setSession(redirect.invitation)
        : await connection.auth.getSession();
    if (result.error) {
      const url = new URL(location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("sb_flow_id");
      url.hash = "settings";
      history.replaceState(history.state, "", url);
    }
    return {
      session: result.data.session,
      error: result.error
        ? "Could not open this sign-in link or restore your session. Sign in below, or request a new link."
        : "",
      invited: Boolean(
        redirect?.invitation && result.data.session && !result.error,
      ),
    };
  })());
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
