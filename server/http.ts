import type { MessagesStore } from "./messages.ts";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AgentErrorResponse } from "../shared/agent.ts";
import { AgentError } from "./errors.ts";
import type { AgentService } from "./service.ts";
import type { AgentRunEvent, AgentRuntimeHealth } from "../shared/runs.ts";
import type { ListingsStore } from "./database.ts";
import { reversePickupLocation } from "./location.ts";
import { localOrigins } from "./config.ts";

export const MAX_BODY_BYTES = 3 * 1024 * 1024;

function send(response: ServerResponse, status: number, body: unknown) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let done = false;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        done = true;
        reject(
          new AgentError(
            413,
            "BODY_TOO_LARGE",
            "This request is too large. Use a photo smaller than 2 MB.",
          ),
        );
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (done) return;
      done = true;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(
          new AgentError(
            400,
            "INVALID_JSON",
            "The request body must be valid JSON.",
          ),
        );
      }
    });
    request.on("error", () => {
      if (!done) {
        done = true;
        reject(
          new AgentError(
            400,
            "REQUEST_INTERRUPTED",
            "The request was interrupted.",
          ),
        );
      }
    });
    request.on("aborted", () => {
      if (!done) {
        done = true;
        reject(
          new AgentError(
            499,
            "REQUEST_CANCELLED",
            "The request was cancelled.",
          ),
        );
      }
    });
  });
}

