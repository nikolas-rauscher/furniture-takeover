import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_SEED } from "../shared/demoLogin.ts";
import { demoSellers } from "../shared/demoSellers.ts";
import { createDemoLogin } from "./demo-login.ts";
import { fakeFetch } from "./testing/provider.ts";

const code = "team-demo-code-2026";
const accountId = demoSellers[0].id;

function demoLogin(marker: string | undefined) {
  const calls: { url: string; body: unknown }[] = [];
  const login = createDemoLogin({
    url: "https://example.supabase.co",
    secretKey: "sb_secret_test",
    code,
    fetchImpl: fakeFetch(async (url, init) => {
      calls.push({
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return Response.json({
        id: accountId,
        email: "lea@example.invalid",
        app_metadata: { demo_seed: marker },
        hashed_token: "one-time-token",
        verification_type: "magiclink",
      });
    }),
  });
  return { calls, login };
}

test("the team's code opens a demo student with a one-time token", async () => {
  const { calls, login } = demoLogin(DEMO_SEED);
  assert.equal(await login.open({ code, accountId }), "one-time-token");
  assert.equal(
    calls[0].url,
    `https://example.supabase.co/auth/v1/admin/users/${accountId}`,
  );
  assert.deepEqual(calls[1].body, {
    type: "magiclink",
    email: "lea@example.invalid",
  });
});

test("a wrong code never reaches the accounts", async () => {
  const { calls, login } = demoLogin(DEMO_SEED);
  await assert.rejects(login.open({ code: "wrong", accountId }), {
    code: "DEMO_LINK_INVALID",
    status: 403,
  });
  assert.equal(calls.length, 0);
});

test("an account without the demo marker is never opened", async () => {
  for (const marker of [undefined, "takeover-ebay-v1"]) {
    const { calls, login } = demoLogin(marker);
    await assert.rejects(login.open({ code, accountId }), {
      code: "DEMO_LOGIN_UNAVAILABLE",
    });
    assert.equal(calls.length, 1);
  }
});
