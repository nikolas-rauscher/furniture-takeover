import {
  demoLoginRequestSchema,
  type DemoLoginResponse,
} from "../../shared/demoLogin.ts";
import { AgentError } from "../errors.ts";
import { readBody, requireJson, send } from "../http-io.ts";
import type { RouteHandler, ServerOptions } from "./types.ts";

const DEMO_LOGIN_BODY_LIMIT = 1024;

export function createDemoLoginRoute({
  demoLogin,
}: Pick<ServerOptions, "demoLogin">): RouteHandler {
  return async ({ request, response }) => {
    if (!demoLogin)
      throw new AgentError(
        404,
        "DEMO_LOGIN_CLOSED",
        "Demo accounts are not open on this server.",
      );
    requireJson(request);
    const parsed = demoLoginRequestSchema.safeParse(
      await readBody(request, DEMO_LOGIN_BODY_LIMIT),
    );
    if (!parsed.success)
      throw new AgentError(
        400,
        "INVALID_DEMO_LOGIN",
        "Choose one of the demo accounts.",
      );
    const body: DemoLoginResponse = {
      tokenHash: await demoLogin.open(parsed.data),
    };
    send(response, 200, body);
  };
}
