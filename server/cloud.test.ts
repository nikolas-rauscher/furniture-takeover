import test from "node:test";
import assert from "node:assert/strict";
import { createCloud } from "./cloud.ts";
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
