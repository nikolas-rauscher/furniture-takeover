import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, MailCheck } from "@/components/icons";
import Pako from "../components/onboarding/Pako";
import type { PakoMood } from "../components/onboarding/storyTypes";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { fail } from "./client";
import {
  PASSWORD_MIN_LENGTH,
  resendFailure,
  signupEmailProblem,
  signupFailure,
  universityEmail,
} from "./signup";

type FormMode = "login" | "reset" | "password";
type AuthMode = FormMode | "signup" | "inbox" | "complete";

/** What a failed step tells the student; the provider's own wording varies by deployment. */
const AUTH_FAILURES: Record<FormMode, string> = {
  login:
    "Couldn't sign in. Check your email and password, or reset your password.",
  reset: "Couldn't send a reset link. Check your email and try again.",
  password: "Couldn't save your password. Try again.",
};

const BUSY_LABELS: Record<FormMode, string> = {
  login: "Signing in…",
  reset: "Sending reset link…",
  password: "Saving password…",
};

const SUBMIT_LABELS: Record<FormMode, string> = {
  login: "Sign in",
  reset: "Send reset link",
  password: "Save password",
};

const TITLES: Record<FormMode, string> = {
  login: "Welcome back",
  reset: "Reset password",
  password: "Choose a new password",
};

/** A resend waits this long, so a student can't flood their own inbox. */
const RESEND_WAIT_S = 30;

/** Pako, the heading and a line under it: the top of every auth step. */
function AuthHead({
  mood,
  title,
  children,
}: {
  mood: PakoMood;
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      <Pako mood={mood} size={80} className="account-auth-pako" />
      <h1 tabIndex={-1}>{title}</h1>
      {children && <p className="quiet-caption">{children}</p>}
    </>
  );
}

function FormError({ text }: { text: string }) {
  return text ? (
    <p className="account-auth-error" role="alert">
      {text}
    </p>
  ) : null;
}

/** A password rule that ticks itself once the typed password meets it. */
function PasswordRule({
  id,
  met,
  missed = false,
}: {
  id: string;
  met: boolean;
  /** The student tried to go on without meeting it. */
  missed?: boolean;
}) {
  return (
    <small
      id={id}
      className="account-auth-rule"
      data-met={met || undefined}
      data-missed={(missed && !met) || undefined}
    >
      <span className="account-auth-rule-mark" aria-hidden="true">
        {met && <Check size={12} strokeWidth={3} />}
      </span>
      At least {PASSWORD_MIN_LENGTH} characters
    </small>
  );
}

/**
 * Create account with a university address: the domain is checked before
 * anything is sent, since the database refuses other addresses with a
 * generic error.
 */
function SignUp({
  client,
  email,
  onEmail,
  onSent,
  onSignIn,
}: {
  client: SupabaseClient;
  email: string;
  onEmail: (email: string) => void;
  onSent: () => void;
  onSignIn: () => void;
}) {
  const [password, setPassword] = useState("");
  /** The email field was left once, so its domain is checked from now on. */
  const [emailLeft, setEmailLeft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailHint = useId();
  const emailError = useId();
  const passwordRule = useId();
  const emailProblem =
    emailLeft || submitted ? signupEmailProblem(email, submitted) : "";
  const passwordMet = password.length >= PASSWORD_MIN_LENGTH;

  async function submit() {
    setSubmitted(true);
    if (!universityEmail(email) || !passwordMet) return;
    setBusy(true);
    setError("");
    const { error: failure } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: location.origin },
    });
    setBusy(false);
    if (failure) {
      console.error(failure);
      setError(signupFailure(failure.code));
      return;
    }
    onSent();
  }

  return (
    <>
      <AuthHead mood="wave" title="Create your account">
        takeover is for EPFL and UNIL students. Sign up with your university
        email.
      </AuthHead>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label>
          University email
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@epfl.ch"
            required
            aria-invalid={Boolean(emailProblem) || undefined}
            aria-describedby={emailProblem ? emailError : emailHint}
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            onBlur={() => setEmailLeft(true)}
          />
          {emailProblem ? (
            <small id={emailError} className="account-auth-field-error">
              {emailProblem}
            </small>
          ) : (
            <small id={emailHint} className="account-auth-hint">
              @epfl.ch or @unil.ch
            </small>
          )}
        </label>
        <label>
          Password
          <Input
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
            aria-invalid={(submitted && !passwordMet) || undefined}
            aria-describedby={passwordRule}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordRule
            id={passwordRule}
            met={passwordMet}
            missed={submitted}
          />
        </label>
        <Button
          animateIcon
          type="submit"
          className="button primary large full"
          disabled={busy}
        >
          {busy ? "Creating your account…" : "Create account"}
        </Button>
      </form>
      <FormError text={error} />
      <div className="account-actions">
        <Button className="button quiet" disabled={busy} onClick={onSignIn}>
          I already have an account
        </Button>
      </div>
    </>
  );
}

