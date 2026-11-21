import { formatPickup } from "../../shared/pickupTime";
import type { PakoAbsence } from "../sellGuide";
import { useAgentHealth } from "./useAgentHealth";

export type PakoStatus = ReturnType<typeof usePakoStatus>;

/** Whether Pako can be asked right now, and why not: offline, not set up, or today's requests used. */
export function usePakoStatus(signedIn: boolean) {
  const { health, error, checking, refresh } = useAgentHealth();
  const quotaExhausted = health?.quota?.remaining === 0;
  /** Why Pako cannot help with selling right now; nothing while that is still being checked. */
  const absence: PakoAbsence | undefined = quotaExhausted
    ? "allowance"
    : error || health?.configured === false
      ? "offline"
      : undefined;
  return {
    health,
    error,
    checking,
    refresh,
    quotaExhausted,
    /** When today's requests reset, once they are used. */
    quotaResets: health?.quota ? formatPickup(health.quota.resetAt) : "",
    /** The daily allowance to show, unless the connection check failed. */
    quota: error ? undefined : health?.quota,
    /** Why quick replies that ask Pako are paused; the footer under them says when they reset. */
    allowancePause: quotaExhausted ? "I've used today's requests." : undefined,
    configured: health?.configured === true && signedIn && !quotaExhausted,
    absence,
  };
}
