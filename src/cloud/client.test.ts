import test from "node:test";
import assert from "node:assert/strict";
import { readAuthRedirect } from "./client.ts";
import {
  configureCloud,
  getCloudClient,
  restoreAccountSession,
} from "./session.ts";

test("invitations remove token fragments while ordinary PKCE callbacks and app routes remain intact", () => {
  const invite = new URL(
    "https://takeover.example/#access_token=access&refresh_token=refresh&type=invite&expires_in=3600",
  );
  assert.deepEqual(readAuthRedirect(invite), {
    invitation: { access_token: "access", refresh_token: "refresh" },
    error: "",
  });
  assert.equal(invite.href, "https://takeover.example/#settings");
  for (const link of [
    "https://takeover.example/?code=pkce-code",
    "https://takeover.example/#messages",
  ]) {
    const url = new URL(link);
    assert.deepEqual(readAuthRedirect(url), { invitation: null, error: "" });
    assert.equal(url.href, link);
  }
  for (const hash of [
    "#type=invite&access_token=incomplete",
    "#error=access_denied&error_description=expired",
    "?error=access_denied&code=secret",
  ]) {
    const url = new URL("https://takeover.example/" + hash);
    const redirect = readAuthRedirect(url);
    assert.equal(redirect.invitation, null);
    assert.match(redirect.error, /invalid or has expired/);
    assert.equal(url.href, "https://takeover.example/#settings");
  }
});

test("invitation sessions are verified with Supabase once and invalid sessions do not complete setup", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  const originalHistory = Object.getOwnPropertyDescriptor(
    globalThis,
    "history",
  );
  t.after(() => {
    getCloudClient()?.auth.stopAutoRefresh();
    configureCloud(null);
    globalThis.fetch = originalFetch;
    for (const [key, original] of [
      ["location", originalLocation],
      ["history", originalHistory],
    ] as const) {
      if (original) Object.defineProperty(globalThis, key, original);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    { sub: "test-user", exp: Math.floor(Date.now() / 1000) + 3600 },
    "test-signature",
  ]
    .map((part, i) =>
      i < 2
        ? Buffer.from(JSON.stringify(part)).toString("base64url")
        : Buffer.from(part as string).toString("base64url"),
    )
    .join(".");
  const url = new URL(
    `https://takeover.example/#access_token=${jwt}&refresh_token=test-refresh&type=invite`,
  );
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: url,
  });
  Object.defineProperty(globalThis, "history", {
    configurable: true,
    value: {
      state: null,
      replaceState: (_state: unknown, _title: string, target: string) => {
        url.href = String(target);
      },
    },
  });
  let checks = 0,
    valid = true;
  globalThis.fetch = async (input, init) => {
    checks++;
    assert.equal(input, "https://example.supabase.co/auth/v1/user");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      `Bearer ${jwt}`,
    );
    assert.equal(url.hash, "#settings");
    return new Response(
      JSON.stringify(
        valid
          ? {
              id: "test-user",
              aud: "authenticated",
              email_confirmed_at: "2026-11-01",
            }
          : { message: "Invalid token" },
      ),
      {
        status: valid ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  const config = {
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_publishable_test",
  };
  configureCloud(config);
  const first = restoreAccountSession();
  assert.equal(first, restoreAccountSession());
  const accepted = await first;
  assert.equal(accepted.session?.user.id, "test-user");
  assert.equal(accepted.invited, true);
  assert.equal(accepted.error, "");
  assert.equal(checks, 1);
  getCloudClient()!.auth.stopAutoRefresh();
  valid = false;
  url.hash = `access_token=${jwt}&refresh_token=test-refresh&type=invite`;
  configureCloud(config);
  const rejected = await restoreAccountSession();
  assert.equal(rejected.session, null);
  assert.equal(rejected.invited, false);
  assert.match(rejected.error, /Could not open/);
});
