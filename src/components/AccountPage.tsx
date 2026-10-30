import { useState, type ReactNode } from "react";
import {
  Camera,
  Heart,
  Pencil,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { money, type Product } from "../../shared/marketplace";

export type AccountTab = "favorites" | "listings" | "archive";
type AccountPageProps = {
  cloud?: boolean;
  accountTab: AccountTab;
  setAccountTab(tab: AccountTab): void;
  visibleListings: Product[];
  savedListings: Product[];
  archivedListings: Product[];
  onSell(): void;
  onOpen(item: Product): void;
  onEdit(item: Product): void;
  onStatusChange(id: string, status: Product["status"]): void;
  renderProduct(item: Product): ReactNode;
};

export default function AccountPage({
  cloud = false,
  accountTab,
  setAccountTab,
  visibleListings,
  savedListings,
  archivedListings,
  onSell,
  onOpen,
  onEdit,
  onStatusChange,
  renderProduct,
}: AccountPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const accountListings = (
    accountTab === "archive" ? archivedListings : visibleListings
  ).filter(
    (item) =>
      (accountTab === "archive" ||
        status === "all" ||
        item.status === status) &&
      `${item.title} ${item.location}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const filteredSaved = savedListings.filter((item) =>
    `${item.title} ${item.location}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="page-title title-with-action">
        <div>
          <h1>{accountTab === "favorites" ? "Saved items" : "My listings"}</h1>
          <p>
            {cloud
              ? "Edit your listings, manage availability and track what you’ve sold."
              : "Manage the listings saved in this browser."}
          </p>
        </div>
        <button className="button primary" onClick={onSell}>
          <Plus size={16} />
          Sell furniture
        </button>
      </div>
      <div className="account-tabs" role="tablist" aria-label="Your items">
        <button
          role="tab"
          aria-selected={accountTab === "listings"}
          className={accountTab === "listings" ? "active" : ""}
          onClick={() => setAccountTab("listings")}
        >
          Listings<span>{visibleListings.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={accountTab === "favorites"}
          className={accountTab === "favorites" ? "active" : ""}
          onClick={() => setAccountTab("favorites")}
        >
          Saved items<span>{savedListings.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={accountTab === "archive"}
          className={accountTab === "archive" ? "active" : ""}
          onClick={() => setAccountTab("archive")}
        >
          Archive<span>{archivedListings.length}</span>
        </button>
      </div>
      <div className="listing-toolbar">
        <input
          type="search"
          aria-label="Search your items"
          placeholder="Search by title or location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {accountTab === "listings" && (
          <select
            aria-label="Listing status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses ({visibleListings.length})</option>
            <option value="active">
              Active (
              {visibleListings.filter((p) => p.status === "active").length})
            </option>
            <option value="reserved">
              Reserved (
              {visibleListings.filter((p) => p.status === "reserved").length})
            </option>
            <option value="sold">
              Sold ({visibleListings.filter((p) => p.status === "sold").length})
            </option>
          </select>
        )}
      </div>
      {accountTab === "favorites" &&
        (filteredSaved.length ? (
          <div className="product-grid">
            {filteredSaved.map((item) => renderProduct(item))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={30} />
            <h2>{query ? "No matching saved items" : "No saved items yet"}</h2>
            <p>Save a listing with the heart to find it here later.</p>
            <button
              className="button secondary"
              onClick={() => setAccountTab("listings")}
            >
              My listings
            </button>
          </div>
        ))}
      {accountTab !== "favorites" &&
        (accountListings.length ? (
          <div className="own-listings">
            {accountListings.map((item) => (
              <article className="own-listing" key={item.id}>
                {item.status === "withdrawn" ? (
                  <div
                    className="own-listing-image"
                    aria-hidden="true"
                    style={{ display: "grid", placeItems: "center" }}
                  >
                    <Trash2 size={24} />
                  </div>
                ) : (
                  <button
                    className="own-listing-image"
                    aria-label={"Open " + item.title}
                    onClick={() => onOpen(item)}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.title} />
                    ) : (
                      <span className="listing-no-photo">
                        <ImageIcon size={28} />
                      </span>
                    )}
                  </button>
                )}
                <div>
                  <span
                    className={
                      "status " + (item.status !== "active" ? "muted" : "")
                    }
                  >
                    {item.status === "active"
                      ? cloud
                        ? "Active"
                        : "Active locally"
                      : item.status === "withdrawn"
                        ? "Archived"
                        : item.status === "reserved"
                          ? "Reserved"
                          : "Sold"}
                  </span>
                  <h2>{item.title}</h2>
                  <strong>{money(item.price)}</strong>
                  <p>
                    {item.location} · {item.available}
                  </p>
                  <div className="listing-actions">
                    {item.status !== "withdrawn" && (
                      <button
                        className="button secondary small"
                        onClick={() => onEdit(item)}
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    )}
                    {item.status === "active" && (
                      <button
                        className="button secondary small"
                        onClick={() => onStatusChange(item.id, "reserved")}
                      >
                        Mark reserved
                      </button>
                    )}
                    {(item.status === "active" ||
                      item.status === "reserved") && (
                      <button
                        className="button secondary small"
                        onClick={() => onStatusChange(item.id, "sold")}
                      >
                        Mark sold
                      </button>
                    )}
                    {item.status !== "active" && (
                      <button
                        className="text-button"
                        onClick={() => onStatusChange(item.id, "active")}
                      >
                        {item.status === "withdrawn"
                          ? "Restore listing"
                          : "Make active"}
                      </button>
                    )}
                    {item.status !== "withdrawn" && (
                      <button
                        className="text-button"
                        onClick={() => onStatusChange(item.id, "withdrawn")}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Camera size={32} />
            <h2>
              {query || (accountTab === "listings" && status !== "all")
                ? "No matching listings"
                : accountTab === "archive"
                  ? "No archived listings"
                  : "Your first listing starts with a photo"}
            </h2>
            <p>
              {query || (accountTab === "listings" && status !== "all")
                ? "Try a different search or show all statuses."
                : accountTab === "archive"
                  ? "Items you archive will appear here."
                  : "Add your item and let the agent prepare the details."}
            </p>
            {accountTab !== "archive" && (
              <button className="button primary" onClick={onSell}>
                Create a listing
              </button>
            )}
          </div>
        ))}
    </>
  );
}
