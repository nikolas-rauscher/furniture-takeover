import { accountAccessToken } from "../cloud/session.ts";
import type {
  AssistRequest,
  AssistResponse,
  AgentMetadata,
  HealthResponse,
  PhotoGroupResponse,
} from "../../shared/agent";

type RequestOptions = { signal?: AbortSignal; accessToken?: string };

export function reportAgentQuota(response: Response) {
  if (
    typeof window === "undefined" ||
    !response.headers.has("X-AI-Quota-Limit")
  )
    return;
  const limit = Number(response.headers.get("X-AI-Quota-Limit"));
  const remaining = Number(response.headers.get("X-AI-Quota-Remaining"));
  const resetAt = response.headers.get("X-AI-Quota-Reset");
  if (
    Number.isInteger(limit) &&
    limit > 0 &&
    Number.isInteger(remaining) &&
    remaining >= 0 &&
    remaining <= limit &&
    resetAt &&
    Number.isFinite(Date.parse(resetAt))
  )
    window.dispatchEvent(
      new CustomEvent("takeover-ai-quota", {
        detail: { limit, remaining, resetAt },
      }),
    );
}

export class AgentApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "REQUEST_FAILED", status = 0) {
    super(message);
    this.name = "AgentApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isMetadata(value: unknown): value is AgentMetadata {
  if (!isRecord(value) || !isStringArray(value.keywords)) return false;
  for (const field of ["query", "title", "description", "location"] as const) {
    if (value[field] !== undefined && typeof value[field] !== "string")
      return false;
  }
  for (const field of ["condition", "dimensions"] as const) {
    if (value[field] != null && typeof value[field] !== "string") return false;
  }
  for (const field of ["maxPrice", "radius", "price"] as const) {
    const number = value[field];
    if (number === undefined || (field === "price" && number === null))
      continue;
    if (typeof number !== "number" || !Number.isFinite(number) || number < 0)
      return false;
  }
  if (value.pickupBy !== undefined && value.pickupBy !== "") {
    if (
      typeof value.pickupBy !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.pickupBy)
    )
      return false;
    const time = Date.parse(value.pickupBy);
    if (
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== value.pickupBy
    )
      return false;
  }
  return true;
}

async function requestJson(
  path: string,
  options: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new AgentApiError(
      "The assistant is unavailable. You can keep writing and try again.",
      "NETWORK_ERROR",
    );
  }

  options.signal?.throwIfAborted();
  const body: unknown = await response.json().catch((error: unknown) => {
    if (options.signal?.aborted) throw error;
    return null;
  });
  options.signal?.throwIfAborted();
  reportAgentQuota(response);
  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    throw new AgentApiError(
      typeof error?.message === "string"
        ? error.message
        : response.status >= 500
          ? "The AI service is temporarily unavailable. Retry in a moment."
          : "The assistant could not complete that request. Try again.",
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      response.status,
    );
  }
  return body;
}

export async function getAgentHealth({
  signal,
  accessToken,
}: RequestOptions = {}): Promise<HealthResponse> {
  // Browsing works as a guest; a signed-in health check also sees the user's keys.
  accessToken ??= await accountAccessToken().catch(() => undefined);
  const data = await requestJson("/api/health", {
    signal,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (
    !isRecord(data) ||
    (data.mode !== "live" && data.mode !== "unconfigured") ||
    typeof data.configured !== "boolean" ||
    typeof data.model !== "string"
  ) {
    throw new AgentApiError(
      "The assistant returned an unreadable response. Try again.",
      "INVALID_RESPONSE",
    );
  }
  return data as HealthResponse;
}

/** Send a deliberate request. Photo data is sent only when explicitly included here. */
export async function requestAgentAssist(
  request: AssistRequest,
  { signal, accessToken }: RequestOptions = {},
): Promise<AssistResponse> {
  accessToken ??= await accountAccessToken();
  const data = await requestJson("/api/agent/assist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });
  if (
    !isRecord(data) ||
    data.mode !== "live" ||
    typeof data.model !== "string" ||
    !isStringArray(data.suggestions) ||
    !isStringArray(data.missingDetails) ||
    !isMetadata(data.metadata)
  ) {
    throw new AgentApiError(
      "The assistant returned an unreadable response. Try again.",
      "INVALID_RESPONSE",
    );
  }
  return data as AssistResponse;
}

/** Ask the agent which uploaded photos show the same item. Indices refer to `images`. */
export async function requestPhotoGroups(
  images: string[],
  { signal, accessToken }: RequestOptions = {},
  itemCount?: number,
): Promise<PhotoGroupResponse> {
  accessToken ??= await accountAccessToken();
  const data = await requestJson("/api/agent/group-photos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(itemCount ? { images, itemCount } : { images }),
    signal,
  });
  if (
    !isRecord(data) ||
    data.mode !== "live" ||
    typeof data.model !== "string" ||
    !Array.isArray(data.groups) ||
    !data.groups.every(
      (group) =>
        isRecord(group) &&
        typeof group.label === "string" &&
        Array.isArray(group.photos) &&
        group.photos.length > 0 &&
        group.photos.every(
          (photo) =>
            Number.isInteger(photo) &&
            (photo as number) >= 0 &&
            (photo as number) < images.length,
        ),
    )
  ) {
    throw new AgentApiError(
      "The assistant returned an unreadable response. Try again.",
      "INVALID_RESPONSE",
    );
  }
  return data as PhotoGroupResponse;
}
