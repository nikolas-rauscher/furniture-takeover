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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  return (
    <section className="account-auth">
      <h1>
        {mode === "signup"
          ? "Create your account"
          : mode === "reset"
            ? "Reset password"
            : mode === "password"
              ? "Choose a new password"
              : "Welcome back"}
      </h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setNotice("");
          try {
            if (mode === "signup") {
              const { data, error } = await client.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: location.origin },
              });
              fail(error);
              if (data.session) onDone();
              else setNotice("Check your email to confirm your account.");
            } else if (mode === "reset") {
              fail(
                (
                  await client.auth.resetPasswordForEmail(email, {
                    redirectTo: location.origin,
                  })
                ).error,
              );
              setNotice("Check your email for a password reset link.");
            } else if (mode === "password") {
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
        <button className="button primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
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
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setNotice("");
            }}
          >
            {mode === "signup"
              ? "Already have an account?"
              : "Create an account"}
          </button>
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
