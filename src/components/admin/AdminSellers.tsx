import { useCallback, useId, useState } from "react";
import type { AdminListing, AdminOutput } from "../../../shared/admin.ts";
import type { AdminApi } from "../../api/admin";
import { Plus } from "../icons";
import Modal from "../Modal";
import { Button } from "../ui/button";
import AdminDialogFooter from "./AdminDialogFooter";
import AdminLoad from "./AdminLoad";
import { useAdminAction } from "./useAdminAction";
import { useAdminResource } from "./useAdminResource";

type Seller = AdminOutput<"save_demo_seller">;
type SellerDraft = { id?: string; name: string; styleNote: string };

/** Adds a seller or renames one and edits the style note Pako writes their replies in. */
function SellerEditor({
  api,
  start,
  onSaved,
  onClose,
}: {
  api: AdminApi;
  start: SellerDraft;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(start);
  const [open, setOpen] = useState(true);
  const action = useAdminAction();
  const nameId = useId();
  const noteId = useId();
  const refusalId = useId();
  const adding = start.id === undefined;
  async function save() {
    if (!draft.name.trim()) return;
    if (await action.run(() => api.saveDemoSeller(draft))) {
      onSaved();
      setOpen(false);
    }
  }
  return (
    <Modal
      sheet
      open={open}
      title={adding ? "Add a demo seller" : `Edit ${start.name}`}
      initialFocus={nameId}
      onClose={onClose}
    >
      <form
        className="admin-reason"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label htmlFor={nameId}>Name</label>
        <input
          id={nameId}
          value={draft.name}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <label htmlFor={noteId}>Style note</label>
        <textarea
          id={noteId}
          rows={3}
          value={draft.styleNote}
          maxLength={1000}
          placeholder="How this seller writes, such as short and friendly"
          onChange={(event) =>
            setDraft({ ...draft, styleNote: event.target.value })
          }
        />
        <AdminDialogFooter
          refusal={action.refusal}
          refusalId={refusalId}
          onCancel={() => setOpen(false)}
        >
          <Button
            type="submit"
            className="button primary"
            disabled={!draft.name.trim() || action.busy}
            aria-describedby={action.refusal ? refusalId : undefined}
          >
            {action.busy ? "Saving…" : adding ? "Add seller" : "Save"}
          </Button>
        </AdminDialogFooter>
      </form>
    </Modal>
  );
}

function SellerCard({
  seller,
  listings,
  onEdit,
}: {
  seller: Seller;
  listings: readonly AdminListing[];
  onEdit: () => void;
}) {
  return (
    <li className="admin-seller">
      <div className="admin-seller-head">
        <span className="admin-avatar" aria-hidden="true">
          {seller.name.slice(0, 1)}
        </span>
        <div>
          <strong>{seller.name}</strong>
          <span className="admin-listing-meta">
            {listings.length === 1
              ? "1 listing"
              : `${listings.length} listings`}
          </span>
        </div>
        <Button
          className="button secondary small"
          aria-label={`Edit ${seller.name}`}
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
      <p className="admin-style-note">
        {seller.styleNote || <span className="admin-muted">No style note</span>}
      </p>
      {listings.length > 0 && (
        <ul
          className="admin-seller-listings"
          aria-label={`${seller.name}'s listings`}
        >
          {listings.map((listing) => (
            <li key={listing.id} title={listing.title}>
              <img src={listing.image} alt="" />
              <span>{listing.title}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The demo sellers with their style notes and listings, and a way to add one. */
export default function AdminSellers({ api }: { api: AdminApi }) {
  const load = useCallback(
    () => Promise.all([api.listDemoSellers(), api.listDemoListings()]),
    [api],
  );
  const { resource, reload } = useAdminResource(load);
  const [editing, setEditing] = useState<SellerDraft | null>(null);
  return (
    <AdminLoad resource={resource} onRetry={reload} what="the sellers">
      {([sellers, listings]) => (
        <div className="admin-section">
          <div className="admin-section-head">
            <p className="admin-count">
              {sellers.length} {sellers.length === 1 ? "seller" : "sellers"}
            </p>
            <Button
              animateIcon
              className="button primary"
              onClick={() => setEditing({ name: "", styleNote: "" })}
            >
              <Plus size={18} aria-hidden="true" />
              Add seller
            </Button>
          </div>
          <ul className="admin-sellers">
            {sellers.map((seller) => (
              <SellerCard
                key={seller.id}
                seller={seller}
                listings={listings.filter((listing) =>
                  seller.listingIds.includes(listing.id),
                )}
                onEdit={() =>
                  setEditing({
                    id: seller.id,
                    name: seller.name,
                    styleNote: seller.styleNote,
                  })
                }
              />
            ))}
          </ul>
          {editing && (
            <SellerEditor
              api={api}
              start={editing}
              onSaved={reload}
              onClose={() => setEditing(null)}
            />
          )}
        </div>
      )}
    </AdminLoad>
  );
}
