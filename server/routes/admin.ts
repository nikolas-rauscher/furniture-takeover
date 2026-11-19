import {
  adminActions,
  demoAdminHeader,
  demoReportSchema,
  isAdminAction,
} from "../../shared/admin.ts";
import { adminFailure } from "../demo-admin.ts";
import { AgentError } from "../errors.ts";
import { readBody, send } from "../http-io.ts";
import type { RouteHandler, ServerOptions } from "./types.ts";

export function createAdminRoute({
  cloud,
  listings,
}: Pick<ServerOptions, "cloud" | "listings">): RouteHandler {
  return async ({ request, response, url }) => {
    const pathname = url.pathname;
    const isDemoReport = pathname === "/api/reports";
    const isDemoPostingCheck = pathname === "/api/listings/permission";
    if (cloud || !listings) throw adminFailure("admin_unavailable", 404);
    const store = listings.admin;
    if (isDemoReport || isDemoPostingCheck) {
      const workspace = request.headers["x-message-workspace"];
      const method = isDemoReport ? "POST" : "GET";
      if (request.method !== method)
        throw new AgentError(405, "METHOD_NOT_ALLOWED", `Use ${method}.`);
      if (
        typeof workspace !== "string" ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(workspace)
      )
        throw adminFailure("admin_invalid_input", 400);
      if (isDemoPostingCheck) {
        store.checkPosting(workspace);
        send(response, 200, { allowed: true });
      } else {
        const input = demoReportSchema.safeParse(await readBody(request, 8192));
        if (!input.success) throw adminFailure("admin_invalid_input", 400);
        send(response, 200, store.submitReport(workspace, input.data));
      }
      return;
    }
    if (request.headers[demoAdminHeader.toLowerCase()] !== "1")
      throw adminFailure("admin_required", 403);
    const action = pathname.slice("/api/admin/".length).replaceAll("-", "_");
    if (!isAdminAction(action))
      throw new AgentError(404, "NOT_FOUND", "This endpoint does not exist.");
    const contract = adminActions[action];
    const method = contract.input.safeParse(null).success ? "GET" : "POST";
    if (request.method !== method)
      throw new AgentError(405, "METHOD_NOT_ALLOWED", `Use ${method}.`);
    const input = contract.input.safeParse(
      method === "GET" ? null : await readBody(request, 65536),
    );
    if (!input.success) throw adminFailure("admin_invalid_input", 400);
    const run = store[action] as (data: unknown) => unknown;
    const output = contract.output.safeParse(run(input.data));
    if (!output.success) throw adminFailure("admin_invalid_response", 500);
    send(response, 200, output.data);
  };
}