/** After sign-up: where the link went, and a resend that waits a little between tries. */
function CheckInbox({
  client,
  email,
  onChangeEmail,
  onSignIn,
}: {
  client: SupabaseClient;
  email: string;
  onChangeEmail: () => void;
  onSignIn: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [wait, setWait] = useState(RESEND_WAIT_S);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setBusy(true);
    setError("");
    const { error: failure } = await client.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: location.origin },
    });
    setBusy(false);
    if (failure) {
      console.error(failure);
      setError(resendFailure(failure.code));
      return;
    }
    setResent(true);
    setWait(RESEND_WAIT_S);
  }

  return (
    <>
      <span className="account-auth-mail" aria-hidden="true">
        <MailCheck size={22} />
      </span>
      <AuthHead mood="deliver" title="Check your inbox">
        I sent a confirmation link to <strong>{email.trim()}</strong>. Open it
        in this browser to finish.
      </AuthHead>
      <p className="account-auth-tip">
        Nothing yet? It can take a minute. Check your spam folder too.
      </p>
      <Button
        className="button secondary full"
        disabled={busy || wait > 0}
        onClick={() => void resend()}
      >
        {busy
          ? "Sending…"
          : wait > 0
            ? `Resend email in ${wait} s`
            : "Resend email"}
      </Button>
      {resent && !error && (
        <p className="account-auth-notice" role="status">
          Sent again. Use the newest link.
        </p>
      )}
      <FormError text={error} />
      <div className="account-actions">
        <Button className="button quiet" onClick={onChangeEmail}>
          Use another email
        </Button>
        <Button className="button quiet" onClick={onSignIn}>
          Back to sign in
        </Button>
      </div>
    </>
  );
}

/** Sign in, ask for a reset link, or choose a new password from that link. */
function AccountForm({
  client,
  mode,
  recovery,
  email,
  onEmail,
  onMode,
  onSignedIn,
  onPasswordSaved,
}: {
  client: SupabaseClient;
  mode: FormMode;
  recovery: boolean;
  email: string;
  onEmail: (email: string) => void;
  onMode: (mode: AuthMode) => void;
  onSignedIn: () => void;
  onPasswordSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const passwordRule = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function perform() {
    if (mode === "reset") {
      fail(
        (
          await client.auth.resetPasswordForEmail(email, {
            redirectTo: location.origin,
          })
        ).error,
      );
      setNotice(
        "If that email has an account, I'll send a reset link. Open it in this browser.",
      );
    } else if (mode === "password") {
      const { data, error: failure } = await client.auth.updateUser({
        password,
      });
      fail(failure);
      if (!data.user) throw new Error("The password update returned no user.");
      onPasswordSaved();
    } else {
      fail((await client.auth.signInWithPassword({ email, password })).error);
      onSignedIn();
    }
  }

  async function submit() {
    if (mode === "password" && password !== confirmation) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await perform();
    } catch (failure) {
      console.error(failure);
      setError(AUTH_FAILURES[mode]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AuthHead mood="wave" title={TITLES[mode]} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
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
              onChange={(event) => onEmail(event.target.value)}
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
              minLength={PASSWORD_MIN_LENGTH}
              required
              aria-describedby={mode === "password" ? passwordRule : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "password" && (
              <PasswordRule
                id={passwordRule}
                met={password.length >= PASSWORD_MIN_LENGTH}
              />
            )}
          </label>
        )}
        {mode === "password" && (
          <label>
            Repeat password
            <Input
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
        )}
        <Button
          animateIcon
          type="submit"
          className="button primary large full"
          disabled={busy}
        >
          {busy ? BUSY_LABELS[mode] : SUBMIT_LABELS[mode]}
        </Button>
      </form>
      <FormError text={error} />
      {notice && (
        <p className="account-auth-notice" role="status">
          {notice}
        </p>
      )}
      {!recovery && (
        <div className="account-actions">
          {mode === "reset" ? (
            <Button
              className="button quiet"
              disabled={busy}
              onClick={() => onMode("login")}
            >
              Back to sign in
            </Button>
          ) : (
            <Button
              className="button quiet"
              disabled={busy}
              onClick={() => onMode("reset")}
            >
              Forgot password?
            </Button>
          )}
        </div>
      )}
      {mode === "login" && (
        <div className="account-auth-new">
          <p>
            <strong>New to takeover?</strong>
            <span>Create an account with your @epfl.ch or @unil.ch email.</span>
          </p>
          <Button
            className="button secondary"
            disabled={busy}
            onClick={() => onMode("signup")}
          >
            Create account
          </Button>
        </div>
      )}
    </>
  );
}

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
  const section = useRef<HTMLElement>(null);
  const shownMode = useRef(mode);
  // The tapped button leaves with its step, so focus moves to the new step's heading.
  useEffect(() => {
    if (shownMode.current === mode) return;
    shownMode.current = mode;
    section.current?.querySelector<HTMLElement>("h1")?.focus();
  }, [mode]);
  const signIn = () => setMode("login");
  return (
    <section ref={section} className="account-auth">
      {mode === "complete" ? (
        <>
          <AuthHead mood="cheer" title="Password saved!" />
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
        </>
      ) : mode === "signup" ? (
        <SignUp
          client={client}
          email={email}
          onEmail={setEmail}
          onSent={() => setMode("inbox")}
          onSignIn={signIn}
        />
      ) : mode === "inbox" ? (
        <CheckInbox
          client={client}
          email={email}
          onChangeEmail={() => setMode("signup")}
          onSignIn={signIn}
        />
      ) : (
        <AccountForm
          key={mode}
          client={client}
          mode={mode}
          recovery={recovery}
          email={email}
          onEmail={setEmail}
          onMode={setMode}
          onSignedIn={onDone}
          onPasswordSaved={() => setMode("complete")}
        />
      )}
    </section>
  );
}
