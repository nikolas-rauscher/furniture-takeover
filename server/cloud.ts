import { isDemoIllustration } from "../shared/listingPhotos.ts";
import { isIPv4 } from "node:net";
import { createClient } from "@supabase/supabase-js";
import { AgentError } from "./errors.ts";
import type { Product } from "../shared/marketplace.ts";
import type { AgentQuota } from "../shared/agent.ts";

/** Searches and listings share one daily allowance; reading replies has its own. */
type AllowanceKind = "marketplace" | "thread";
type Allowance = AgentQuota & { allowed: boolean };

function quotaUnavailable(options?: ErrorOptions): AgentError {
  return new AgentError(
    503,
    "QUOTA_UNAVAILABLE",
    "AI usage limits are temporarily unavailable. Please retry shortly.",
    options,
  );
}

/** Loopback, private-network and Tailscale addresses; never a public host. */
export function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  if (!isIPv4(hostname)) return false;
  const [a, b] = hostname.split(".").map(Number);
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** HTTPS anywhere; plain HTTP only on this machine or a private network. */
function supabaseUrl(value: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && isPrivateHost(parsed.hostname))
  )
    throw new Error(
      `${name} requires HTTPS, or HTTP on localhost or a private LAN IP address.`,
    );
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error(`Use a plain Supabase URL for ${name}.`);
  return parsed.toString().replace(/\/+$/, "");
}

/**
 * SUPABASE_URL is what browsers use, so it must be reachable from their
 * devices (a path on the app's own HTTPS origin works). SUPABASE_INTERNAL_URL
 * is what this server uses, such as a LAN IP; it never reaches the browser.
 */
