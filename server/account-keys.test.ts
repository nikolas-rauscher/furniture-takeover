import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createAccountKeyStore,
  encryptionKey,
  openKey,
  sealKey,
  validateKeyChange,
} from "./account-keys.ts";

test("API keys are encrypted with unique nonces and bound to owner and provider", () => {
  const key = randomBytes(32),
    secret = "not-a-real-provider-key-1234";
  const first = sealKey(secret, "alice", "deepseek", key);
  assert.notEqual(first, sealKey(secret, "alice", "deepseek", key));
  assert.ok(!first.includes(secret));
  assert.equal(openKey(first, "alice", "deepseek", key), secret);
  for (const [owner, provider, encryption] of [
    ["bob", "deepseek", key],
    ["alice", "brave", key],
    ["alice", "deepseek", randomBytes(32)],
  ] as const)
    assert.throws(
      () => openKey(first, owner, provider, encryption),
      /could not be opened/,
    );
  const pieces = first.split(":");
  pieces[3] = (pieces[3][0] === "a" ? "b" : "a") + pieces[3].slice(1);
  assert.throws(
    () => openKey(pieces.join(":"), "alice", "deepseek", key),
    /could not be opened/,
  );
  assert.deepEqual(encryptionKey(key.toString("base64")), key);
  assert.throws(() => encryptionKey("bad-key"));
});

test("key input rejects unsupported providers and unsafe lengths without echoing secrets", () => {
  for (const input of [
    null,
    { provider: "unknown", key: "secret" },
    { provider: "deepseek", key: "tiny" },
    { provider: "deepseek", key: "x".repeat(513) },
    { provider: "brave", key: "contains spaces in secret" },
  ])
    assert.throws(() => validateKeyChange(input, true), /Choose a provider/);
  assert.deepEqual(
    validateKeyChange(
      { provider: "deepseek", key: "  example-secret-key  " },
      true,
    ),
    { provider: "deepseek", key: "example-secret-key" },
  );
  assert.deepEqual(validateKeyChange({ provider: "brave" }, false), {
    provider: "brave",
  });
});

test("Supabase gets only ciphertext and API status never returns the key or payload", async (t) => {
  const key = randomBytes(32),
    secret = "fake-deepseek-secret-9876";
  let record: Record<string, string> | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init);
      assert.equal(
        request.headers.get("authorization"),
        "Bearer alice-session",
      );
      const url = new URL(request.url);
      assert.ok(!url.href.includes(secret));
      if (request.method === "POST") record = await request.json();
      if (request.method === "DELETE") record = undefined;
      const fields = url.searchParams.get("select") ?? "";
      return Response.json(
        request.method !== "GET"
          ? null
          : record
            ? [
                fields.includes("encrypted_key")
                  ? {
                      provider: record.provider,
                      encrypted_key: record.encrypted_key,
                    }
                  : {
                      provider: record.provider,
                      last_four: record.last_four,
                      updated_at: record.updated_at,
                    },
              ]
            : [],
      );
    },
  );
  const store = createAccountKeyStore({
    url: "https://example.supabase.co",
    publishableKey: "public-test",
    encryptionKey: key.toString("base64"),
  });
  const status = await store.change(
    "alice",
    "Bearer alice-session",
    { provider: "deepseek", key: secret },
    true,
  );
  assert.ok(record);
  assert.ok(!JSON.stringify(record).includes(secret));
  assert.equal(status.providers.deepseek.lastFour, "9876");
  assert.ok(!JSON.stringify(status).includes("encrypted_key"));
  assert.deepEqual(await store.credentials("alice", "Bearer alice-session"), {
    deepseek: secret,
  });
  assert.equal(
    (
      await store.change(
        "alice",
        "Bearer alice-session",
        { provider: "deepseek" },
        false,
      )
    ).providers.deepseek.saved,
    false,
  );
  assert.deepEqual(
    await store.credentials("alice", "Bearer alice-session"),
    {},
  );
});
