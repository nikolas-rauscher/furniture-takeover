import { readFile, realpath } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AgentError } from "./errors.ts";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export async function serveFrontend(
  request: IncomingMessage,
  response: ServerResponse,
  directory: string,
  pathname: string,
) {
  if (request.method !== "GET" && request.method !== "HEAD")
    throw new AgentError(405, "METHOD_NOT_ALLOWED", "Use GET or HEAD.");
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    throw new AgentError(400, "INVALID_PATH", "Invalid file path.");
  }
  if (path === "/") path = "/index.html";
  const contentType = contentTypes[extname(path)];
  if (
    !contentType ||
    path.includes("\0") ||
    path.includes("\\") ||
    path.split("/").some((part) => part.startsWith("."))
  )
    throw new AgentError(404, "NOT_FOUND", "This file does not exist.");
  try {
    const root = await realpath(directory);
    const file = await realpath(resolve(root, `.${path}`));
    if (!file.startsWith(root + sep))
      throw new AgentError(404, "NOT_FOUND", "This file does not exist.");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": body.length,
      "Cache-Control": path.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (
      ["ENOENT", "EISDIR", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      throw new AgentError(404, "NOT_FOUND", "This file does not exist.");
    throw error;
  }
}
