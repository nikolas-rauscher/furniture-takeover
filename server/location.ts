import { AgentError } from "./errors.ts";

export async function reversePickupLocation(
  latitude: unknown,
  longitude: unknown,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<{ location: string }> {
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new AgentError(
      400,
      "INVALID_LOCATION",
      "Provide valid location coordinates.",
    );

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  // Street-level lookup, without requesting an individual building.
  url.searchParams.set("zoom", "16");
  url.searchParams.set("lat", latitude.toFixed(3));
  url.searchParams.set("lon", longitude.toFixed(3));
  url.searchParams.set("accept-language", "en");
  try {
    const response = await fetcher(url, {
      headers: {
        "User-Agent": "TakeoverMVP/0.1 (pickup locality lookup)",
        Accept: "application/json",
      },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(7000)])
        : AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("Lookup unavailable");
    const body = (await response.json()) as {
      address?: Record<string, unknown>;
    };
    const address = body.address;
    if (!address || typeof address !== "object") throw new Error("No address");
    const text = (key: string) =>
      typeof address[key] === "string"
        ? (address[key] as string).trim().slice(0, 100)
        : "";
    const street = text("road") || text("pedestrian");
    const locality =
      text("city") ||
      text("town") ||
      text("village") ||
      text("municipality") ||
      text("suburb");
    if (!locality) throw new Error("No locality");
    return {
      location: [street, [text("postcode"), locality].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", "),
    };
  } catch {
    throw new AgentError(
      503,
      "LOCATION_LOOKUP_FAILED",
      "Could not find your area. Enter a pickup location instead.",
    );
  }
}
