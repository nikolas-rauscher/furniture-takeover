import { useEffect, useState } from "react";
import {
  getAccountKeys,
  removeAccountKey,
  saveAccountKey,
  type AccountKeysStatus,
  type KeyProvider,
} from "../api/accountKeys.ts";

const providers = [
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "Powers your buying and selling assistant.",
    url: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "brave",
    name: "Brave Search",
    description: "Finds web sources for product and price research.",
    url: "https://api-dashboard.search.brave.com/app/keys",
  },
] as const;

export default function AccountApiKeys() {
  const [status, setStatus] = useState<AccountKeysStatus | null>(null);
  const [drafts, setDrafts] = useState({ deepseek: "", brave: "" });
  const [busy, setBusy] = useState<KeyProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void getAccountKeys(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setStatus(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Could not load API keys.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  async function updateKey(provider: KeyProvider, remove = false) {
    setBusy(provider);
    setError("");
    setNotice("");
    try {
      const data = remove
        ? await removeAccountKey(provider)
        : await saveAccountKey(provider, drafts[provider].trim());
      setStatus(data);
      if (!remove) setDrafts((previous) => ({ ...previous, [provider]: "" }));
      const name = providers.find((item) => item.id === provider)!.name;
      setNotice(`${name} key ${remove ? "removed" : "saved"}.`);
      window.dispatchEvent(new Event("takeover-api-keys-changed"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update API keys.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="account-api-keys" aria-busy={loading || busy !== null}>
      <h2>API keys</h2>
      <p className="quiet-caption">
        Connect your own providers. Saved keys override Takeover’s defaults;
        usage is billed by each provider to your account with them.
      </p>
      <p className="account-key-security">
        Keys are encrypted before being stored in Supabase. Saved keys are never
        shown again or included in your account export.
      </p>
      {loading && <p role="status">Loading key settings…</p>}
      {error && (
        <div role="alert" className="account-notice">
          <p>{error}</p>
          {!status && !loading && (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry loading keys
            </button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="account-notice">
          {notice}
        </p>
      )}
      {status && !status.enabled && (
        <p role="status" className="account-notice">
          Personal API keys are not configured on this server yet. You can add
          keys here once secure storage is enabled.
        </p>
      )}
      {providers.map((provider) => {
        const saved = status?.providers[provider.id];
        const unavailable = loading || !status?.enabled || busy !== null;
        return (
          <form
            key={provider.id}
            className="account-key-provider"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unavailable && drafts[provider.id].trim())
                void updateKey(provider.id);
            }}
          >
            <div className="account-key-heading">
              <h3>{provider.name}</h3>
              <span
                className={`account-key-status${saved?.saved ? " saved" : ""}`}
              >
                {saved?.saved
                  ? saved.lastFour
                    ? `Saved · ending ${saved.lastFour}`
                    : "Saved"
                  : status
                    ? "No key saved"
                    : "Status unavailable"}
              </span>
            </div>
            <p className="quiet-caption">{provider.description}</p>
            <label>
              {saved?.saved ? "Replacement API key" : "API key"}
              <input
                type="password"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={512}
                value={drafts[provider.id]}
                onChange={(event) =>
                  setDrafts((previous) => ({
                    ...previous,
                    [provider.id]: event.target.value,
                  }))
                }
                disabled={unavailable}
                placeholder={
                  saved?.saved ? "Paste a replacement key" : "Paste your key"
                }
                aria-label={`${provider.name} ${saved?.saved ? "replacement " : ""}API key`}
              />
            </label>
            <div className="account-key-actions">
              <button
                className="button primary"
                disabled={unavailable || !drafts[provider.id].trim()}
              >
                {busy === provider.id
                  ? "Updating…"
                  : saved?.saved
                    ? "Replace key"
                    : "Save key"}
              </button>
              {saved?.saved && (
                <button
                  type="button"
                  disabled={unavailable}
                  onClick={() => void updateKey(provider.id, true)}
                >
                  Remove key
                </button>
              )}
              <a href={provider.url} target="_blank" rel="noopener noreferrer">
                Get a {provider.name} key
              </a>
            </div>
          </form>
        );
      })}
    </section>
  );
}
