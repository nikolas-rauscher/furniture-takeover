import { TooltipProvider } from "./components/ui/tooltip";
import { Button } from "./components/ui/button";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import Marketplace, { BootStatus } from "./Marketplace";
import LazyBoundary from "./components/LazyBoundary";
import { lazyScreen } from "./lazyScreen";
import { configureCloud } from "./cloud/session";
import type { CloudConfig } from "./cloud/client";
import { isLocalDemo, requestServerConfig } from "./serverConfig";
import { createDemoFavorites } from "./api/demoFavorites";
import { DemoListingsProvider } from "./api/DemoListingsProvider";
import { DemoInboxProvider } from "./api/DemoInboxProvider";
import { demoDeals } from "./api/demoDeals";
import { MarketplaceDataContext } from "./marketplaceData";

const AccountSession = lazyScreen(() => import("./cloud/AccountSession"));
const demoData = {
  deals: demoDeals,
  ListingsProvider: DemoListingsProvider,
  InboxProvider: DemoInboxProvider,
  favorites: createDemoFavorites(
    () => localStorage,
    () =>
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("storage-failure")),
      ),
  ),
};

function isCloudConfig(value: Record<string, unknown>): value is CloudConfig {
  return Boolean(value.supabaseUrl && value.supabaseKey);
}

/** Reads the server's setup; accounts load the SDK, the local demo never does. */
async function loadConfig(signal: AbortSignal) {
  const value = await requestServerConfig();
  if (isCloudConfig(value)) {
    const [{ cloudClient }] = await Promise.all([
      import("./cloud/cloudClient"),
      AccountSession.prefetch(),
    ]);
    if (!signal.aborted) configureCloud(value, cloudClient);
    return value;
  }
  if (!isLocalDemo(value))
    throw Error("The server configuration is incomplete.");
  configureCloud(null);
  return null;
}

function Bootstrap() {
  const [config, setConfig] = useState<CloudConfig | null | undefined>(),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadConfig(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setConfig(value);
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
        <Button onClick={() => location.reload()}>Try again</Button>
      </main>
    );
  if (config === undefined) return <BootStatus />;
  if (config === null)
    return (
      <MarketplaceDataContext value={demoData}>
        <Marketplace onboardingPaused={false} />
      </MarketplaceDataContext>
    );
  return (
    <LazyBoundary label="Loading takeover" placeholder={<BootStatus />}>
      <AccountSession />
    </LazyBoundary>
  );
}

export function renderApp(root: HTMLElement) {
  createRoot(root).render(
    <React.StrictMode>
      {/* With reduced motion, springs and glides land at once; fades remain. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider delay={400}>
          <Bootstrap />
        </TooltipProvider>
      </MotionConfig>
    </React.StrictMode>,
  );
}
