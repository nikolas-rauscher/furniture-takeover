import { presentSampleListing } from "../shared/sampleListingPresentation.ts";
import { createClient } from "@supabase/supabase-js";
import { AgentError } from "./errors.ts";
import type { Product } from "../shared/marketplace.ts";
export function createCloud(env: NodeJS.ProcessEnv = process.env) {
  const url = env.SUPABASE_URL?.trim(),
    key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return undefined;
  if (!url || !key)
    throw new Error("Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
      parsed.protocol === "http:"
    )
  )
    throw new Error("Supabase requires HTTPS.");
  if (parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error("Use a plain Supabase project URL.");
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
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const requests = new Map<string, { count: number; reset: number }>();
  return {
    config: { supabaseUrl: url, supabaseKey: key },
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
      return (data ?? []).map((row) =>
        presentSampleListing({
          id: row.id,
          title: row.title,
          description: row.description,
          price: Number(row.price),
          location: row.location,
          condition: row.condition,
          dimensions: row.dimensions,
          status: row.status,
          image: row.images[0]
            ? client.storage.from("listing-photos").getPublicUrl(row.images[0])
                .data.publicUrl
            : "",
          images: row.images.map(
            (p: string) =>
              client.storage.from("listing-photos").getPublicUrl(p).data
                .publicUrl,
          ),
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
        }),
      );
    },
  };
}
