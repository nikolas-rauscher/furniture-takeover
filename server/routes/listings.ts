import { adminFailure } from "../demo-admin.ts";
import type { ListingsStore } from "../database.ts";
import { AgentError } from "../errors.ts";
import { requireJson, MAX_BODY_BYTES, readBody, send } from "../http-io.ts";
import type { RouteHandler, RouteTable } from "./types.ts";

export function createListingRoutes(listings?: ListingsStore): RouteTable {
  const handleListings: RouteHandler = async ({ request, response, url }) => {
    const pathname = url.pathname;
    const expectedMethod = pathname === "/api/listings" ? "GET" : "POST";
    if (request.method !== expectedMethod)
      throw new AgentError(
        405,
        "METHOD_NOT_ALLOWED",
        `Use ${expectedMethod} for this endpoint.`,
      );
    if (!listings)
      throw new AgentError(
        503,
        "LISTINGS_NOT_CONFIGURED",
        "The listing database is not configured.",
      );
    if (pathname === "/api/listings") {
      if (
        url.searchParams.has("demo") &&
        url.searchParams.get("demo") !== "true"
      )
        throw new AgentError(
          400,
          "INVALID_REQUEST",
          "Only the demo catalog is available from this endpoint.",
        );
      send(response, 200, { listings: listings.listDemo() });
      return;
    }
    if (Number(request.headers["content-length"] ?? 0) > MAX_BODY_BYTES)
      throw new AgentError(413, "BODY_TOO_LARGE", "This request is too large.");
    if (pathname === "/api/listings/demo/seed") {
      request.resume();
      send(response, 200, { listings: listings.seedDemo() });
      return;
    }
    requireJson(request);
    const body = await readBody(request);
    if (typeof body !== "object" || body === null || Array.isArray(body))
      throw new AgentError(
        400,
        "INVALID_REQUEST",
        "Provide the demo listings to update.",
      );
    const workspace = request.headers["x-message-workspace"];
    if (
      workspace !== undefined &&
      (typeof workspace !== "string" ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(workspace))
    )
      throw adminFailure("admin_invalid_input", 400);
    send(response, 200, {
      listings: listings.updateDemo(
        (body as { listings?: unknown }).listings,
        workspace,
      ),
    });
  };

  return {
    "/api/listings": handleListings,
    "/api/listings/demo/seed": handleListings,
    "/api/listings/demo/update": handleListings,
  };
}
