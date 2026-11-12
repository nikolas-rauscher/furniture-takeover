import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { AgentError } from "./errors.ts";

export const keyProviders = ["deepseek", "brave"] as const;
export type KeyProvider = (typeof keyProviders)[number];
type KeyStatus = { saved: boolean; lastFour?: string; updatedAt?: string };
export type AccountKeyStatus = {
  enabled: boolean;
  providers: Record<KeyProvider, KeyStatus>;
};
export const unavailableKeyStatus = (): AccountKeyStatus => ({
  enabled: false,
  providers: { deepseek: { saved: false }, brave: { saved: false } },
});

export function encryptionKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error(
      "ACCOUNT_KEYS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  return key;
}

// Random nonce per write; AAD binds each secret to its owner and provider.
export function sealKey(
  secret: string,
  owner: string,
  provider: KeyProvider,
  key: Buffer,
) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`takeover:account-key:v1:${owner}:${provider}`));
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    nonce.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function openKey(
  sealed: string,
  owner: string,
  provider: KeyProvider,
  key: Buffer,
) {
  try {
    const [version, nonce, tag, encrypted, extra] = sealed.split(":");
    if (version !== "v1" || extra || !encrypted) throw new Error();
    const iv = Buffer.from(nonce, "base64"),
      authTag = Buffer.from(tag, "base64");
    if (iv.length !== 12 || authTag.length !== 16) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(`takeover:account-key:v1:${owner}:${provider}`));
    cipher.setAuthTag(authTag);
    return Buffer.concat([
      cipher.update(Buffer.from(encrypted, "base64")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new AgentError(
      503,
      "KEY_DECRYPTION_FAILED",
      "Your saved API key could not be opened. Replace it in Account settings → API keys.",
    );
  }
}

export function validateKeyChange(
  input: unknown,
  saving: boolean,
): { provider: KeyProvider; key?: string } {
  const fail = () =>
    new AgentError(
      400,
      "INVALID_API_KEY",
      "Choose a provider and enter a key of 12–512 characters without spaces.",
    );
  if (!input || typeof input !== "object" || Array.isArray(input)) throw fail();
  const value = input as Record<string, unknown>;
  if (!keyProviders.includes(value.provider as KeyProvider)) throw fail();
  if (!saving) return { provider: value.provider as KeyProvider };
  if (typeof value.key !== "string") throw fail();
  const key = value.key.trim();
  if (!/^[\x21-\x7e]{12,512}$/.test(key)) throw fail();
  return { provider: value.provider as KeyProvider, key };
}

export function createAccountKeyStore(config: {
  url: string;
  publishableKey: string;
  encryptionKey: string;
}) {
  const key = encryptionKey(config.encryptionKey);
  function client(authorization: string) {
    return createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: authorization } },
    });
  }
  function check(error: unknown) {
    if (error)
      throw new AgentError(
        503,
        "KEY_STORAGE_UNAVAILABLE",
        "API key storage is unavailable. Please retry after the server setup is complete.",
      );
  }
  return {
    async status(
      owner: string,
      authorization: string,
    ): Promise<AccountKeyStatus> {
      const { data, error } = await client(authorization)
        .from("account_api_keys")
        .select("provider,last_four,updated_at")
        .eq("user_id", owner);
      check(error);
      const result = unavailableKeyStatus();
      result.enabled = true;
      for (const row of data ?? [])
        if (keyProviders.includes(row.provider))
          result.providers[row.provider as KeyProvider] = {
            saved: true,
            lastFour: row.last_four,
            updatedAt: row.updated_at,
          };
      return result;
    },
    async change(
      owner: string,
      authorization: string,
      input: unknown,
      saving: boolean,
    ) {
      const change = validateKeyChange(input, saving);
      const db = client(authorization);
      if (saving) {
        const { error } = await db.from("account_api_keys").upsert({
          user_id: owner,
          provider: change.provider,
          encrypted_key: sealKey(change.key!, owner, change.provider, key),
          last_four: change.key!.slice(-4),
          updated_at: new Date().toISOString(),
        });
        check(error);
      } else {
        const { error } = await db
          .from("account_api_keys")
          .delete()
          .eq("user_id", owner)
          .eq("provider", change.provider);
        check(error);
      }
      return this.status(owner, authorization);
    },
    async credentials(
      owner: string,
      authorization: string,
    ): Promise<Partial<Record<KeyProvider, string>>> {
      const { data, error } = await client(authorization)
        .from("account_api_keys")
        .select("provider,encrypted_key")
        .eq("user_id", owner);
      check(error);
      const result: Partial<Record<KeyProvider, string>> = {};
      for (const row of data ?? [])
        if (keyProviders.includes(row.provider))
          result[row.provider as KeyProvider] = openKey(
            row.encrypted_key,
            owner,
            row.provider as KeyProvider,
            key,
          );
      return result;
    },
  };
}
export type AccountKeyStore = ReturnType<typeof createAccountKeyStore>;
