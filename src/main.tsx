import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AccountSession from "./cloud/AccountSession";
import { configureCloud } from "./cloud/session";
import type { CloudConfig } from "./cloud/client";
import "./styles.css";
import "./experience.css";
import "./responsive.css";
function Bootstrap() {
  const [config, setConfig] = useState<CloudConfig | null | undefined>(),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/config", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("Could not connect to the app server.");
        const value = await r.json();
        if (controller.signal.aborted) return;
        if (value.supabaseUrl && value.supabaseKey) {
          configureCloud(value);
          setConfig(value);
        } else if (Object.keys(value).length === 0) {
          configureCloud(null);
          setConfig(null);
        } else throw Error("The server configuration is incomplete.");
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Could not load the app.",
          );
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <main style={{ padding: 32 }}>
        <h1>Connection unavailable</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (config === undefined)
    return (
      <p style={{ padding: 32 }} role="status">
        Loading takeover…
      </p>
    );
  return <AccountSession />;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
);
