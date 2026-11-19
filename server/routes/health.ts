import type { AgentService } from "../service.ts";
import type { CloudAccess } from "../cloud.ts";
import { send } from "../http-io.ts";
import type { RouteTable, ServerOptions } from "./types.ts";

export function createHealthRoutes(
  service: AgentService,
  options: Pick<ServerOptions, "cloud" | "forAccount" | "runtime">,
  authorize: CloudAccess["authorize"] | undefined,
): RouteTable {
  return {
    "GET /api/config": ({ response }) =>
      send(response, 200, options.cloud?.config ?? {}),
    "GET /api/health": async ({ request, response }) => {
      const owner =
        authorize && request.headers.authorization
          ? await authorize(request.headers.authorization, false)
          : undefined;
      const agents =
        owner && request.headers.authorization && options.forAccount
          ? await options.forAccount(owner, request.headers.authorization)
          : { service, runtime: options.runtime };
      send(response, 200, {
        ...agents.service.health(),
        ...(agents.runtime?.health() ?? {}),
        ...(owner && options.cloud
          ? {
              quota: await options.cloud.quota(owner),
            }
          : {}),
      });
    },
  };
}
