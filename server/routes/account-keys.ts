import { unavailableKeyStatus } from "../account-keys.ts";
import { AgentError } from "../errors.ts";
import { isJson, readBody, send } from "../http-io.ts";
import type { RouteHandler, ServerOptions } from "./types.ts";

export function createAccountKeysRoute({
  cloud,
  accountKeys,
}: Pick<ServerOptions, "cloud" | "accountKeys">): RouteHandler {
  return async ({ request, response, actor }) => {
    if (!cloud || !actor || !request.headers.authorization)
      throw new AgentError(
        401,
        "AUTH_REQUIRED",
        "Sign in to manage your API keys.",
      );
    if (!["GET", "PUT", "DELETE"].includes(request.method ?? ""))
      throw new AgentError(
        405,
        "METHOD_NOT_ALLOWED",
        "Use GET, PUT or DELETE.",
      );
    if (!accountKeys) {
      if (request.method !== "GET")
        throw new AgentError(
          503,
          "KEY_STORAGE_UNAVAILABLE",
          "API key storage has not been configured on the server.",
        );
      send(response, 200, unavailableKeyStatus());
      return;
    }
    if (request.method === "GET") {
      send(
        response,
        200,
        await accountKeys.status(actor, request.headers.authorization),
      );
      return;
    }
    if (!isJson(request))
      throw new AgentError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON.");
    if (Number(request.headers["content-length"] ?? 0) > 2048)
      throw new AgentError(
        413,
        "BODY_TOO_LARGE",
        "This API key request is too large.",
      );
    send(
      response,
      200,
      await accountKeys.change(
        actor,
        request.headers.authorization,
        await readBody(request, 2048),
        request.method === "PUT",
      ),
    );
  };
}
