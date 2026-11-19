import { useCallback, useId, useState } from "react";
import type { AdminListing } from "../../../shared/admin.ts";
import { money } from "../../../shared/marketplace";
import { adminIllustrations, type AdminApi } from "../../api/admin";
import { Plus, Search } from "../icons";
import { Button } from "../ui/button";
import { SelectField } from "../ui/select-field";
import {
  draftOf,
  matchesFilter,
  newDraft,
  statusLabels,
  type ListingDraft,
  type StatusFilter,
} from "./adminFormat";
import AdminLoad from "./AdminLoad";
import ListingEditor from "./ListingEditor";
import ReasonDialog from "./ReasonDialog";
import { useAdminResource } from "./useAdminResource";

type Seller = { id: string; name: string };

const ALL_SELLERS = "all";
const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "hidden", label: "Hidden" },
];

function ListingRow({
  listing,
  seller,
  onEdit,
  onToggleHidden,
}: {
  listing: AdminListing;
  seller: string;
  onEdit: () => void;
  onToggleHidden: () => void;
}) {
  return (
    <li className="admin-listing" data-hidden={listing.hidden || undefined}>
      <img src={listing.image} alt="" className="admin-thumb" />
      <div className="admin-listing-text">
        <strong>{listing.title}</strong>
        <span className="admin-listing-meta">
          {money(listing.price)} · {seller}
        </span>
        <span className="admin-badges">
          <span className="admin-badge" data-status={listing.status}>
            {statusLabels[listing.status]}
          </span>
          {listing.hidden && (
            <span className="admin-badge" data-status="hidden">
              Hidden
            </span>
          )}
        </span>
      </div>
      <div className="admin-row-actions">
        <Button
          className="button secondary small"
          aria-label={`Edit ${listing.title}`}
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          className="button quiet small"
          aria-label={`${listing.hidden ? "Restore" : "Hide"} ${listing.title}`}
          onClick={onToggleHidden}
        >
          {listing.hidden ? "Restore" : "Hide"}
        </Button>
      </div>
    </li>
  );
}

function Filters({
  sellers,
  query,
  sellerId,
  status,
  onQuery,
  onSeller,
  onStatus,
}: {
  sellers: readonly Seller[];
  query: string;
  sellerId: string;
  status: StatusFilter;
  onQuery: (query: string) => void;
  onSeller: (sellerId: string) => void;
  onStatus: (status: StatusFilter) => void;
}) {
  const searchId = useId();
  return (
    <div className="admin-filters">
      <div className="admin-search">
        <label htmlFor={searchId} className="sr-only">
          Search listings by title
        </label>
        <Search size={18} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder="Search titles"
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      <SelectField
        aria-label="Seller"
        value={sellerId || ALL_SELLERS}
        onValueChange={(value) => onSeller(value === ALL_SELLERS ? "" : value)}
        options={[
          { value: ALL_SELLERS, label: "All sellers" },
          ...sellers.map(({ id, name }) => ({ value: id, label: name })),
        ]}
      />
      <div className="admin-chips" role="group" aria-label="Status">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className="admin-chip"
            aria-pressed={status === filter.value}
            onClick={() => onStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SHIPPED = "the shipped 40 listings and 6 sellers";

/**
 * The demo catalog: every listing with its picture, price, seller and status,
 * filters by title, seller and status, and the editor, hide and reset steps.
 */
export default function AdminListings({ api }: { api: AdminApi }) {
  const load = useCallback(
    () => Promise.all([api.listDemoListings(), api.listDemoSellers()]),
    [api],
  );
  const { resource, reload } = useAdminResource(load);
  const [query, setQuery] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<ListingDraft | null>(null);
  const [hiding, setHiding] = useState<AdminListing | null>(null);
  const [resetting, setResetting] = useState(false);
  return (
    <AdminLoad resource={resource} onRetry={reload} what="the listings">
      {([listings, sellers]) => {
        const sellerName = (id: string) =>
          sellers.find((seller) => seller.id === id)?.name ?? "Unknown seller";
        const shown = listings.filter((listing) =>
          matchesFilter(listing, { query, sellerId, status }),
        );
        return (
          <div className="admin-section">
            <div className="admin-section-head">
              <p className="admin-count" role="status">
                {shown.length} of {listings.length} listings
              </p>
              <Button
                animateIcon
                className="button primary"
                disabled={sellers.length === 0}
                onClick={() =>
                  setEditing(
                    newDraft(sellerId || sellers[0].id, adminIllustrations[0]),
                  )
                }
              >
                <Plus size={18} aria-hidden="true" />
                Add listing
              </Button>
            </div>
            <Filters
              sellers={sellers}
              query={query}
              sellerId={sellerId}
              status={status}
              onQuery={setQuery}
              onSeller={setSellerId}
              onStatus={setStatus}
            />
            {shown.length === 0 ? (
              <p className="admin-empty">No listings match these filters.</p>
            ) : (
              <ul className="admin-listings">
                {shown.map((listing) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    seller={sellerName(listing.sellerId)}
                    onEdit={() => setEditing(draftOf(listing))}
                    onToggleHidden={() => setHiding(listing)}
                  />
                ))}
              </ul>
            )}
            <div className="admin-reset">
              <div>
                <strong>Reset demo data</strong>
                <p>Restores {SHIPPED}. Conversations stay as they are.</p>
              </div>
              <Button
                className="button secondary"
                onClick={() => setResetting(true)}
              >
                Reset demo data
              </Button>
            </div>
            {editing && (
              <ListingEditor
                api={api}
                start={editing}
                sellers={sellers}
                onSaved={reload}
                onClose={() => setEditing(null)}
              />
            )}
            {hiding && (
              <ReasonDialog
                title={`${hiding.hidden ? "Restore" : "Hide"} “${hiding.title}”?`}
                explanation={
                  hiding.hidden
                    ? "Students will see it in the marketplace again."
                    : "Students won't see it in the marketplace. You can restore it later."
                }
                confirmLabel={
                  hiding.hidden ? "Restore listing" : "Hide listing"
                }
                onConfirm={(reason) =>
                  api.setListingHidden({
                    id: hiding.id,
                    hidden: !hiding.hidden,
                    reason,
                  })
                }
                onDone={reload}
                onClose={() => setHiding(null)}
              />
            )}
            {resetting && (
              <ReasonDialog
                danger
                title="Reset demo data?"
                explanation={
                  <p>
                    This restores {SHIPPED} as shipped: your edits are undone
                    and listings or sellers you added are removed. Conversations
                    and their messages stay.
                  </p>
                }
                confirmLabel="Reset demo data"
                onConfirm={(reason) => api.resetDemo({ reason })}
                onDone={reload}
                onClose={() => setResetting(false)}
              />
            )}
          </div>
        );
      }}
    </AdminLoad>
  );
}
