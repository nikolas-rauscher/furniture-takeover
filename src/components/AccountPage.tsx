import type { ReactNode } from "react";
import { Camera, Heart, Pencil, Plus, Trash2 } from "lucide-react";
import { money, type Product } from "../../shared/marketplace";

export type AccountTab = "favorites" | "listings" | "archive";
type AccountPageProps = {
  accountTab: AccountTab;
  setAccountTab(tab: AccountTab): void;
  visibleListings: Product[];
  savedListings: Product[];
  archivedListings: Product[];
  onSell(): void;
  onMessages(): void;
  onOpen(item: Product): void;
  onEdit(item: Product): void;
  onStatusChange(id: string, status: Product["status"]): void;
  renderProduct(item: Product): ReactNode;
};

export default function AccountPage({
  accountTab,
  setAccountTab,
  visibleListings,
  savedListings,
  archivedListings,
  onSell,
  onMessages,
  onOpen,
  onEdit,
  onStatusChange,
  renderProduct,
}: AccountPageProps) {
  const accountListings =
    accountTab === "archive" ? archivedListings : visibleListings;
  return (
    <>
      <div className="page-title title-with-action">
        <div>
          <h1>My space</h1>
          <p>Your browser listings, saved items and demo database.</p>
        </div>
        <button className="button primary" onClick={onSell}>
          <Plus size={16} />
          Sell furniture
        </button>
      </div>
      <button className="button secondary" onClick={() => onMessages()}>
        Open messages
      </button>
      <div className="account-tabs" role="tablist" aria-label="My space">
        <button
          role="tab"
          aria-selected={accountTab === "listings"}
          className={accountTab === "listings" ? "active" : ""}
          onClick={() => setAccountTab("listings")}
        >
          My listings<span>{visibleListings.length}</span>
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
      {accountTab === "favorites" &&
        (savedListings.length ? (
          <div className="product-grid">
            {savedListings.map((item) => renderProduct(item))}
          </div>
        ) : (
          <div className="empty-state">
            <Heart size={30} />
            <h2>No saved local items</h2>
            <p>Use the heart on a local listing to keep it here.</p>
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
                    <img src={item.image} alt={item.title} />
                  </button>
                )}
                <div>
                  <span
                    className={
                      "status " + (item.status !== "active" ? "muted" : "")
                    }
                  >
                    {item.status === "active"
                      ? "Active locally"
                      : item.status === "withdrawn"
                        ? "Archived"
                        : item.status === "reserved"
                          ? "Reserved"
                          : "Sold"}
                  </span>
                  <h2>{item.title}</h2>
                  <strong>{money(item.price)}</strong>
                  <p>{item.available}</p>
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
              {accountTab === "archive"
                ? "No archived listings"
                : "Your first listing starts with a photo"}
            </h2>
            <p>
              {accountTab === "archive"
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
