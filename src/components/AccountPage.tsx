import {
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig, motion } from "motion/react";
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
  Check,
  Ellipsis,
  MapPin,
  Pencil,
  Plus,
  Image as ImageIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { money, type Product } from "../../shared/marketplace";
import { useMomentPassed } from "../hooks/useMomentPassed";
import Confetti from "./onboarding/Confetti";
import Pako, { PAKO_FLIGHT_MS } from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import PakoReaction from "./PakoReaction";
import ProductGrid from "./ProductGrid";
import { celebrationFor, type Celebration } from "../sellingCelebration";

export type AccountTab = "favorites" | "listings" | "archive";

/** How long Pako celebrates a listing that was just published. */
const CELEBRATION_MS = 6000;

const STATUS_LABELS: Record<Product["status"], string> = {
  active: "Active",
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "Archived",
};

/** The news, and the listings it is about: one listing, or a batch published together. */
type PublishCelebration = Celebration & { id: string };

/**
 * How many of the visitor's listings found a new home, as a friendly progress
 * bar. Right after publishing, the same card celebrates instead of a second
 * Pako repeating the news: he flies the listing in on beating lids, lands and
 * cheers while confetti leaves his box.
 */
function SellingProgress({
  listings,
  celebration,
}: {
  listings: Product[];
  celebration: PublishCelebration | null;
}) {
  const headingId = useId();
  const landed = useMomentPassed(
    celebration && { id: celebration.id, ms: PAKO_FLIGHT_MS },
  );
  const count = (status: Product["status"]) =>
    listings.filter((item) => item.status === status).length;
  const sold = count("sold");
  const total = listings.length;
  const counts = (["active", "reserved", "sold"] as const).filter(
    (status) => count(status) > 0,
  );
  const pakoMood: PakoMood = celebration
    ? landed
      ? "cheer"
      : "deliver"
    : sold === total
      ? "happy"
      : "idle";
  return (
    <section className="selling-progress" aria-labelledby={headingId}>
      <span className="selling-progress-pako">
        {celebration && landed && (
          <span className="selling-progress-burst" aria-hidden="true">
            <Confetti />
          </span>
        )}
        <Pako mood={pakoMood} size={56} />
      </span>
      <div className="selling-progress-body" aria-live="polite">
        <h2 id={headingId}>
          {celebration
            ? celebration.title
            : sold === total
              ? `All ${total} sold!`
              : `${sold} of ${total} sold`}
        </h2>
        {celebration && (
          <motion.p
            className="selling-progress-news"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            {celebration.text}
          </motion.p>
        )}
        <div
          className="selling-progress-bar"
          role="progressbar"
          aria-labelledby={headingId}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={sold}
        >
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${(sold / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 22 }}
          />
        </div>
        <ul className="selling-progress-counts">
          {counts.map((status) => (
            <li key={status} className="chip" data-status={status}>
              {count(status)} {STATUS_LABELS[status].toLowerCase()}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The intro's rubber stamp lands on the listing that was just published. */
function PublishedStamp({ label }: { label: string }) {
  return (
    <motion.span
      className="published-stamp"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 1.6, rotate: -16 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ type: "spring", stiffness: 520, damping: 18, delay: 0.3 }}
    >
      <Check size={16} strokeWidth={3} />
      {label}
    </motion.span>
  );
}

type AccountPageProps = {
  cloud?: boolean;
  /** Whether the listings are known; until then the page shows only its title. */
  loaded: boolean;
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
  renderProduct(item: Product, arriving: boolean): ReactNode;
  /** The listings that were just published, celebrated for a few seconds. */
  publishedIds: string[];
  onCelebrationEnd(): void;
};

export default function AccountPage({
  cloud = false,
  loaded,
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
  publishedIds,
  onCelebrationEnd,
}: AccountPageProps) {
  const endCelebration = useEffectEvent(onCelebrationEnd);
  const publishedKey = publishedIds.join(" ");
  /** Listings published during this visit lead the list, so the seller finds them first. */
  const [leading, setLeading] = useState(publishedIds);
  if (publishedIds.some((id) => !leading.includes(id)))
    setLeading([...new Set([...publishedIds, ...leading])]);
  useEffect(() => {
    if (!publishedKey) return;
    const timer = setTimeout(() => endCelebration(), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [publishedKey]);
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
  const tabListings = isSaved
    ? savedListings
    : accountTab === "archive"
      ? archivedListings
      : visibleListings;
  const items = tabListings
    .filter(
      (item) =>
        matchesQuery(item) &&
        (accountTab !== "listings" ||
          status === "all" ||
          item.status === status),
    )
    .sort(
      (a, b) =>
        Number(leading.includes(b.id)) - Number(leading.includes(a.id)),
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
      <ProductGrid items={items} renderProduct={renderProduct} />
    ) : (
      <div className="own-listings">
        {items.map((item) => (
          <article
            className={cn(
              "own-listing linked-card",
              publishedIds.includes(item.id) && "is-published",
            )}
            key={item.id}
          >
            {publishedIds.includes(item.id) && (
              <PublishedStamp label={cloud ? "Live" : "Saved"} />
            )}
            <div
              className={cn(
                "own-listing-image",
                item.status === "withdrawn" && "listing-archived-image",
              )}
            >
              {item.image ? (
                <img src={item.image} alt="" />
              ) : (
                <ImageIcon size={28} aria-hidden="true" />
              )}
            </div>
            <div className="own-listing-body">
              <div className="own-listing-heading">
                <h2>
                  {item.status === "withdrawn" ? (
                    item.title
                  ) : (
                    <Button
                      className="own-listing-title card-link"
                      onClick={() => onOpen(item)}
                    >
                      {item.title}
                    </Button>
                  )}
                </h2>
                <span
                  className="chip own-listing-status"
                  data-status={item.status}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              <strong>{money(item.price)}</strong>
              <p>
                <MapPin size={14} aria-hidden="true" />
                <span>
                  {item.location}
                  {item.available ? ` · ${item.available}` : ""}
                </span>
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
      <span className="empty-state-pako">
        <PakoReaction mood={filtered ? "sad" : "wave"} size={96} />
      </span>
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
        <Button variant="default" onClick={onBrowse}>
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
    <MotionConfig reducedMotion="user">
      <section className="items-page">
        <div className="page-title title-with-action">
          <h1>{isSaved ? "Saved items" : "My listings"}</h1>
          {!isSaved && (
            <Button variant="default" onClick={onSell}>
              <Plus size={16} />
              Create listing
            </Button>
          )}
          {/* Saved items give their count, which is known once the listings are. */}
          {(loaded || !isSaved) && (
            <p>
              {isSaved
                ? `${savedListings.length} saved ${savedListings.length === 1 ? "item" : "items"}`
                : cloud
                  ? "Your items, availability and selling progress."
                  : "Listings saved in this browser."}
            </p>
          )}
        </div>
        {/* Until the listings are known, no count, list or "no listings yet" shows. */}
        {!loaded ? null : isSaved ? (
          <>
            {tabListings.length > 0 && toolbar}
            {content}
          </>
        ) : (
          <Tabs
            value={accountTab}
            onValueChange={(value) => setAccountTab(value as AccountTab)}
          >
            <TabsList className="account-tabs" aria-label="Your listings">
              <TabsTrigger
                value="listings"
                aria-label={`Listings (${visibleListings.length})`}
              >
                Listings<span aria-hidden="true">{visibleListings.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="archive"
                aria-label={`Archive (${archivedListings.length})`}
              >
                Archive<span aria-hidden="true">{archivedListings.length}</span>
              </TabsTrigger>
            </TabsList>
            {/* While a search or status filter is on, the matches come first. */}
            {accountTab === "listings" &&
              visibleListings.length > 0 &&
              !filtered && (
                <SellingProgress
                  listings={visibleListings}
                  celebration={
                    items.some((item) => publishedIds.includes(item.id))
                      ? {
                          ...celebrationFor(publishedIds.length, cloud),
                          id: publishedKey,
                        }
                      : null
                  }
                />
              )}
            {tabListings.length > 0 && toolbar}
            {/* The panel's cards are the stops; the panel itself is not one. */}
            <TabsContent value={accountTab} tabIndex={-1}>
              {content}
            </TabsContent>
          </Tabs>
        )}
      </section>
    </MotionConfig>
  );
}
