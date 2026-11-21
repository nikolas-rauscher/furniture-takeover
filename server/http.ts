import { createServer } from "node:http";
import { localOrigins } from "./config.ts";
import { AgentError } from "./errors.ts";
import { serveFrontend } from "./frontend.ts";
import { createAuthThrottle, resolveActor } from "./http-auth.ts";
import {
  checkOrigin,
  sendPreflight,
  setSecurityHeaders,
} from "./http-headers.ts";
import { sendRequestError } from "./http-io.ts";
import { createAccountKeysRoute } from "./routes/account-keys.ts";
import { createAdminRoute } from "./routes/admin.ts";
import { createAgentRoutes } from "./routes/agent.ts";
import { createHealthRoutes } from "./routes/health.ts";
import { createListingRoutes } from "./routes/listings.ts";
import { createLocationRoute } from "./routes/location.ts";
import { createMessageRoutes } from "./routes/messages.ts";
import type {
  RouteContext,
  RouteTable,
  ServerOptions,
} from "./routes/types.ts";
import type { AgentService } from "./service.ts";

export { MAX_BODY_BYTES } from "./http-io.ts";

export function createAgentServer(
  service: AgentService,
  options: ServerOptions = {},
) {
  const allowedOrigins = new Set(options.allowedOrigins ?? localOrigins());
  const authorize = options.cloud && createAuthThrottle(options.cloud);
  const admin = createAdminRoute(options);
  const demoAdminRoutes = new Map([
    ["/api/reports", admin],
    ["/api/listings/permission", admin],
  ]);
  const routes: RouteTable = {
    ...createHealthRoutes(service, options, authorize),
    ...createListingRoutes(options.listings),
    ...createMessageRoutes(options.messages),
    ...createAgentRoutes(service, options),
    "/api/account/keys": createAccountKeysRoute(options),
    "/api/location/reverse": createLocationRoute(),
  };
  const routeTable = new Map(Object.entries(routes));

  const server = createServer(async (request, response) => {
    setSecurityHeaders(
      response,
      options.staticDirectory,
      options.cloud?.config.supabaseUrl,
    );
    const controller = new AbortController();
    request.once("aborted", () => controller.abort());
    response.once("close", () => {
      if (!response.writableEnded) controller.abort();
    });

    try {
      checkOrigin(request, response, allowedOrigins);
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const { pathname } = url;
      const apiPath = pathname.startsWith("/api/");
      if (options.staticDirectory && pathname !== "/api" && !apiPath) {
        await serveFrontend(
          request,
          response,
          options.staticDirectory,
          pathname,
        );
        return;
      }
      if (request.method === "OPTIONS" && apiPath) {
        sendPreflight(response);
        return;
      }

      const context: RouteContext = {
        request,
        response,
        url,
        signal: controller.signal,
      };
      // The shared demo admin endpoints have their own availability and authorization checks.
      const adminRoute =
        demoAdminRoutes.get(pathname) ??
        (pathname.startsWith("/api/admin/") ? admin : undefined);
      if (adminRoute) {
        await adminRoute(context);
        return;
      }
      context.actor = await resolveActor(request, pathname, authorize);
      const route =
        routeTable.get(`${request.method} ${pathname}`) ??
        routeTable.get(pathname);
      if (!route)
        throw new AgentError(404, "NOT_FOUND", "This endpoint does not exist.");
      await route(context);
    } catch (error) {
      sendRequestError(
        response,
        error,
        new URL(request.url ?? "/", "http://127.0.0.1").pathname,
      );
    }
  });
  server.requestTimeout = 25_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
