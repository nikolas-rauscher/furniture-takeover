import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail } from "./client";
export default function Auth({
  client,
  recovery = false,
  onDone,
}: {
  client: SupabaseClient;
  recovery?: boolean;
  onDone: () => void;
}) {
  const [mode, setMode] = useState(recovery ? "password" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <section className="account-auth">
      <h1>
        {mode === "reset"
          ? "Reset password"
          : mode === "password"
            ? "Choose a new password"
            : "Welcome back"}
      </h1>
      {mode === "login" && (
        <p className="quiet-caption">
          Takeover is currently invite-only. Accept your email invitation and
          set a password before signing in.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setNotice("");
          try {
            if (mode === "reset") {
              fail(
                (
                  await client.auth.resetPasswordForEmail(email, {
                    redirectTo: location.origin,
                  })
                ).error,
              );
              setNotice(
                "If an account exists for that address, check your email. Open the reset link in this browser.",
              );
            } else if (mode === "password") {
              if (password !== confirmation)
                throw new Error("The passwords do not match.");
              fail((await client.auth.updateUser({ password })).error);
              onDone();
            } else {
              fail(
                (await client.auth.signInWithPassword({ email, password }))
                  .error,
              );
              onDone();
            }
          } catch (err) {
            setNotice(
              err instanceof Error ? err.message : "Could not sign in.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "password" && (
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode === "password" && (
          <label>
            Confirm password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "reset"
              ? "Send reset link"
              : mode === "password"
                ? "Save password"
                : "Sign in"}
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {!recovery && (
        <div className="account-actions">
          {mode === "reset" && (
            <button
              onClick={() => {
                setMode("login");
                setNotice("");
              }}
            >
              Back to sign in
            </button>
          )}
          <button
            onClick={() => {
              setMode("reset");
              setNotice("");
            }}
          >
            Forgot password?
          </button>
        </div>
      )}
    </section>
  );
}
