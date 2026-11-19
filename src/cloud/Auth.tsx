import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Pako from "../components/onboarding/Pako";
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
  if (mode === "complete")
    return (
      <section className="account-auth">
        <Pako mood="cheer" size={80} className="account-auth-pako" />
        <h1>Password saved!</h1>
        <p className="quiet-caption" role="status">
          Use it with your email to sign in on your other devices.
        </p>
        <Button
          animateIcon
          className="button primary large full"
          onClick={onDone}
        >
          Continue
        </Button>
      </section>
    );
  return (
    <section className="account-auth">
      <Pako mood="wave" size={80} className="account-auth-pako" />
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
              const { data, error } = await client.auth.updateUser({
                password,
              });
              fail(error);
              if (!data.user)
                throw new Error(
                  "Could not save your password. Please try again.",
                );
              setPassword("");
              setConfirmation("");
              setMode("complete");
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
            <Input
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
            <Input
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
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
        )}
        <Button
          animateIcon
          type="submit"
          className="button primary large full"
          disabled={busy}
        >
          {busy
            ? "Please wait…"
            : mode === "reset"
              ? "Send reset link"
              : mode === "password"
                ? "Save password"
                : "Sign in"}
        </Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {!recovery && (
        <div className="account-actions">
          {mode === "reset" ? (
            <Button
              className="button quiet"
              onClick={() => {
                setMode("login");
                setNotice("");
              }}
            >
              Back to sign in
            </Button>
          ) : (
            <Button
              className="button quiet"
              onClick={() => {
                setMode("reset");
                setNotice("");
              }}
            >
              Forgot password?
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
