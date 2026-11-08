import test from "node:test";
import assert from "node:assert/strict";
import { createCloud } from "./cloud.ts";
import { AgentError } from "./errors.ts";
test("cloud config is opt-in and rejects missing or privileged credentials", () => {
  assert.equal(createCloud({}), undefined);
  assert.throws(
    () => createCloud({ SUPABASE_URL: "https://example.supabase.co" }),
    /both/,
  );
  assert.throws(
    () =>
      createCloud({
        SUPABASE_URL: "http://example.com",
        SUPABASE_PUBLISHABLE_KEY: "test",
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      createCloud({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      }),
    /never a secret/,
  );
  const token = `a.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.c`;
  assert.throws(
    () =>
      createCloud({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: token,
      }),
    /publishable or anon/,
  );
});

test("daily quotas use the caller's session and fail closed on database errors", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let result: unknown = {
    allowed: true,
    limit: 50,
    remaining: 49,
    resetAt: "2026-12-01T00:00:00Z",
  };
  let status = 200;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://example.supabase.co/rest/v1/rpc/ai_quota");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer alice",
    );
    assert.deepEqual(JSON.parse(init?.body as string), { spend: true });
    return new Response(JSON.stringify(result), { status });
  };
  const cloud = createCloud({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  })!;
  assert.equal((await cloud.quota("Bearer alice", true)).remaining, 49);
  for (const invalid of [
    null,
    {},
    { ...(result as object), remaining: -1 },
    { ...(result as object), resetAt: "bad date" },
  ]) {
    result = invalid;
    await assert.rejects(
      cloud.quota("Bearer alice", true),
      (e) => e instanceof AgentError && e.code === "QUOTA_UNAVAILABLE",
    );
  }
  status = 503;
  await assert.rejects(
    cloud.quota("Bearer alice", true),
    /temporarily unavailable/,
  );
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };
  await assert.rejects(
    cloud.quota("Bearer alice", true),
    /temporarily unavailable/,
  );
});
test("cloud AI authorization verifies user and applies a per-user budget", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let valid = true;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify(
        valid
          ? {
              id: "user-a",
              email_confirmed_at: "2026-10-01",
              aud: "authenticated",
            }
          : { message: "Invalid token" },
      ),
      {
        status: valid ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  const cloud = createCloud({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  })!;
  await assert.rejects(cloud.authorize(undefined), /Sign in/);
  valid = false;
  await assert.rejects(cloud.authorize("Bearer invalid"), /confirmed/);
  valid = true;
  for (let i = 0; i < 20; i++) await cloud.authorize("Bearer valid");
  await assert.rejects(cloud.authorize("Bearer valid"), /wait a minute/);
});

test("temporary local test allowance is scoped to a confirmed account and disabled by default", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let email = "tester@example.com";
  globalThis.fetch = async (url) =>
    new Response(
      JSON.stringify(
        String(url).endsWith("/auth/v1/user")
          ? {
              id: "tester",
              email,
              email_confirmed_at: "2026-01-01",
              aud: "authenticated",
            }
          : {
              allowed: false,
              limit: 50,
              remaining: 0,
              resetAt: new Date(Date.now() + 3600000).toISOString(),
            },
      ),
    );
  const env = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    LOCAL_AI_TEST_EMAIL: email,
    LOCAL_AI_TEST_UNTIL: new Date(Date.now() + 3600000).toISOString(),
  };
  assert.equal((await createCloud(env)!.quota("Bearer tester")).remaining, 0);
  assert.equal(
    (
      await createCloud(
        { ...env, NODE_ENV: "production" },
        { localTesting: true },
      )!.quota("Bearer tester")
    ).remaining,
    0,
  );
  assert.equal(
    (
      await createCloud(
        {
          ...env,
          LOCAL_AI_TEST_UNTIL: new Date(Date.now() - 1000).toISOString(),
        },
        { localTesting: true },
      )!.quota("Bearer tester")
    ).remaining,
    0,
  );
  assert.equal(
    (
      await createCloud(
        {
          ...env,
          LOCAL_AI_TEST_UNTIL: new Date(Date.now() + 172800000).toISOString(),
        },
        { localTesting: true },
      )!.quota("Bearer tester")
    ).remaining,
    0,
  );
  const local = createCloud(env, { localTesting: true })!;
  assert.equal((await local.quota("Bearer tester")).remaining, 250);
  for (let i = 0; i < 250; i++)
    assert.equal((await local.quota("Bearer tester", true)).allowed, true);
  assert.equal((await local.quota("Bearer tester", true)).allowed, false);
  email = "other@example.com";
  assert.equal((await local.quota("Bearer other")).limit, 50);
});
