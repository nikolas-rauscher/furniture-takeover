import type { ServerResponse } from "node:http";
import type { CloudAccess } from "../cloud.ts";
import { AgentError } from "../errors.ts";

/** Seconds until an allowance resets, for Retry-After. */
const secondsUntil = (resetAt: string) =>
  Math.max(1, Math.ceil((Date.parse(resetAt) - Date.now()) / 1000));

export async function spendMarketplaceAllowance(
  response: ServerResponse,
  cloud: CloudAccess,
  actor: string,
) {
  const quota = await cloud.quota(actor, true);
  response.setHeader("X-AI-Quota-Limit", quota.limit);
  response.setHeader("X-AI-Quota-Remaining", quota.remaining);
  response.setHeader("X-AI-Quota-Reset", quota.resetAt);
  if (!quota.allowed) {
    response.setHeader("Retry-After", secondsUntil(quota.resetAt));
    throw new AgentError(
      429,
      "AI_QUOTA_EXCEEDED",
      `The daily AI allowance is used up. It resets at ${quota.resetAt}. Listings and messages are still available.`,
    );
  }
}

export async function spendThreadAllowance(
  response: ServerResponse,
  cloud: CloudAccess,
  actor: string,
) {
  const allowance = await cloud.spendReplyReading(actor);
  if (!allowance.allowed) {
    response.setHeader("Retry-After", secondsUntil(allowance.resetAt));
    throw new AgentError(
      429,
      "THREAD_QUOTA_EXCEEDED",
      "Pako has read all the replies he can for today. You can still reply yourself.",
    );
  }
  return {
    limit: allowance.limit,
    remaining: allowance.remaining,
    resetAt: allowance.resetAt,
  };
}
