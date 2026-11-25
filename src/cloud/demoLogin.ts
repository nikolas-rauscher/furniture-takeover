import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_LINK_PARAM,
  DEMO_LOGIN_ROUTE,
  demoLoginResponseSchema,
  type DemoLoginRequest,
} from "../../shared/demoLogin.ts";
import { fail } from "./client.ts";

const TAB_KEY = "takeover-demo-tab";

/** The code of the team's demo link, or null on every other address. */
export const demoLinkCode = () =>
  new URLSearchParams(location.search).get(DEMO_LINK_PARAM);

/**
 * On the demo link each tab keeps its own session, so one browser can be
 * the seller in one tab and the buyer in another.
 */
export function demoSessionStorage() {
  if (!demoLinkCode()) return undefined;
  const tab = sessionStorage.getItem(TAB_KEY) ?? crypto.randomUUID();
  sessionStorage.setItem(TAB_KEY, tab);
  return { storage: sessionStorage, storageKey: `takeover-demo-${tab}` };
}

export async function openDemoAccount(
  client: SupabaseClient,
  request: DemoLoginRequest,
) {
  const response = await fetch(DEMO_LOGIN_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        `The demo login failed with status ${response.status}.`,
    );
  const { tokenHash } = demoLoginResponseSchema.parse(body);
  fail(
    (
      await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      })
    ).error,
  );
}
