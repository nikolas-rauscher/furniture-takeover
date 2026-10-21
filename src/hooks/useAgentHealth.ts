import { useCallback, useEffect, useRef, useState } from "react";
import type { HealthResponse } from "../../shared/agent";
import { getAgentHealth } from "../api/agent";

/** Retry only a read-only connection check; never repeat an agent action. */
export function useAgentHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const request = useRef<AbortController | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(false);
  const failed = useRef(false);

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
      failed.current = false;
      setHealth(response);
      setError("");
    } catch (failure) {
      if (!alive.current || request.current !== controller) return;
      failed.current = true;
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
      if (failed.current) void check();
    };
    window.addEventListener("online", recover);
    window.addEventListener("focus", recover);
    return () => {
      alive.current = false;
      request.current?.abort();
      request.current = null;
      if (retry.current) clearTimeout(retry.current);
      window.removeEventListener("online", recover);
      window.removeEventListener("focus", recover);
    };
  }, [check]);
  return { health, error, checking, refresh: () => void check() };
}
