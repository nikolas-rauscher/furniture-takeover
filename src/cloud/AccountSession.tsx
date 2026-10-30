import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import App from "../App";
import Modal from "../components/Modal";
import Auth from "./Auth";
import { getCloudClient, setAccountScope } from "./session";
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
        setReady(true);
      }
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, next) => {
      update(next);
      if (event === "PASSWORD_RECOVERY" && alive) setRecovery(true);
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        update(data.session);
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
  if (error)
    return (
      <div className="empty-state">
        <p role="alert">{error}</p>
        <button className="button secondary" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );
  return (
    <>
      <App
        key={session?.user.id ?? "guest"}
        account={client ? { client, session } : undefined}
      />
      {recovery && client && (
        <Modal title="Reset your password" onClose={() => setRecovery(false)}>
          <Auth client={client} recovery onDone={() => setRecovery(false)} />
        </Modal>
      )}
    </>
  );
}
