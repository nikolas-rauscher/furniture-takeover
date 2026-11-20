import type { MessagesStore } from "../messages.ts";
import { AgentError } from "../errors.ts";
import { requireJson, readBody, send } from "../http-io.ts";
import type { RouteHandler, RouteTable } from "./types.ts";

export function createMessageRoutes(messages?: MessagesStore): RouteTable {
  const handleMessages: RouteHandler = async ({ request, response, url }) => {
    const pathname = url.pathname;
    const actionRoute = pathname !== "/api/messages";
    const workspaceRoute = pathname === "/api/messages/workspace";
    if (workspaceRoute && request.method !== "DELETE")
      throw new AgentError(405, "METHOD_NOT_ALLOWED", "Use DELETE.");
    if (actionRoute && !workspaceRoute && request.method !== "POST")
      throw new AgentError(405, "METHOD_NOT_ALLOWED", "Use POST.");
    if (!messages)
      throw new AgentError(
        503,
        "MESSAGES_UNAVAILABLE",
        "Messages are not configured.",
      );
    const workspace = request.headers["x-message-workspace"];
    if (typeof workspace !== "string" || !/^[a-f0-9-]{36}$/i.test(workspace))
      throw new AgentError(
        400,
        "INVALID_WORKSPACE",
        "Open messages from your local workspace.",
      );
    if (workspaceRoute) {
      messages.clearWorkspace(workspace);
      send(response, 200, { cleared: true });
    } else if (request.method === "GET")
      send(response, 200, {
        conversations: messages.list(workspace),
      });
    else if (request.method === "DELETE" || request.method === "PATCH") {
      const body = await readBody(request);
      send(response, 200, {
        conversation: messages.setDeleted(
          workspace,
          body,
          request.method === "DELETE",
        ),
      });
    } else if (request.method === "POST") {
      requireJson(request);
      const body = await readBody(request, actionRoute ? 65536 : undefined);
      const result =
        pathname === "/api/messages/pickup"
          ? messages.actPickup(workspace, body)
          : pathname === "/api/messages/deal"
            ? messages.act(workspace, body)
            : { conversation: messages.send(workspace, body) };
      send(response, 200, result);
    } else throw new AgentError(405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
  };

  return {
    "/api/messages": handleMessages,
    "/api/messages/deal": handleMessages,
    "/api/messages/pickup": handleMessages,
    "/api/messages/workspace": handleMessages,
  };
}
