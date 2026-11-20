import { cardImageFor } from "../../shared/listingPhotos";
import type { AccountTab } from "../navigation";
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
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Image as ImageIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  money,
  type Product,
  type SavedListing,
} from "../../shared/marketplace";
import { useMomentPassed } from "../hooks/useMomentPassed";
import Confetti from "./onboarding/Confetti";
import Pako, { PAKO_FLIGHT_MS } from "./onboarding/Pako";
import type { PakoMood } from "./onboarding/storyTypes";
import PakoReaction from "./PakoReaction";
import ProductGrid from "./ProductGrid";
import { celebrationFor, type Celebration } from "../sellingCelebration";
import type { ListingPickupChoice, PickupSend } from "../pickupOptions";
import Modal from "./Modal";
import {
  pickupConfirmation,
  useListingStatusConfirmation,
} from "../hooks/useListingPickup";
import { useMarketplaceListings } from "../hooks/useMarketplaceListings";

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

type EmptyView = {
  mood: "sad" | "wave" | "idle";
  title: string;
  text: string;
  action?: ReactNode;
  /** Shows on wide screens beside the message: what the tab fills with. */
  example?: ReactNode;
};

/** A tab without listings: Pako, what it means, and the one way on from it. */
function EmptyTab({ view }: { view: EmptyView }) {
  return (
    <div className={cn("empty-state", view.example && "has-example")}>
      {view.example}
      <div className="empty-state-message">
        <span className="empty-state-pako">
          <PakoReaction mood={view.mood} size={96} />
        </span>
        <h2>{view.title}</h2>
        <p>{view.text}</p>
        {view.action}
      </div>
    </div>
  );
}

/** A listing card in outline with its heart filled: where a saved item comes from. */
function SavedExample() {
  return (
    <div className="saved-example" aria-hidden="true">
      <span className="saved-example-photo">
        <span className="saved-example-heart">
          <Heart size={18} />
        </span>
      </span>
      <span className="saved-example-line" />
      <span className="saved-example-line is-short" />
    </div>
  );
}

/** "4 saved items · 1 sold": how many are saved, and how many are gone for good. */
function savedCount(items: SavedListing[]) {
  const count = `${items.length} saved ${items.length === 1 ? "item" : "items"}`;
  const gone = items.filter((item) => item.status === "sold").length;
  return gone ? `${count} · ${gone} sold` : count;
}

/** Saved items still on sale lead; sold and reserved ones follow in their saved order. */
const availableFirst = (items: SavedListing[]) =>
  [...items].sort(
    (a, b) => Number(a.status !== "active") - Number(b.status !== "active"),
  );

type AccountPageProps = {
  cloud?: boolean;
  /** Whether the listings are known; until then the page shows only its title. */
  loaded: boolean;
  accountTab: AccountTab;
  setAccountTab(tab: AccountTab): void;
  visibleListings: Product[];
  savedListings: SavedListing[];
  archivedListings: Product[];
  onSell(): void;
  onBrowse(): void;
  onOpen(item: Product): void;
  onEdit(item: Product): void;
  onStatusChange(id: string, status: Product["status"]): void;
  /** A saved item's card, with its price drop or a way on once it's gone. */
  renderSaved(item: SavedListing): ReactNode;
  /** The listings that were just published, celebrated for a few seconds. */
  publishedIds: string[];
  onCelebrationEnd(): void;
  /** A buyer's agreed deal on a listing: who it is reserved for, and its conversation. */
  agreementFor?(listingId: string): Agreement | undefined;
};

/** A booked pickup on a listing gives status controls an action and its message. */
export type ListingPickup = {
  other: string;
  sold: ListingPickupChoice;
  reopen: ListingPickupChoice;
  /** Sends one action with its message; a failure is thrown in the student's words. */
  onSend(send: PickupSend): Promise<void>;
};
type Agreement = { chip: string; onOpenChat(): void; pickup?: ListingPickup };

type StatusConfirmation = {
  other: string;
  question: string;
  message: string;
  label: string;
  primary?: boolean;
  followUp?: string;
  send(): Promise<void>;
};