export function createAgentServer(
  service: AgentService,
  options: {
    maxConcurrent?: number;
    allowedOrigins?: readonly string[];
    listings?: ListingsStore;
    messages?: MessagesStore;
    runtime?: {
      health: () => AgentRuntimeHealth;
      run: (
        input: unknown,
        emit: (event: AgentRunEvent) => void,
        signal: AbortSignal,
      ) => Promise<void>;
    };
  } = {},
) {
  let active = 0;
  let lastLocationLookup = 0;
  const maxConcurrent = options.maxConcurrent ?? 4;
  const allowedOrigins = new Set(options.allowedOrigins ?? localOrigins());
  const server = createServer(async (request, response) => {
    const controller = new AbortController();
    request.once("aborted", () => controller.abort());
    response.once("close", () => {
      if (!response.writableEnded) controller.abort();
    });
    try {
      const origin = request.headers.origin;
      if (origin && !allowedOrigins.has(origin))
        throw new AgentError(
          403,
          "ORIGIN_NOT_ALLOWED",
          "This origin is not allowed.",
        );
      if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = url.pathname;
      if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
        response.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Message-Workspace",
          "Access-Control-Max-Age": "600",
        });
        response.end();
        return;
      }
      if (pathname === "/api/messages") {
        if (!options.messages)
          throw new AgentError(
            503,
            "MESSAGES_UNAVAILABLE",
            "Messages are not configured.",
          );
        const workspace = request.headers["x-message-workspace"];
        if (
          typeof workspace !== "string" ||
          !/^[a-f0-9-]{36}$/i.test(workspace)
        )
          throw new AgentError(
            400,
            "INVALID_WORKSPACE",
            "Open messages from your local workspace.",
          );
        if (request.method === "GET")
          send(response, 200, {
            conversations: options.messages.list(workspace),
          });
        else if (request.method === "DELETE" || request.method === "PATCH") {
          const body = await readBody(request);
          send(response, 200, {
            conversation: options.messages.setDeleted(
              workspace,
              body,
              request.method === "DELETE",
            ),
          });
        } else if (request.method === "POST") {
          if (
            !/^application\/json(?:\s*;|$)/i.test(
              request.headers["content-type"] ?? "",
            )
          )
            throw new AgentError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON.");
          const body = await readBody(request);
          send(response, 200, {
            conversation: options.messages.send(workspace, body),
          });
        } else
          throw new AgentError(405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
        return;
      }
      if (pathname === "/api/health" && request.method === "GET") {
        send(response, 200, {
          ...service.health(),
          ...(options.runtime?.health() ?? {}),
        });
        return;
      }
      if (pathname === "/api/location/reverse") {
        if (request.method !== "POST")
          throw new AgentError(
            405,
            "METHOD_NOT_ALLOWED",
            "Use POST for location lookups.",
          );
        if (
          !/^application\/json(?:\s*;|$)/i.test(
            request.headers["content-type"] ?? "",
          )
        )
          throw new AgentError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Send the request as application/json.",
          );
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
            controller.signal,
          ),
        );
        return;
      }
      if (
        [
          "/api/listings",
          "/api/listings/demo/seed",
          "/api/listings/demo/update",
        ].includes(pathname)
      ) {
        const expectedMethod = pathname === "/api/listings" ? "GET" : "POST";
        if (request.method !== expectedMethod)
          throw new AgentError(
            405,
            "METHOD_NOT_ALLOWED",
            `Use ${expectedMethod} for this endpoint.`,
          );
        if (!options.listings)
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
          send(response, 200, { listings: options.listings.listDemo() });
          return;
        }
        if (Number(request.headers["content-length"] ?? 0) > MAX_BODY_BYTES)
          throw new AgentError(
            413,
            "BODY_TOO_LARGE",
            "This request is too large.",
          );
        if (pathname === "/api/listings/demo/seed") {
          request.resume();
          send(response, 200, { listings: options.listings.seedDemo() });
          return;
        }
        if (
          !/^application\/json(?:\s*;|$)/i.test(
            request.headers["content-type"] ?? "",
          )
        )
          throw new AgentError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Send the request as application/json.",
          );
        const body = await readBody(request);
        if (typeof body !== "object" || body === null || Array.isArray(body))
          throw new AgentError(
            400,
            "INVALID_REQUEST",
            "Provide the demo listings to update.",
          );
        send(response, 200, {
          listings: options.listings.updateDemo(
            (body as { listings?: unknown }).listings,
          ),
        });
        return;
      }
      if (pathname !== "/api/agent/assist" && pathname !== "/api/agent/run")
        throw new AgentError(404, "NOT_FOUND", "This endpoint does not exist.");
      if (request.method !== "POST")
        throw new AgentError(
          405,
          "METHOD_NOT_ALLOWED",
          "Use POST for agent requests.",
        );
      if (
        !/^application\/json(?:\s*;|$)/i.test(
          request.headers["content-type"] ?? "",
        )
      )
        throw new AgentError(
          415,
          "UNSUPPORTED_MEDIA_TYPE",
          "Send the request as application/json.",
        );
      if (Number(request.headers["content-length"] ?? 0) > MAX_BODY_BYTES)
        throw new AgentError(
          413,
          "BODY_TOO_LARGE",
          "This request is too large. Use a photo smaller than 2 MB.",
        );
      if (active >= maxConcurrent) {
        response.setHeader("Retry-After", "1");
        throw new AgentError(
          429,
          "TOO_MANY_REQUESTS",
          "The agent is handling other requests. Please try again shortly.",
        );
      }
      active++;
      try {
        const body = await readBody(request);
        if (pathname === "/api/agent/run") {
          if (!options.runtime)
            throw new AgentError(
              503,
              "AGENT_NOT_CONFIGURED",
              "The agent runtime is not configured.",
            );
          response.writeHead(200, {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Content-Type-Options": "nosniff",
            "X-Accel-Buffering": "no",
          });
          response.flushHeaders();
          await options.runtime.run(
            body,
            (event) => {
              if (!response.destroyed && !response.writableEnded)
                response.write(JSON.stringify(event) + "\n");
            },
            controller.signal,
          );
          if (!response.destroyed && !response.writableEnded) response.end();
          return;
        }
        const result = await service.assist(body, controller.signal);
        send(response, 200, result);
      } finally {
        active--;
      }
    } catch (error) {
      const safe =
        error instanceof AgentError
          ? error
          : new AgentError(
              500,
              "INTERNAL_ERROR",
              "The request could not be completed. Please try again.",
            );
      const body: AgentErrorResponse = {
        error: { code: safe.code, message: safe.message },
      };
      if (response.headersSent) {
        if (!response.destroyed && !response.writableEnded)
          response.end(
            JSON.stringify({
              type: "error",
              code: safe.code,
              message: safe.message,
            }) + "\n",
          );
        return;
      }
      send(response, safe.status, body);
    }
  });
  server.requestTimeout = 25_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
