import type { IncomingMessage, ServerResponse } from "node:http";
import { demoAdminHeader } from "../shared/admin.ts";
import { AgentError } from "./errors.ts";

export function setSecurityHeaders(
  response: ServerResponse,
  staticDirectory?: string,
  supabaseUrl?: string,
) {
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (staticDirectory) {
    const cloudOrigin =
      supabaseUrl === undefined ? "" : new URL(supabaseUrl).origin;
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        `connect-src 'self' ${cloudOrigin} ${cloudOrigin.replace(/^http/, "ws")}`,
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; "),
    );
  }
}

export function checkOrigin(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: ReadonlySet<string>,
) {
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin))
    throw new AgentError(
      403,
      "ORIGIN_NOT_ALLOWED",
      "This origin is not allowed.",
    );
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
}

export function sendPreflight(response: ServerResponse) {
  response.writeHead(204, {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, X-Message-Workspace, Authorization, ${demoAdminHeader}`,
    "Access-Control-Max-Age": "600",
  });
  response.end();
}