function PickupStep({
  confirmation,
  onClose,
}: {
  confirmation: StatusConfirmation;
  onClose(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function send() {
    setBusy(true);
    setError("");
    try {
      await confirmation.send();
      onClose();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={confirmation.question} onClose={() => !busy && onClose()}>
      <p className="deal-card-sends">
        Message to {confirmation.other}: <q>{confirmation.message}</q>
      </p>
      {confirmation.followUp && <p>{confirmation.followUp}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button className="button secondary" disabled={busy} onClick={onClose}>
          Keep agreement
        </Button>
        <Button
          className={`button ${confirmation.primary ? "primary" : "danger"}`}
          disabled={busy}
          onClick={() => void send()}
        >
          {busy ? "Sending…" : confirmation.label}
        </Button>
      </div>
    </Modal>
  );
}

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
  renderSaved,
  publishedIds,
  onCelebrationEnd,
  agreementFor,
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
  const [pickupStep, setPickupStep] = useState<StatusConfirmation>();
  const [listingError, setListingError] = useState("");
  const confirmStatus = useListingStatusConfirmation();
  const { verifyEdit } = useMarketplaceListings();

  async function edit(item: Product) {
    setListingError("");
    try {
      await verifyEdit?.();
      onEdit(item);
    } catch (failure) {
      setListingError((failure as Error).message);
    }
  }

  async function changeStatus(item: Product, status: Product["status"]) {
    setListingError("");
    try {
      const agreement = agreementFor?.(item.id);
      const pickup = agreement?.pickup;
      const applyStatus = (next: Product["status"]) =>
        onStatusChange(item.id, next);
      let confirmation: StatusConfirmation | undefined;
      if (pickup) {
        const choice = status === "sold" ? pickup.sold : pickup.reopen;
        confirmation = pickupConfirmation(pickup.other, choice, pickup.onSend);
      } else
        confirmation = await confirmStatus(
          item,
          status,
          Boolean(agreement),
          applyStatus,
        );

      if (confirmation) {
        setPickupStep({
          ...confirmation,
          followUp:
            status === "withdrawn"
              ? "The buyer will get this message. You can then archive the listing."
              : undefined,
        });
      } else {
        applyStatus(status);
      }
    } catch (failure) {
      setListingError((failure as Error).message);
    }
  }
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
      (a, b) => Number(leading.includes(b.id)) - Number(leading.includes(a.id)),
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
  /** What an empty tab says, and the one way on from it. */
  function emptyView(): EmptyView {
    if (filtered)
      return {
        mood: "sad",
        title: isSaved ? "No matching saved items" : "No matching listings",
        text: "Try another search or clear your filters.",
        action: (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        ),
      };
    if (isSaved)
      return {
        mood: "wave",
        title: "No saved items yet",
        text: "Save listings to find them here later.",
        example: <SavedExample />,
        action: (
          <Button variant="default" onClick={onBrowse}>
            Browse listings
          </Button>
        ),
      };
    if (accountTab === "archive")
      return {
        mood: "wave",
        title: "No archived listings",
        text: "Items you archive will appear here.",
      };
    const archived = archivedListings.length;
    if (archived)
      return {
        mood: "idle",
        title:
          archived === 1
            ? "Your listing is in Archive"
            : `Your ${archived} listings are in Archive`,
        text: "Restore one there to list it again, or create a new listing.",
        action: (
          <Button variant="default" onClick={() => setAccountTab("archive")}>
            <Archive size={16} aria-hidden="true" />
            Open Archive
          </Button>
        ),
      };
    return {
      mood: "wave",
      title: "Your first listing starts with a photo",
      text: "Add your item and let the agent prepare the details.",
      action: (
        <Button variant="default" onClick={onSell}>
          Create a listing
        </Button>
      ),
    };
  }
  const content = items.length ? (
    isSaved ? (
      <ProductGrid
        items={availableFirst(savedListings.filter(matchesQuery))}
        renderProduct={renderSaved}
      />
    ) : (
      <div className="own-listings">
        {items.map((item) => {
          const agreement = agreementFor?.(item.id);
          return (
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
                  <img
                    src={cardImageFor(item)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
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
                    {agreement?.chip ?? STATUS_LABELS[item.status]}
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
                    onClick={() => void edit(item)}
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
                    {agreement && (
                      <>
                        <DropdownMenuItem onClick={agreement.onOpenChat}>
                          <MessageCircle size={16} />
                          Open conversation
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {(item.status === "active" ||
                      item.status === "reserved") && (
                      <DropdownMenuItem
                        disabled={Boolean(agreement?.pickup?.sold.unavailable)}
                        onClick={() => void changeStatus(item, "sold")}
                      >
                        Mark sold
                      </DropdownMenuItem>
                    )}
                    {item.status !== "active" && (
                      <DropdownMenuItem
                        onClick={() => void changeStatus(item, "active")}
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
                          onClick={() => void changeStatus(item, "withdrawn")}
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
          );
        })}
      </div>
    )
  ) : (
    <EmptyTab view={emptyView()} />
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
                ? savedCount(savedListings)
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
        {listingError && (
          <p className="form-error" role="alert">
            {listingError}
          </p>
        )}
        {pickupStep && (
          <PickupStep
            confirmation={pickupStep}
            onClose={() => setPickupStep(undefined)}
          />
        )}
      </section>
    </MotionConfig>
  );
}
