import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentQuota, HealthResponse } from "../../shared/agent";
import { getAgentHealth } from "../api/agent";

/** Retry only a read-only connection check; never repeat an agent action. */
export function useAgentHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const request = useRef<AbortController | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(false);

  const check = useCallback(async function check(attempt = 0): Promise<void> {
    if (!alive.current || request.current) return;
    if (retry.current) clearTimeout(retry.current);
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setChecking(true);
    try {
      const response = await getAgentHealth({ signal: controller.signal });
      if (!alive.current || request.current !== controller) return;
      setHealth(response);
      setError("");
    } catch (failure) {
      if (!alive.current || request.current !== controller) return;
      setError(
        controller.signal.aborted
          ? "The connection check timed out."
          : failure instanceof Error
            ? failure.message
            : "The AI service is unavailable.",
      );
      if (attempt < 3)
        retry.current = setTimeout(
          () => void check(attempt + 1),
          1000 * 2 ** attempt,
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        if (alive.current) setChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void check();
    const recover = () => {
      void check();
    };
    window.addEventListener("online", recover);
    window.addEventListener("focus", recover);
    const keysChanged = () => {
      request.current?.abort();
      request.current = null;
      void check();
    };
    window.addEventListener("takeover-api-keys-changed", keysChanged);
    const quotaChanged = (event: Event) => {
      const quota = (event as CustomEvent<AgentQuota>).detail;
      setHealth((previous) => (previous ? { ...previous, quota } : previous));
    };
    window.addEventListener("takeover-ai-quota", quotaChanged);
    return () => {
      alive.current = false;
      request.current?.abort();
      request.current = null;
      if (retry.current) clearTimeout(retry.current);
      window.removeEventListener("online", recover);
      window.removeEventListener("focus", recover);
      window.removeEventListener("takeover-api-keys-changed", keysChanged);
      window.removeEventListener("takeover-ai-quota", quotaChanged);
    };
  }, [check]);
  useEffect(() => {
    if (!health?.quota) return;
    const timer = setTimeout(
      () => void check(),
      Math.max(
        1000,
        Math.min(
          86_400_000,
          Date.parse(health.quota.resetAt) - Date.now() + 1000,
        ),
      ),
    );
    return () => clearTimeout(timer);
  }, [health?.quota?.resetAt, check]);
  return { health, error, checking, refresh: () => void check() };
}
