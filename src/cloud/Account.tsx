import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { fail } from "./client";
import AccountApiKeys from "./AccountApiKeys";

type AccountSection = "profile" | "keys" | "payments" | "security" | "privacy";
type Handover = "" | "pickup" | "shipping" | "both";
const accountSections = [
  ["profile", "Profile & pickup"],
  ["keys", "API keys"],
  ["payments", "Payments"],
  ["security", "Sign-in & security"],
  ["privacy", "Privacy & data"],
] as const;
export default function Account({
  client,
  session,
  onProfileSaved,
}: {
  client: SupabaseClient;
  session: Session;
  onProfileSaved?: (region: string) => void;
}) {
  const [section, setSection] = useState<AccountSection>("profile");
  const [name, setName] = useState(""),
    [bio, setBio] = useState(""),
    [region, setRegion] = useState(""),
    [postalCode, setPostalCode] = useState(""),
    [country, setCountry] = useState(""),
    [handover, setHandover] = useState<Handover>(""),
    [email, setEmail] = useState(session.user.email ?? ""),
    [password, setPassword] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [loadError, setLoadError] = useState(""),
    [loadAttempt, setLoadAttempt] = useState(0),
    [confirmation, setConfirmation] = useState("");
  const [blocked, setBlocked] = useState<
    { blocked_id: string; name: string }[]
  >([]);
  const bioInput = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (section !== "profile") return;
    const fitBio = () => {
      const input = bioInput.current;
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight + 2}px`;
    };
    fitBio();
    window.addEventListener("resize", fitBio);
    return () => window.removeEventListener("resize", fitBio);
  }, [bio, section]);
  useEffect(() => {
    let alive = true;
    setLoadError("");
    void (async () => {
      try {
        const [profile, prefs, blocks] = await Promise.all([
          client
            .from("profiles")
            .select("display_name, bio")
            .eq("id", session.user.id)
            .maybeSingle(),
          client
            .from("account_preferences")
            .select("pickup_region, postal_code, country, handover")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          client.from("blocked_users").select("blocked_id"),
        ]);
        fail(profile.error);
        fail(prefs.error);
        fail(blocks.error);
        const ids = blocks.data!.map((b) => b.blocked_id);
        const names = ids.length
          ? await client.from("profiles").select("*").in("id", ids)
          : { data: [], error: null };
        fail(names.error);
        if (alive) {
          setName(profile.data?.display_name ?? "");
          setBio(profile.data?.bio ?? "");
          setRegion(prefs.data?.pickup_region ?? "");
          setPostalCode(prefs.data?.postal_code ?? "");
          setCountry(prefs.data?.country ?? "");
          setHandover(prefs.data?.handover ?? "");
          setBlocked(
            ids.map((id) => ({
              blocked_id: id,
              name:
                names.data?.find((p) => p.id === id)?.display_name || "User",
            })),
          );
          setLoaded(true);
        }
      } catch (err) {
        if (alive)
          setLoadError(
            err instanceof Error ? err.message : "Could not load your account.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [client, session.user.id, loadAttempt]);
  async function act(action: () => Promise<void>, success: string) {
    setBusy(true);
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function exportData() {
    const tables = [
      "profiles",
      "account_preferences",
      "saved_listings",
      "blocked_users",
      "reports",
      "conversations",
      "messages",
    ];
    const data: Record<string, unknown> = {
      account: {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
      },
    };
    for (const table of tables) {
      let request = client.from(table).select("*");
      if (table === "profiles") request = request.eq("id", session.user.id);
      const result = await request;
      fail(result.error);
      data[table] = result.data;
    }
    const listings = await client
      .from("listings")
      .select("*")
      .eq("owner_id", session.user.id);
    fail(listings.error);
    data.listings = listings.data;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "takeover-account.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function deleteAccount() {
    // Paginate by always removing the first batch. Listing paths are flat owner/UUID filenames.
    for (;;) {
      const files = await client.storage
        .from("listing-photos")
        .list(session.user.id, { limit: 100 });
      fail(files.error);
      if (!files.data?.length) break;
      fail(
        (
          await client.storage
            .from("listing-photos")
            .remove(files.data.map((f) => `${session.user.id}/${f.name}`))
        ).error,
      );
    }
    fail((await client.rpc("delete_account")).error);
    await client.auth.signOut({ scope: "local" });
  }
  return (
    <section className="account-page">
      <div className="page-title title-with-action">
        <div>
          <h1>Account settings</h1>
          <p>Your profile, preferences and connected services.</p>
        </div>
        <button
          className="button secondary account-signout"
          aria-label="Sign out"
          disabled={busy}
          onClick={() =>
            void act(async () => {
              fail((await client.auth.signOut({ scope: "local" })).error);
            }, "Signed out.")
          }
        >
          <LogOut size={18} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-identity">
            <span className="settings-avatar" aria-hidden="true">
              {name.trim().slice(0, 2).toUpperCase() || "You"}
            </span>
            <strong>{name || "Your account"}</strong>
            <span>{session.user.email}</span>
          </div>
          <nav aria-label="Account settings" className="settings-desktop-nav">
            {accountSections.map(([id, label]) => (
              <button
                key={id}
                aria-current={section === id ? "page" : undefined}
                className={section === id ? "active" : ""}
                onClick={() => {
                  setSection(id);
                  setNotice("");
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <label className="settings-mobile-nav">
            Settings section
            <select
              value={section}
              aria-controls="account-settings-content"
              onChange={(event) => {
                setSection(event.target.value as AccountSection);
                setNotice("");
              }}
            >
              {accountSections.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </aside>
        <div
          className="account-settings"
          id="account-settings-content"
          aria-busy={busy}
        >
          {loadError && (
            <div role="alert" className="account-notice">
              <p>{loadError}</p>
              <button
                className="text-button"
                onClick={() => setLoadAttempt((n) => n + 1)}
              >
                Retry loading account
              </button>
            </div>
          )}
          <p className="settings-verification">
            {session.user.email_confirmed_at
              ? "Email confirmed"
              : "Email confirmation pending"}
          </p>
          {notice && (
            <p role="status" className="account-notice">
              {notice}
            </p>
          )}
          <form
            hidden={section !== "profile"}
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const old = await client
                  .from("profiles")
                  .select("id")
                  .eq("id", session.user.id)
                  .maybeSingle();
                fail(old.error);
                fail(
                  (old.data
                    ? await client
                        .from("profiles")
                        .update({ display_name: name.trim(), bio: bio.trim() })
                        .eq("id", session.user.id)
                    : await client.from("profiles").insert({
                        id: session.user.id,
                        display_name: name.trim(),
                        bio: bio.trim(),
                      })
                  ).error,
                );
                fail(
                  (
                    await client.from("account_preferences").upsert({
                      user_id: session.user.id,
                      pickup_region: region.trim(),
                      postal_code: postalCode.trim(),
                      country: country.trim(),
                      handover,
                    })
                  ).error,
                );
                onProfileSaved?.(region.trim());
              }, "Profile saved.");
            }}
          >
            <h2>Profile & pickup</h2>
            <p className="quiet-caption">
              Help people recognise you and find items nearby.
            </p>
            <fieldset
              className="account-field-group"
              disabled={!loaded || busy}
            >
              <legend>Public profile</legend>
              <p className="quiet-caption">
                Your name and bio are public. Your email stays private.
              </p>
              <label>
                Display name
                <input
                  required
                  autoComplete="nickname"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                <span>
                  About you <span className="account-optional">Optional</span>
                </span>
                <textarea
                  ref={bioInput}
                  maxLength={500}
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A little about you, for the people you buy and sell with."
                  aria-describedby="account-bio-limit"
                />
              </label>
              <small id="account-bio-limit" className="account-character-count">
                {bio.length}/500 characters
              </small>
            </fieldset>
            <fieldset
              className="account-field-group"
              disabled={!loaded || busy}
            >
              <legend>Private location & handover</legend>
              <p className="quiet-caption">
                These optional details stay in your account. Your town can
                prefill a listing’s public location; review it before
                publishing.
              </p>
              <label>
                Town / area of residence
                <input
                  autoComplete="address-level2"
                  maxLength={180}
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Lausanne"
                />
              </label>
              <div className="account-field-row">
                <label>
                  Postal code
                  <input
                    autoComplete="postal-code"
                    maxLength={20}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </label>
                <label>
                  Country
                  <input
                    autoComplete="country-name"
                    maxLength={80}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Preferred handover
                <select
                  value={handover}
                  onChange={(e) => setHandover(e.target.value as Handover)}
                >
                  <option value="">No preference</option>
                  <option value="pickup">Pickup</option>
                  <option value="shipping">Shipping</option>
                  <option value="both">Pickup or shipping</option>
                </select>
              </label>
              <small>
                Arrange exact addresses and handover details privately with the
                other person when needed.
              </small>
            </fieldset>
            <button className="button primary" disabled={!loaded || busy}>
              Save profile
            </button>
          </form>
          {section === "keys" && <AccountApiKeys key={session.user.id} />}
          <section hidden={section !== "payments"} className="account-payments">
            <div className="account-section-heading">
              <h2>Payments</h2>
              <span className="account-coming-soon">Coming soon</span>
            </div>
            <p className="quiet-caption">
              Pay and get paid through Takeover, all in one place.
            </p>
            <div className="account-payments-preview">
              <strong>Payment methods will live here.</strong>
              <p>
                Payments aren’t available yet. There’s nothing to set up, and
                Takeover doesn’t collect card or bank details.
              </p>
            </div>
          </section>
          <form
            hidden={section !== "security"}
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                fail(
                  (
                    await client.auth.updateUser(
                      { email },
                      { emailRedirectTo: location.origin },
                    )
                  ).error,
                );
              }, "Check your inbox to confirm the email change.");
            }}
          >
            <h2>Email</h2>
            <label>
              New email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button disabled={busy || email === session.user.email}>
              Change email
            </button>
          </form>
          <form
            hidden={section !== "security"}
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                fail((await client.auth.updateUser({ password })).error);
                setPassword("");
              }, "Password updated.");
            }}
          >
            <h2>Password</h2>
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy || password.length < 8}>
              Update password
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  fail((await client.auth.signOut({ scope: "others" })).error);
                }, "Other sessions signed out. Existing access tokens can remain valid until they expire.")
              }
            >
              Sign out other devices
            </button>
          </form>
          <section hidden={section !== "privacy"}>
            <h2>Blocked users</h2>
            <p>
              Blocking stops new messages in both directions. Existing
              conversations remain visible.
            </p>
            {blocked.length ? (
              blocked.map((b) => (
                <div className="account-blocked" key={b.blocked_id}>
                  <span>{b.name}</span>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        fail(
                          (
                            await client
                              .from("blocked_users")
                              .delete()
                              .eq("user_id", session.user.id)
                              .eq("blocked_id", b.blocked_id)
                          ).error,
                        );
                        setBlocked((xs) =>
                          xs.filter((x) => x.blocked_id !== b.blocked_id),
                        );
                      }, "User unblocked.")
                    }
                  >
                    Unblock
                  </button>
                </div>
              ))
            ) : (
              <small>No blocked users.</small>
            )}
          </section>
          <section hidden={section !== "privacy"}>
            <h2>Your data</h2>
            <p>
              Download your profile, listings, saved items, reports and
              conversations as JSON. Photo files remain available at their
              listing URLs.
            </p>
            <button
              disabled={busy}
              onClick={() => void act(exportData, "Account export downloaded.")}
            >
              Export my data
            </button>
          </section>
          <form
            hidden={section !== "privacy"}
            className="account-danger"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmation === "DELETE")
                void act(deleteAccount, "Account deleted.");
            }}
          >
            <h2>Delete account</h2>
            <p>
              This permanently removes your account, saved API keys, photos,
              listings and conversations, including messages for the other
              participants. This cannot be undone. Photo removal happens first;
              if deletion fails, retry to finish.
            </p>
            <label>
              Type DELETE to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button disabled={busy || confirmation !== "DELETE"}>
              Delete my account permanently
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
