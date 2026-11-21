import type { IncomingMessage, ServerResponse } from "node:http";
import type { AgentErrorResponse } from "../shared/agent.ts";
import { AgentError } from "./errors.ts";

export const MAX_BODY_BYTES = 3 * 1024 * 1024;
export function send(response: ServerResponse, status: number, body: unknown) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

export function readBody(
  request: IncomingMessage,
  limit = MAX_BODY_BYTES,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let done = false;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > limit) {
        done = true;
        reject(
          new AgentError(
            413,
            "BODY_TOO_LARGE",
            "This request is too large. Reduce the size of the request.",
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

function isJson(request: IncomingMessage): boolean {
  return /^application\/json(?:\s*;|$)/i.test(
    request.headers["content-type"] ?? "",
  );
}

/** Rejects a body that is not declared as JSON. */
export function requireJson(request: IncomingMessage) {
  if (!isJson(request))
    throw new AgentError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send the request as application/json.",
    );
}

/** What the server log keeps of a failure: its code and cause, never the request body. */
function describeCause(cause: unknown) {
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  return cause;
}

/** Log each rejection with its public reason and any server-side cause. */
function logRequestError(path: string, error: unknown) {
  console.error(
    "[request]",
    JSON.stringify(
      error instanceof AgentError
        ? {
            path,
            status: error.status,
            code: error.code,
            reason: error.status < 500 ? error.message : undefined,
            cause: error.status >= 500 ? describeCause(error.cause) : undefined,
          }
        : { path, status: 500, cause: describeCause(error) },
    ),
  );
}

export function sendRequestError(
  response: ServerResponse,
  error: unknown,
  path: string,
) {
  logRequestError(path, error);
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
