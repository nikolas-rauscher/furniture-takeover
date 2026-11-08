import { useState, type ReactNode } from "react";
import { SelectField } from "./ui/select-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Archive,
  Camera,
  Ellipsis,
  Heart,
  Pencil,
  Plus,
  Image as ImageIcon,
} from "@/components/icons";
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
  onBrowse(): void;
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
  onBrowse,
  onOpen,
  onEdit,
  onStatusChange,
  renderProduct,
}: AccountPageProps) {
  const [filters, setFilters] = useState<
    Record<AccountTab, { query: string; status: string }>
  >({
    listings: { query: "", status: "all" },
    favorites: { query: "", status: "all" },
    archive: { query: "", status: "all" },
  });
  const { query, status } = filters[accountTab];
  const setQuery = (query: string) =>
    setFilters((current) => ({
      ...current,
      [accountTab]: { ...current[accountTab], query },
    }));
  const setStatus = (status: string) =>
    setFilters((current) => ({
      ...current,
      [accountTab]: { ...current[accountTab], status },
    }));
  const isSaved = accountTab === "favorites";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
  };
  const matchesQuery = (item: Product) =>
    `${item.title} ${item.location}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  const items = (
    isSaved
      ? savedListings
      : accountTab === "archive"
        ? archivedListings
        : visibleListings
  ).filter(
    (item) =>
      matchesQuery(item) &&
      (accountTab !== "listings" || status === "all" || item.status === status),
  );
  const filtered = Boolean(
    query.trim() || (accountTab === "listings" && status !== "all"),
  );
  const toolbar = (
    <div className="listing-toolbar">
      <Input
        type="search"
        aria-label={isSaved ? "Search saved items" : "Search your listings"}
        placeholder="Search by title or location"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {accountTab === "listings" && (
        <SelectField
          aria-label="Listing status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            ...["active", "reserved", "sold"].map((value) => ({
              value,
              label: `${value[0].toUpperCase()}${value.slice(1)} (${visibleListings.filter((p) => p.status === value).length})`,
            })),
          ]}
        />
      )}
    </div>
  );
  const content = items.length ? (
    isSaved ? (
      <div className="product-grid">
        {items.map((item) => renderProduct(item))}
      </div>
    ) : (
      <div className="own-listings">
        {items.map((item) => (
          <article className="own-listing" key={item.id}>
            {item.status === "withdrawn" ? (
              <div
                className="own-listing-image listing-archived-image"
                aria-hidden="true"
              >
                <Archive size={24} />
              </div>
            ) : (
              <Button
                className="own-listing-image"
                aria-label={`Open ${item.title}`}
                onClick={() => onOpen(item)}
              >
                {item.image ? (
                  <img src={item.image} alt="" />
                ) : (
                  <ImageIcon size={28} />
                )}
              </Button>
            )}
            <div className="own-listing-body">
              <div className="own-listing-heading">
                <h2>
                  {item.status === "withdrawn" ? (
                    item.title
                  ) : (
                    <Button
                      className="own-listing-title"
                      onClick={() => onOpen(item)}
                    >
                      {item.title}
                    </Button>
                  )}
                </h2>
                <span
                  className={`status ${item.status !== "active" ? "muted" : ""}`}
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
              </div>
              <strong>{money(item.price)}</strong>
              <p>
                {item.location}
                {item.available ? ` · ${item.available}` : ""}
              </p>
            </div>
            <div className="listing-actions">
              {item.status !== "withdrawn" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(item)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" />}
                  aria-label={`Listing actions for ${item.title}`}
                >
                  <Ellipsis size={20} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.status === "active" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(item.id, "reserved")}
                    >
                      Mark reserved
                    </DropdownMenuItem>
                  )}
                  {(item.status === "active" || item.status === "reserved") && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(item.id, "sold")}
                    >
                      Mark sold
                    </DropdownMenuItem>
                  )}
                  {item.status !== "active" && (
                    <DropdownMenuItem
                      onClick={() => onStatusChange(item.id, "active")}
                    >
                      {item.status === "withdrawn"
                        ? "Restore listing"
                        : "Make active"}
                    </DropdownMenuItem>
                  )}
                  {item.status !== "withdrawn" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onStatusChange(item.id, "withdrawn")}
                      >
                        <Archive size={16} />
                        Archive listing
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        ))}
      </div>
    )
  ) : (
    <div className="empty-state">
      {isSaved ? <Heart size={28} /> : <Camera size={28} />}
      <h2>
        {filtered
          ? isSaved
            ? "No matching saved items"
            : "No matching listings"
          : isSaved
            ? "No saved items yet"
            : accountTab === "archive"
              ? "No archived listings"
              : "Your first listing starts with a photo"}
      </h2>
      <p>
        {filtered
          ? "Try another search or clear your filters."
          : isSaved
            ? "Save a listing with the heart to find it here later."
            : accountTab === "archive"
              ? "Items you archive will appear here."
              : "Add your item and let the agent prepare the details."}
      </p>
      {filtered ? (
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : isSaved ? (
        <Button variant="outline" onClick={onBrowse}>
          Browse listings
        </Button>
      ) : (
        accountTab !== "archive" && (
          <Button variant="default" onClick={onSell}>
            Create a listing
          </Button>
        )
      )}
    </div>
  );
  return (
    <section className="items-page">
      <div className="page-title title-with-action">
        <h1>{isSaved ? "Saved items" : "My listings"}</h1>
        {!isSaved && (
          <Button variant="default" onClick={onSell}>
            <Plus size={16} />
            Create listing
          </Button>
        )}
        <p>
          {isSaved
            ? `${savedListings.length} saved ${savedListings.length === 1 ? "item" : "items"}`
            : cloud
              ? "Your items, availability and selling progress."
              : "Listings saved in this browser."}
        </p>
      </div>
      {isSaved ? (
        <>
          {toolbar}
          {content}
        </>
      ) : (
        <Tabs
          value={accountTab}
          onValueChange={(value) => setAccountTab(value as AccountTab)}
        >
          <TabsList className="account-tabs" aria-label="Your listings">
            <TabsTrigger value="listings">
              Listings<span>{visibleListings.length}</span>
            </TabsTrigger>
            <TabsTrigger value="archive">
              Archive<span>{archivedListings.length}</span>
            </TabsTrigger>
          </TabsList>
          {toolbar}
          <TabsContent value={accountTab}>{content}</TabsContent>
        </Tabs>
      )}
    </section>
  );
}
