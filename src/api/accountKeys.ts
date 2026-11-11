import { accountAccessToken } from "../cloud/session.ts";

export type KeyProvider = "deepseek" | "brave";
export type ProviderKeyStatus = {
  saved: boolean;
  lastFour?: string;
  updatedAt?: string;
};
export type AccountKeysStatus = {
  enabled: boolean;
  providers: Record<KeyProvider, ProviderKeyStatus>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKeyStatus(value: unknown): value is ProviderKeyStatus {
  return (
    isRecord(value) &&
    typeof value.saved === "boolean" &&
    (value.lastFour === undefined ||
      (typeof value.lastFour === "string" && value.lastFour.length <= 4)) &&
    (value.updatedAt === undefined || typeof value.updatedAt === "string")
  );
}

async function requestKeys(
  method: "GET" | "PUT" | "DELETE",
  body?: { provider: KeyProvider; key?: string },
  signal?: AbortSignal,
): Promise<AccountKeysStatus> {
  const accessToken = await accountAccessToken();
  if (!accessToken) throw new Error("Sign in to manage your API keys.");
  let response: Response;
  try {
    response = await fetch("/api/account/keys", {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach the server. Try again.");
  }
  // Never display an arbitrary server response that could contain a credential.
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Your session has expired. Sign in again to manage your keys."
        : response.status === 400
          ? "That key could not be saved. Check the key and try again."
          : "Could not update API key settings. Try again in a moment.",
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (
    !isRecord(data) ||
    typeof data.enabled !== "boolean" ||
    !isRecord(data.providers) ||
    !isKeyStatus(data.providers.deepseek) ||
    !isKeyStatus(data.providers.brave)
  ) {
    throw new Error("Could not read API key settings. Reload and try again.");
  }
  return data as AccountKeysStatus;
}

export function getAccountKeys(signal?: AbortSignal) {
  return requestKeys("GET", undefined, signal);
}

export function saveAccountKey(provider: KeyProvider, key: string) {
  return requestKeys("PUT", { provider, key });
}

export function removeAccountKey(provider: KeyProvider) {
  return requestKeys("DELETE", { provider });
}
