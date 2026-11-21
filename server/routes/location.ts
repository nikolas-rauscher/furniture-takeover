import { AgentError } from "../errors.ts";
import { requireJson, readBody, send } from "../http-io.ts";
import { reversePickupLocation } from "../location.ts";
import type { RouteHandler } from "./types.ts";

export function createLocationRoute(): RouteHandler {
  let lastLocationLookup = 0;
  return async ({ request, response, signal }) => {
    if (request.method !== "POST")
      throw new AgentError(
        405,
        "METHOD_NOT_ALLOWED",
        "Use POST for location lookups.",
      );
    requireJson(request);
    const body = await readBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body))
      throw new AgentError(
        400,
        "INVALID_LOCATION",
        "Provide valid location coordinates.",
      );
    if (Date.now() - lastLocationLookup < 1100) {
      response.setHeader("Retry-After", "2");
      throw new AgentError(
        429,
        "LOCATION_LOOKUP_BUSY",
        "Please wait a moment before locating again.",
      );
    }
    lastLocationLookup = Date.now();
    const coordinates = body as { latitude?: unknown; longitude?: unknown };
    send(
      response,
      200,
      await reversePickupLocation(
        coordinates.latitude,
        coordinates.longitude,
        signal,
      ),
    );
  };
}
