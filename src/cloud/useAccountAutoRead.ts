import { useCallback, useEffect, useState } from "react";
import { fail, missingFromSchema } from "./client";
import type { AccountUser } from "./useAccountInbox";

type AccountAutoRead =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; autoRead: boolean };

/** Whether Pako reads new replies by himself, saved with the student's account. */
export function useAccountAutoRead(connection: AccountUser | null) {
  const [state, setState] = useState<AccountAutoRead>({ status: "loading" });
  const client = connection?.client;
  const userId = connection?.userId;
  useEffect(() => {
    if (!client || !userId) return;
    let alive = true;
    setState({ status: "loading" });
    void client
      .from("account_preferences")
      .select("pako_auto_read")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (missingFromSchema(error)) setState({ status: "missing" });
        else if (error) setState({ status: "error", message: error.message });
        // Without a saved preference the column's default applies: Pako reads.
        else
          setState({ status: "ready", autoRead: data?.pako_auto_read ?? true });
      });
    return () => {
      alive = false;
    };
  }, [client, userId]);
  const setAutoRead = useCallback(
    async (autoRead: boolean) => {
      if (!client || !userId)
        throw new Error("Sign in to change this setting.");
      fail(
        (
          await client
            .from("account_preferences")
            .upsert({ user_id: userId, pako_auto_read: autoRead })
        ).error,
      );
      setState({ status: "ready", autoRead });
    },
    [client, userId],
  );
  return { state, setAutoRead };
}
