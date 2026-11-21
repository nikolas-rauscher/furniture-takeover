import type { ReactNode } from "react";
import type { AccountConnection } from "../cloud/connection";
import LazyBoundary from "../components/LazyBoundary";
import PakoReadingSetting from "../components/PakoReadingSetting";
import {
  AccountSettings,
  Auth,
  DeveloperSettings,
  LocalSettings,
} from "../screens";

type Reading = {
  enabled: boolean;
  /** Why the choice cannot change yet. */
  unavailable?: string;
  onChange: (enabled: boolean) => Promise<void>;
  /** Settings open where this choice is, as a thread's note asked. */
  first: boolean;
};

type Developer = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  clockOffsetMs?: number;
  onResetDemo?: () => Promise<void>;
};

/** Account settings when signed in, sign-in with accounts, and browser settings in the local demo. */
export default function SettingsScreen({
  account,
  reading,
  developer,
  connectionStatus,
  adminEntry,
  onAddDemo,
  onProfileSaved,
  onHelp,
  onClear,
  onSignedIn,
}: {
  account: AccountConnection | undefined;
  reading: Reading;
  developer: Developer;
  connectionStatus: ReactNode;
  adminEntry: ReactNode;
  onAddDemo: (() => void) | undefined;
  onProfileSaved: (pickupRegion: string) => void;
  onHelp: () => void;
  onClear: () => void;
  onSignedIn: () => void;
}) {
  return (
    <LazyBoundary label="Loading settings">
      {account?.session ? (
        <AccountSettings
          client={account.client}
          session={account.session}
          startSection={reading.first ? "privacy" : "profile"}
          pakoSetting={
            <PakoReadingSetting
              enabled={reading.enabled}
              unavailable={reading.unavailable}
              onEnabledChange={reading.onChange}
            />
          }
          onProfileSaved={onProfileSaved}
          adminEntry={adminEntry}
          browserTools={
            <DeveloperSettings
              enabled={developer.enabled}
              onEnabledChange={developer.onChange}
              detail="While you write a listing, see how many of this browser's saved searches would get an alert. Saved in this browser."
            />
          }
        />
      ) : account ? (
        <div className="settings-auth-page">
          <Auth client={account.client} onDone={onSignedIn} />
        </div>
      ) : (
        <LocalSettings
          connectionStatus={connectionStatus}
          pakoSetting={
            <PakoReadingSetting
              enabled={reading.enabled}
              onEnabledChange={reading.onChange}
            />
          }
          developerSettings={
            <DeveloperSettings
              enabled={developer.enabled}
              onEnabledChange={developer.onChange}
              detail="Sample listings, the seller's view in Messages, demo time skips and alert counts while selling. Saved in this browser."
              clockOffsetMs={developer.clockOffsetMs}
              onResetDemo={developer.onResetDemo}
            />
          }
          onAddDemo={onAddDemo}
          onHelp={onHelp}
          onClear={onClear}
          adminEntry={adminEntry}
        />
      )}
    </LazyBoundary>
  );
}
