import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useId, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Pako from "../components/onboarding/Pako";
import { fail } from "./client";

type AuthMode = "login" | "reset" | "password" | "complete";

/** What a failed step tells the student; the provider's own wording varies by deployment. */
const AUTH_FAILURES: Record<Exclude<AuthMode, "complete">, string> = {
  login:
    "Couldn't sign in. Check your email and password, or reset your password.",
  reset: "Couldn't send a reset link. Check your email and try again.",
  password: "Couldn't save your password. Try again.",
};

const BUSY_LABELS: Record<Exclude<AuthMode, "complete">, string> = {
  login: "Signing in…",
  reset: "Sending reset link…",
  password: "Saving password…",
};

export default function Auth({
  client,
  recovery = false,
  onDone,
}: {
  client: SupabaseClient;
  recovery?: boolean;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(recovery ? "password" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const passwordHint = useId();
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
          You need an invitation to sign in to takeover. Open your invite email
          to set a password.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (mode === "password" && password !== confirmation) {
            setNotice("The passwords don't match.");
            return;
          }
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
                "If that email has an account, we'll send a reset link. Open it in this browser.",
              );
            } else if (mode === "password") {
              const { data, error } = await client.auth.updateUser({
                password,
              });
              fail(error);
              if (!data.user)
                throw new Error("The password update returned no user.");
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
            console.error(err);
            setNotice(AUTH_FAILURES[mode]);
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
            {mode === "password" ? "New password" : "Password"}
            <Input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
              aria-describedby={mode === "password" ? passwordHint : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "password" && (
              <small id={passwordHint} className="quiet-caption">
                At least 8 characters
              </small>
            )}
          </label>
        )}
        {mode === "password" && (
          <label>
            Repeat password
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
            ? BUSY_LABELS[mode]
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
