import { DEFAULT_AGENT_CONCURRENCY } from "../config.ts";
import { AgentError } from "../errors.ts";
import { isJson, MAX_BODY_BYTES, readBody, send } from "../http-io.ts";
import { validateThreadTurnRequest } from "../thread-agent.ts";
import type { AgentService } from "../service.ts";
import { spendMarketplaceAllowance, spendThreadAllowance } from "./quota.ts";
import type {
  RouteContext,
  RouteHandler,
  RouteTable,
  ServerOptions,
} from "./types.ts";

/** A reading sends at most 20 messages of one thread. */
export const THREAD_BODY_BYTES = 64 * 1024;

type Agents = Pick<ServerOptions, "runtime" | "threads"> & {
  service: AgentService;
};
type AgentHandler = (
  context: RouteContext,
  body: unknown,
  agents: Agents,
) => Promise<void>;

export function createAgentRoutes(
  service: AgentService,
  options: Pick<
    ServerOptions,
    | "cloud"
    | "forAccount"
    | "listings"
    | "maxConcurrent"
    | "runtime"
    | "threads"
  >,
): RouteTable {
  let active = 0;
  const maxConcurrent = options.maxConcurrent ?? DEFAULT_AGENT_CONCURRENCY;
  const waiting = new Set<(entered: boolean) => void>();

  function acquire(signal: AbortSignal): Promise<boolean> {
    signal.throwIfAborted();
    if (active < maxConcurrent) {
      active++;
      return Promise.resolve(true);
    }
    if (waiting.size >= maxConcurrent) return Promise.resolve(false);
    return new Promise((resolve) => {
      const abort = () => finish(false);
      const timer = setTimeout(abort, 1_200);
      const finish = (entered: boolean) => {
        waiting.delete(finish);
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        resolve(entered);
      };
      waiting.add(finish);
      signal.addEventListener("abort", abort, { once: true });
    });
  }

  function release() {
    const next = waiting.values().next().value;
    if (next) next(true);
    else active--;
  }

  function withAgentRequest(
    handle: AgentHandler,
    bodyLimit = MAX_BODY_BYTES,
  ): RouteHandler {
    return async (context) => {
      const { request, response, actor, signal } = context;
      if (request.method !== "POST")
        throw new AgentError(
          405,
          "METHOD_NOT_ALLOWED",
          "Use POST for agent requests.",
        );
      if (!isJson(request))
        throw new AgentError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Send the request as application/json.",
        );
      if (Number(request.headers["content-length"] ?? 0) > bodyLimit)
        throw new AgentError(
          413,
          "BODY_TOO_LARGE",
          "This request is too large. Reduce the size of the request.",
        );
      const body = await readBody(request, bodyLimit);
      if (!(await acquire(signal))) {
        signal.throwIfAborted();
        response.setHeader("Retry-After", "1");
        throw new AgentError(
          429,
          "TOO_MANY_REQUESTS",
          "Pako is busy. Your request hasn’t started. Try again shortly.",
        );
      }
      try {
        signal.throwIfAborted();
        const authorization = request.headers.authorization;
        const agents =
          actor && authorization && options.forAccount
            ? await options.forAccount(actor, authorization)
            : {
                service,
                runtime: options.runtime,
                threads: options.threads,
              };
        await handle(context, body, agents);
      } finally {
        release();
      }
    };
  }

  const thread: AgentHandler = async (
    { response, actor, signal },
    body,
    { threads },
  ) => {
    // Only a reading that can run spends one of the student's readings.
    const reading = validateThreadTurnRequest(body);
    if (!threads?.configured)
      throw new AgentError(
        503,
        "AGENT_NOT_CONFIGURED",
        "Pako can't read replies on this server.",
      );
    const allowance =
      actor && options.cloud
        ? await spendThreadAllowance(response, options.cloud, actor)
        : undefined;
    options.listings?.admin.countPako(true);
    const turn = await threads.turn(reading, signal);
    send(response, 200, allowance ? { turn, allowance } : { turn });
  };

  const run: AgentHandler = async (context, body, { runtime }) => {
    const { response, signal } = context;
    if (!runtime)
      throw new AgentError(
        503,
        "AGENT_NOT_CONFIGURED",
        "The agent runtime is not configured.",
      );
    options.listings?.admin.countPako(false);
    response.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    });
    response.flushHeaders();
    await runtime.run(
      body,
      (event) => {
        if (!response.destroyed && !response.writableEnded)
          response.write(JSON.stringify(event) + "\n");
      },
      signal,
    );
    if (!response.destroyed && !response.writableEnded) response.end();
  };

  function marketplace(handle: AgentHandler): RouteHandler {
    return withAgentRequest(async (context, body, agents) => {
      if (context.actor && options.cloud)
        await spendMarketplaceAllowance(
          context.response,
          options.cloud,
          context.actor,
        );
      await handle(context, body, agents);
    });
  }

  function assist(method: "assist" | "groupPhotos"): RouteHandler {
    return marketplace(async ({ response, signal }, body, agents) => {
      options.listings?.admin.countPako(false);
      send(response, 200, await agents.service[method](body, signal));
    });
  }

  return {
    "/api/agent/assist": assist("assist"),
    "/api/agent/group-photos": assist("groupPhotos"),
    "/api/agent/run": marketplace(run),
    "/api/agent/thread": withAgentRequest(thread, THREAD_BODY_BYTES),
  };
}
