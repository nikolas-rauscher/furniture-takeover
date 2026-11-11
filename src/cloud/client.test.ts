import test from "node:test";
import assert from "node:assert/strict";
import { readAuthRedirect } from "./client.ts";
import {
  configureCloud,
  getCloudClient,
  restoreAccountSession,
  requiresPasswordSetup,
  completePasswordSetup,
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
  assert.equal(requiresPasswordSetup(accepted.session), true);
  assert.equal(accepted.error, "");
  assert.equal(checks, 1);
  getCloudClient()!.auth.stopAutoRefresh();
  valid = false;
  url.hash = `access_token=${jwt}&refresh_token=test-refresh&type=invite`;
  configureCloud(config);
  const rejected = await restoreAccountSession();
  assert.equal(rejected.session, null);
  assert.equal(rejected.invited, false);
  assert.equal(requiresPasswordSetup(rejected.session), false);
  assert.match(rejected.error, /Could not open/);
});

test("password recovery survives a late UI listener and only completes after saving", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  t.after(() => {
    getCloudClient()?.auth.stopAutoRefresh();
    configureCloud(null);
    globalThis.fetch = originalFetch;
    if (originalLocation)
      Object.defineProperty(globalThis, "location", originalLocation);
    else Reflect.deleteProperty(globalThis, "location");
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: new URL("https://takeover.example/#settings"),
  });
  const user = {
    id: "recovering-user",
    aud: "authenticated",
    email: "tester@example.com",
  };
  const config = {
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_publishable_test",
  };
  let savedPassword = "";
  let tokenExchanges = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (url.pathname.endsWith("/recover")) {
      assert.ok(body.code_challenge);
      return Response.json({});
    }
    if (url.pathname.endsWith("/token")) {
      tokenExchanges++;
      assert.equal(url.searchParams.get("grant_type"), "pkce");
      assert.ok(body.code_verifier);
      return Response.json({
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    if (url.pathname.endsWith("/user") && init?.method === "PUT") {
      savedPassword = body.password;
      return Response.json(user);
    }
    throw new Error(`Unexpected auth request: ${url.pathname}`);
  };
  configureCloud(config);
  const client = getCloudClient()!;
  assert.equal(
    (await client.auth.resetPasswordForEmail(user.email)).error,
    null,
  );
  assert.equal(
    (await client.auth.exchangeCodeForSession("test-recovery-code")).error,
    null,
  );

  // Bootstrap/React can subscribe after the SDK has already consumed the link.
  const lateEvents: string[] = [];
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event) => {
    lateEvents.push(event);
  });
  t.after(() => subscription.unsubscribe());
  const restored = await restoreAccountSession();
  assert.equal(restored.session?.user.id, user.id);
  assert.equal(restored.invited, false);
  assert.equal(lateEvents.includes("PASSWORD_RECOVERY"), false);
  assert.equal(requiresPasswordSetup(restored.session), true);
  assert.equal(
    requiresPasswordSetup({
      ...restored.session!,
      user: { ...restored.session!.user, id: "another-user" },
    }),
    false,
  );
  assert.equal(savedPassword, "");
  assert.equal(tokenExchanges, 1);

  assert.equal(
    (await client.auth.updateUser({ password: "test-new-password" })).error,
    null,
  );
  assert.equal(savedPassword, "test-new-password");
  completePasswordSetup();
  assert.equal(
    requiresPasswordSetup((await restoreAccountSession()).session),
    false,
  );
});

test("ordinary sign-ins and failed recovery links never request password setup", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  t.after(() => {
    getCloudClient()?.auth.stopAutoRefresh();
    configureCloud(null);
    globalThis.fetch = originalFetch;
    if (originalLocation)
      Object.defineProperty(globalThis, "location", originalLocation);
    else Reflect.deleteProperty(globalThis, "location");
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: new URL("https://takeover.example/#settings"),
  });
  globalThis.fetch = async (input) => {
    assert.equal(
      new URL(String(input)).searchParams.get("grant_type"),
      "password",
    );
    return Response.json({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      user: { id: "ordinary-user", aud: "authenticated" },
    });
  };
  configureCloud({
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "sb_publishable_test",
  });
  const client = getCloudClient()!;
  assert.ok(
    (await client.auth.exchangeCodeForSession("invalid-code-without-verifier"))
      .error,
  );
  assert.equal(
    requiresPasswordSetup((await restoreAccountSession()).session),
    false,
  );
  assert.equal(
    (
      await client.auth.signInWithPassword({
        email: "tester@example.com",
        password: "test-password",
      })
    ).error,
    null,
  );
  assert.equal(
    requiresPasswordSetup((await client.auth.getSession()).data.session),
    false,
  );
});
