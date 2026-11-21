import { useState } from "react";
import type { AdminApi } from "../../api/admin";
import { ArrowLeft } from "../icons";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import AdminListings from "./AdminListings";
import AdminModeration from "./AdminModeration";
import AdminOverview from "./AdminOverview";
import AdminSellers from "./AdminSellers";
import AdminStudy from "./AdminStudy";
import "./admin.css";

const sections = [
  { id: "overview", label: "Overview", Screen: AdminOverview },
  { id: "listings", label: "Listings", Screen: AdminListings },
  { id: "sellers", label: "Sellers", Screen: AdminSellers },
  { id: "moderation", label: "Moderation", Screen: AdminModeration },
  { id: "study", label: "Study", Screen: AdminStudy },
] as const;
type Section = (typeof sections)[number]["id"];

/**
 * The admin area: the overview, the demo catalog, its sellers, moderation and the
 * user study's results.
 * Only administrators reach it; anyone else who opens its link is told so.
 */
export default function AdminArea({
  api,
  checking,
  accessError,
  onBack,
}: {
  api: AdminApi | null;
  /** Whether the account's admin access is still being checked. */
  checking: boolean;
  /** Why the admin access check failed, when it did. */
  accessError?: string;
  onBack: () => void;
}) {
  const [section, setSection] = useState<Section>("overview");
  return (
    <section className="admin-page">
      <div className="page-title admin-title">
        <Button
          className="button icon-button secondary"
          aria-label="Back to settings"
          onClick={onBack}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <div>
          <h1>Admin</h1>
          <p>Demo catalog, sellers, moderation and the study.</p>
        </div>
      </div>
      {api ? (
        <Tabs
          value={section}
          onValueChange={(value) => setSection(value as Section)}
        >
          <TabsList className="admin-tabs" aria-label="Admin sections">
            {sections.map(({ id, label }) => (
              <TabsTrigger key={id} value={id} className="admin-tab">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map(({ id, Screen }) => (
            <TabsContent key={id} value={id} tabIndex={-1}>
              {section === id && <Screen api={api} />}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <p className="admin-empty" role="status">
          {checking
            ? "Checking your admin access…"
            : (accessError ??
              "The admin area is for administrators. In the demo, turn on Developer mode in settings.")}
        </p>
      )}
    </section>
  );
}
