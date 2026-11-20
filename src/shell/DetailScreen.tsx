import type { ReactNode } from "react";
import type { Product } from "../../shared/marketplace";
import ListingDetailPage from "../components/ListingDetailPage";
import type { StripView } from "../dealWords";
import type { ListingCards } from "./ListingCard";

type Catalog = {
  listings: Product[];
  /** They loaded, or loading failed and the status says why. */
  settled: boolean;
  render: (item: Product) => ReactNode;
};

type Actions = {
  onBack: () => void;
  onMessage: (item: Product) => void;
  onOffer: (item: Product) => void;
  onEdit: (item: Product) => void;
  onAskAgent: (item: Product) => void;
  onOpenChat: () => void;
};

/** One listing: photos, details, the student's deal on it, and ways to save, compare, message or offer. */
export default function DetailScreen({
  selected,
  deal,
  cloud,
  reportAction,
  cards,
  catalog,
  availabilityPanel,
  backLabel,
  actions,
}: {
  selected: Product | undefined;
  deal: StripView | undefined;
  cloud: boolean;
  /** Reporting a listing someone else published, with accounts. */
  reportAction: ReactNode;
  cards: ListingCards;
  catalog: Catalog;
  availabilityPanel: ReactNode;
  backLabel: string;
  actions: Actions;
}) {
  return (
    <ListingDetailPage
      selected={selected && cards.shown(selected)}
      deal={deal}
      onOpenChat={actions.onOpenChat}
      availabilityPanel={availabilityPanel}
      loaded={catalog.settled}
      cloud={cloud}
      catalog={catalog.listings}
      renderProduct={catalog.render}
      favorite={cards.saved.includes(selected?.id ?? "")}
      compared={cards.compared.includes(selected?.id ?? "")}
      onToggleFavorite={() => selected && cards.toggleSaved(selected.id)}
      onToggleCompare={() => selected && cards.toggleCompared(selected.id)}
      reportAction={reportAction}
      backLabel={backLabel}
      onBack={actions.onBack}
      onMessage={() => selected && actions.onMessage(selected)}
      onOffer={() => selected && actions.onOffer(selected)}
      onEdit={() => selected && actions.onEdit(selected)}
      onAskAgent={() => {
        if (!selected) return;
        actions.onAskAgent(selected);
      }}
    />
  );
}
