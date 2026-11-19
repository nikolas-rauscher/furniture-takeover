import type { ReactNode } from "react";
import { ChevronRight, Package, Sparkles, Trash2 } from "@/components/icons";
import { Button } from "./ui/button";

type LocalSettingsProps = {
  connectionStatus: ReactNode;
  developerSettings: ReactNode;
  /** Sample listings are a demo tool: absent while developer mode is off. */
  onAddDemo?: () => void;
  onHelp: () => void;
  onClear: () => void;
};

type SettingsRowProps = {
  icon: ReactNode;
  tone: "sand" | "sky" | "danger";
  title: string;
  detail: string;
  onClick: () => void;
};

function SettingsRow({ icon, tone, title, detail, onClick }: SettingsRowProps) {
  return (
    <li>
      <Button className="settings-row" data-tone={tone} onClick={onClick}>
        <span className="settings-row-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="settings-row-text">
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </li>
  );
}

/** Settings without an account: everything lives in this browser. */
export default function LocalSettings({
  connectionStatus,
  developerSettings,
  onAddDemo,
  onHelp,
  onClear,
}: LocalSettingsProps) {
  return (
    <section className="local-settings-page">
      <div className="page-title">
        <h1>Workspace settings</h1>
        <p>Your listings and preferences are saved in this browser.</p>
      </div>
      {connectionStatus}
      {developerSettings}
      <ul className="settings-rows">
        {onAddDemo && (
          <SettingsRow
            icon={<Package size={22} />}
            tone="sand"
            title="Add sample listings"
            detail="Fictional demo items to try things out."
            onClick={onAddDemo}
          />
        )}
        <SettingsRow
          icon={<Sparkles size={22} />}
          tone="sky"
          title="How the agent works"
          detail="What Pako searches, writes and keeps."
          onClick={onHelp}
        />
        <SettingsRow
          icon={<Trash2 size={22} />}
          tone="danger"
          title="Clear local workspace"
          detail="Removes your listings, favourites, saved searches and their alerts from this browser."
          onClick={onClear}
        />
      </ul>
    </section>
  );
}
