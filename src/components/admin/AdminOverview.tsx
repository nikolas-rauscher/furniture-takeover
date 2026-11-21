import { useCallback } from "react";
import type { AdminOverview as Overview } from "../../../shared/admin.ts";
import type { AdminApi } from "../../api/admin";
import Pako from "../onboarding/Pako";
import AdminLoad from "./AdminLoad";
import { useAdminResource } from "./useAdminResource";

type Tile = { label: string; value: number; details: string[] };

function tiles({
  listings,
  conversations,
  deals,
  reportsOpen,
  pakoToday,
}: Overview): Tile[] {
  return [
    {
      label: "Active listings",
      value: listings.active,
      details: [
        `${listings.reserved} reserved`,
        `${listings.sold} sold`,
        `${listings.withdrawn} withdrawn`,
        `${listings.hidden} hidden`,
      ],
    },
    { label: "Conversations", value: conversations, details: [] },
    {
      label: "Open deals",
      value: deals.open,
      details: [
        `${deals.agreed} agreed`,
        `${deals.completed} completed`,
        `${deals.cancelled} cancelled`,
      ],
    },
    { label: "Open reports", value: reportsOpen, details: [] },
    {
      label: "Pako requests today",
      value: pakoToday.requests,
      details: [`${pakoToday.threadReads} thread reads`],
    },
  ];
}

/** Pako's one line on the overview: the open reports first, since they need a person. */
function greeting(reportsOpen: number) {
  if (reportsOpen === 0) return "No open reports. All calm today.";
  return reportsOpen === 1
    ? "One report is waiting in Moderation."
    : `${reportsOpen} reports are waiting in Moderation.`;
}

export default function AdminOverview({ api }: { api: AdminApi }) {
  const load = useCallback(() => api.overview(), [api]);
  const { resource, reload } = useAdminResource(load);
  return (
    <AdminLoad resource={resource} onRetry={reload} what="the overview">
      {(overview) => (
        <div className="admin-overview">
          <div className="admin-pako">
            <Pako mood="wave" size={64} />
            <p className="admin-pako-bubble">
              {greeting(overview.reportsOpen)}
            </p>
          </div>
          <ul className="admin-tiles" aria-label="Today at a glance">
            {tiles(overview).map((tile) => (
              <li key={tile.label} className="admin-tile">
                <span className="admin-tile-value">{tile.value}</span>
                <span className="admin-tile-label">{tile.label}</span>
                {tile.details.length > 0 && (
                  <span className="admin-tile-details">
                    {tile.details.join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="admin-footnote">Today counts from midnight UTC.</p>
        </div>
      )}
    </AdminLoad>
  );
}
