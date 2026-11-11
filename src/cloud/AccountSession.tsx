import { Button } from "../components/ui/button";
import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import App from "../App";
import Modal from "../components/Modal";
import Auth from "./Auth";
import {
  getCloudClient,
  completePasswordSetup,
  requiresPasswordSetup,
  restoreAccountSession,
  setAccountScope,
} from "./session";
import "./account.css";
export type AccountConnection = {
  client: SupabaseClient;
  session: Session | null;
};
export default function AccountSession() {
  const client = getCloudClient();
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!client),
    [recovery, setRecovery] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!client) return;
    let alive = true;
    function update(next: Session | null) {
      if (alive) {
        setAccountScope(next?.user.id);
        setSession(next);
        setRecovery(requiresPasswordSetup(next));
        setReady(true);
      }
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, next) => {
      update(next);
      if (event === "SIGNED_IN" && alive) setError("");
    });
    void restoreAccountSession()
      .then(({ session, error }) => {
        if (!alive) return;
        if (error) setError(error);
        update(session);
      })
      .catch(() => {
        if (alive) {
          setError("Could not restore your session. Please reload.");
          setReady(true);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [client]);
  if (!ready)
    return (
      <p className="quiet-caption" role="status">
        Loading takeover…
      </p>
    );
  return (
    <>
      {error && (
        <div className="database-status" role="alert">
          {error}
          <Button onClick={() => setError("")}>Dismiss</Button>
        </div>
      )}
      <App
        key={session?.user.id ?? "guest"}
        account={client ? { client, session } : undefined}
      />
      {recovery && client && (
        <Modal title="Set your password" onClose={() => setRecovery(false)}>
          <Auth
            client={client}
            recovery
            onDone={() => {
              completePasswordSetup();
              setRecovery(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
