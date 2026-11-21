import type { IncomingMessage } from "node:http";
import type { CloudAccess } from "./cloud.ts";
import { AgentError } from "./errors.ts";

export function createAuthThrottle(
  cloud: CloudAccess,
): CloudAccess["authorize"] {
  let authenticationChecks = 0,
    authenticationReset = 0,
    pendingAuthentication = 0;
  return async (header, charge = true) => {
    if (!header) return cloud.authorize(header, charge);
    if (header.length > 4096)
      throw new AgentError(
        401,
        "AUTH_REQUIRED",
        "Sign in with a valid session.",
      );
    if (Date.now() >= authenticationReset) {
      authenticationChecks = 0;
      authenticationReset = Date.now() + 60_000;
    }
    // Funnel proxies all callers to loopback; spoofable forwarded IPs are not a security boundary.
    if (pendingAuthentication >= 8 || authenticationChecks >= 120)
      throw new AgentError(
        429,
        "AUTH_BUSY",
        "Sign-in checks are busy. Please retry in a minute.",
      );
    authenticationChecks++;
    pendingAuthentication++;
    try {
      return await cloud.authorize(header, charge);
    } finally {
      pendingAuthentication--;
    }
  };
}

export async function resolveActor(
  request: IncomingMessage,
  pathname: string,
  authorize: CloudAccess["authorize"] | undefined,
) {
  if (!authorize) return;
  if (
    pathname.startsWith("/api/messages") ||
    pathname.startsWith("/api/listings")
  )
    throw new AgentError(410, "CLOUD_MODE", "Use the signed-in marketplace.");
  if (pathname.startsWith("/api/agent/") || pathname === "/api/account/keys")
    return authorize(
      request.headers.authorization,
      pathname.startsWith("/api/agent/"),
    );
}
