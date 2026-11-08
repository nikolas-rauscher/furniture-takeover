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

const anonKey = `a.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.c`;
const lan = {
  SUPABASE_URL: "https://app.example/supabase/",
  SUPABASE_INTERNAL_URL: "http://192.168.1.20:8000",
  SUPABASE_PUBLISHABLE_KEY: anonKey,
};

test("plain HTTP is accepted only for this machine and private networks", () => {
  for (const host of [
    "localhost:54321",
    "127.0.0.1:8000",
    "[::1]:8000",
    "10.0.0.5:8000",
    "172.16.4.2:8000",
    "172.31.0.1:8000",
    "192.168.1.20:8000",
    "100.64.0.9:8000",
  ])
    assert.ok(
      createCloud({
        SUPABASE_URL: `http://${host}`,
        SUPABASE_PUBLISHABLE_KEY: anonKey,
      }),
      host,
    );
  for (const host of [
    "example.com",
    "8.8.8.8:8000",
    "172.32.0.1:8000",
    "192.169.1.1:8000",
    "100.128.0.1:8000",
    "supabase.lan:8000",
  ])
    assert.throws(
      () =>
        createCloud({
          SUPABASE_URL: `http://${host}`,
          SUPABASE_PUBLISHABLE_KEY: anonKey,
        }),
      /HTTPS/,
      host,
    );
  assert.throws(
    () => createCloud({ ...lan, SUPABASE_INTERNAL_URL: "http://example.com" }),
    /SUPABASE_INTERNAL_URL requires HTTPS/,
  );
  assert.throws(
    () => createCloud({ ...lan, SUPABASE_INTERNAL_URL: "not a url" }),
    /valid URL/,
  );
});

test("browsers get the public URL while the server uses the internal LAN address", async (t) => {
  const cloud = createCloud(lan)!;
  assert.deepEqual(cloud.config, {
    supabaseUrl: "https://app.example/supabase",
    supabaseKey: anonKey,
  });
  assert.equal(cloud.internalUrl, "http://192.168.1.20:8000");
  assert.ok(!JSON.stringify(cloud.config).includes("192.168"));
  // Without an internal URL the server uses the same address as browsers.
  assert.equal(
    createCloud({ ...lan, SUPABASE_INTERNAL_URL: "" })!.internalUrl,
    "https://app.example/supabase",
  );
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const urls: string[] = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response(
      JSON.stringify({
        allowed: true,
        limit: 50,
        remaining: 49,
        resetAt: "2026-12-01T00:00:00Z",
      }),
    );
  };
  await cloud.quota("Bearer alice");
  assert.deepEqual(urls, ["http://192.168.1.20:8000/rest/v1/rpc/ai_quota"]);
});

test("inventory photo links use the public URL, not the internal address", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (url) => {
    assert.match(
      String(url),
      /^http:\/\/192\.168\.1\.20:8000\/rest\/v1\/listings/,
    );
    return new Response(
      JSON.stringify([
        {
          id: "l1",
          title: "Desk",
          description: "A desk",
          price: 40,
          location: "Lausanne",
          condition: "Good",
          dimensions: "120 × 60 cm",
          status: "active",
          images: ["owner/photo one.jpg"],
          pickup: "weekends",
          pickup_by: null,
          tags: [],
        },
      ]),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  const [item] = await createCloud(lan)!.inventory();
  assert.equal(
    item.image,
    "https://app.example/supabase/storage/v1/object/public/listing-photos/owner/photo%20one.jpg",
  );
  assert.deepEqual(item.images, [item.image]);
});
