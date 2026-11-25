import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { demoSellers } from "../../shared/demoSellers";
import type { DemoLoginRequest } from "../../shared/demoLogin";
import { Button } from "../components/ui/button";
import { openDemoAccount } from "./demoLogin";

/** The team's demo login: one tap opens takeover as that student. */
export default function DemoAccounts({
  client,
  code,
  onSignedIn,
  onOwnAccount,
}: {
  client: SupabaseClient;
  code: string;
  onSignedIn: () => void;
  onOwnAccount: () => void;
}) {
  const [opening, setOpening] = useState<DemoLoginRequest["accountId"]>();
  const [error, setError] = useState("");

  async function open(accountId: DemoLoginRequest["accountId"]) {
    setOpening(accountId);
    setError("");
    try {
      await openDemoAccount(client, { code, accountId });
      onSignedIn();
    } catch (failure) {
      console.error(failure);
      setError(
        failure instanceof Error ? failure.message : "Couldn't sign in.",
      );
      setOpening(undefined);
    }
  }

  return (
    <>
      <ul className="demo-accounts">
        {demoSellers.map(({ id, name }) => (
          <li key={id}>
            <button
              type="button"
              className="settings-row"
              disabled={opening !== undefined}
              aria-busy={opening === id || undefined}
              onClick={() => void open(id)}
            >
              <span className="settings-row-icon" aria-hidden="true">
                {name[0]}
              </span>
              <strong>{opening === id ? "Opening…" : name}</strong>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="account-auth-error" role="alert">
          {error}
        </p>
      )}
      <p className="account-auth-tip">
        Each tab keeps its own student. Open this link in a second tab to play
        the other side.
      </p>
      <div className="account-actions">
        <Button
          className="button quiet"
          disabled={opening !== undefined}
          onClick={onOwnAccount}
        >
          Use my own account
        </Button>
      </div>
    </>
  );
}