export function createCloud(
  env: NodeJS.ProcessEnv = process.env,
  { localTesting = false }: { localTesting?: boolean } = {},
) {
  const configured = env.SUPABASE_URL?.trim(),
    key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!configured && !key) return undefined;
  if (!configured || !key)
    throw new Error("Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  const publicUrl = supabaseUrl(configured, "SUPABASE_URL");
  const internal = env.SUPABASE_INTERNAL_URL?.trim();
  const url = internal
    ? supabaseUrl(internal, "SUPABASE_INTERNAL_URL")
    : publicUrl;
  if (key.startsWith("sb_secret_"))
    throw new Error("Use a Supabase publishable key, never a secret key.");
  if (key.split(".").length === 3) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role !== "anon"
      )
        throw new Error("not anon");
    } catch {
      throw new Error("Use a Supabase publishable or anon key.");
    }
  }
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey)
    throw new Error("Set SUPABASE_SECRET_KEY when Supabase accounts are configured.");
  if (!secretKey.startsWith("sb_secret_"))
    throw new Error("SUPABASE_SECRET_KEY must be a Supabase secret API key.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
            : AbortSignal.timeout(10_000),
        }),
    },
  });
  const requests = new Map<string, { count: number; reset: number }>();
  // Built from the public URL: photo links must work for browsers, not just here.
  const photoUrl = (path: string) =>
    isDemoIllustration(path)
      ? path
      : `${publicUrl}/storage/v1/object/public/listing-photos/${encodeURI(path)}`;
  const testUntil = Date.parse(env.LOCAL_AI_TEST_UNTIL ?? "");
  const testEmail = env.LOCAL_AI_TEST_EMAIL?.trim().toLowerCase();
  const testEnabled =
    localTesting &&
    env.NODE_ENV !== "production" &&
    testEmail &&
    testUntil > Date.now() &&
    testUntil <= Date.now() + 86_400_000;
  /** Local AI testing keeps each allowance's count in memory instead. */
  const testBudgets: Record<AllowanceKind, { limit: number; used: number }> = {
    marketplace: { limit: 250, used: 0 },
    thread: { limit: 750, used: 0 },
  };
  let testUserId: string | undefined;
  const allowance = async (
    kind: AllowanceKind,
    userId: string,
    spend: boolean,
  ): Promise<Allowance> => {
    const testing = userId === testUserId && Date.now() < testUntil;
    const response = await fetch(`${url}/rest/v1/rpc/ai_quota_spend`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_user: userId, p_kind: kind, p_spend: spend && !testing }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    }).catch((cause: unknown) => {
      throw quotaUnavailable({ cause });
    });
    if (kind === "thread" && response.status === 404)
      throw new AgentError(
        503,
        "THREAD_READING_UNAVAILABLE",
        "Pako can't read replies here yet. This server still needs its reply reading update.",
      );
    const value = await response.json().catch((cause: unknown) => {
      throw quotaUnavailable({ cause });
    });
    if (!response.ok && value?.message === "admin_student_blocked")
      throw new AgentError(
        403,
        "admin_student_blocked",
        "This account cannot use Pako while it is blocked.",
      );
    if (
      !response.ok ||
      !value ||
      typeof value.allowed !== "boolean" ||
      !Number.isInteger(value.limit) ||
      value.limit <= 0 ||
      !Number.isInteger(value.remaining) ||
      value.remaining < 0 ||
      value.remaining > value.limit ||
      typeof value.resetAt !== "string" ||
      !Number.isFinite(Date.parse(value.resetAt))
    )
      throw quotaUnavailable();
    if (!testing) return value;
    const budget = testBudgets[kind];
    const allowed = budget.used < budget.limit;
    if (spend && allowed) budget.used++;
    return {
      allowed,
      limit: budget.limit,
      remaining: budget.limit - budget.used,
      resetAt: new Date(testUntil).toISOString(),
    };
  };
  return {
    /** Sent to browsers by /api/config; holds only the public URL. */
    config: { supabaseUrl: publicUrl, supabaseKey: key },
    /** Used by this server only; may be a private address. */
    internalUrl: url,
    quota: (userId: string, spend = false) =>
      allowance("marketplace", userId, spend),
    spendReplyReading: (userId: string) =>
      allowance("thread", userId, true),
    async authorize(header: string | undefined, charge = true) {
      const token = header?.match(/^Bearer (.+)$/)?.[1];
      if (!token)
        throw new AgentError(
          401,
          "AUTH_REQUIRED",
          "Sign in to use the assistant.",
        );
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user || !data.user.email_confirmed_at)
        throw new AgentError(
          401,
          "AUTH_REQUIRED",
          "Sign in with a confirmed email address.",
        );
      if (testEnabled && data.user.email?.toLowerCase() === testEmail)
        testUserId = data.user.id;
      else if (data.user.id === testUserId)
        testUserId = undefined;
      if (!charge) return data.user.id;
      const now = Date.now();
      for (const [id, entry] of requests)
        if (entry.reset <= now) requests.delete(id);
      const entry = requests.get(data.user.id) ?? {
        count: 0,
        reset: now + 60000,
      };
      if (entry.count >= 20)
        throw new AgentError(
          429,
          "RATE_LIMIT",
          "Please wait a minute before asking again.",
        );
      entry.count++;
      requests.set(data.user.id, entry);
      return data.user.id;
    },
    async inventory(): Promise<Product[]> {
      const { data, error } = await client
        .from("listings")
        .select("*")
        .eq("status", "active")
        .limit(200);
      if (error) throw new Error("The marketplace inventory is unavailable.");
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price),
        location: row.location,
        condition: row.condition,
        dimensions: row.dimensions,
        status: row.status,
        image: row.images[0] ? photoUrl(row.images[0]) : "",
        images: row.images.map(photoUrl),
        cardImages: row.card_images.map(photoUrl),
        seller: "Seller",
        initials: "S",
        category: "",
        source: "takeover" as const,
        distance: 0,
        available: row.pickup,
        pickupBy: row.pickup_by ?? "",
        tags: row.tags ?? [],
        own: false,
        demo: row.tags?.includes("Demo") ?? false,
      }));
    },
  };
}

export type CloudAccess = Pick<
  NonNullable<ReturnType<typeof createCloud>>,
  "config" | "authorize" | "quota" | "spendReplyReading"
>;
