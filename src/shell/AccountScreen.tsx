import type { ReactNode } from "react";
import {
  isMine,
  type Product,
  type SavedListing,
} from "../../shared/marketplace";
import AccountPage from "../components/AccountPage";
import type { InboxDeals } from "../hooks/useInboxDeals";
import type { MyListings } from "../hooks/useMyListings";
import type { SellSession } from "../hooks/useSellSession";
import type { AccountTab } from "../navigation";

type Actions = {
  onTab: (tab: AccountTab) => void;
  onSell: () => void;
  onBrowse: () => void;
  onOpen: (item: Product) => void;
};

/** My listings, their archive, and the items the student saved. */
export default function AccountScreen({
  tab,
  loaded,
  cloud,
  catalog,
  saved,
  sell,
  agreementFor,
  actions,
}: {
  tab: AccountTab;
  loaded: boolean;
  cloud: boolean;
  catalog: MyListings;
  saved: {
    listings: SavedListing[];
    render: (item: SavedListing) => ReactNode;
  };
  sell: SellSession;
  agreementFor: InboxDeals["agreementFor"];
  actions: Actions;
}) {
  return (
    <AccountPage
      loaded={loaded}
      accountTab={tab}
      setAccountTab={actions.onTab}
      visibleListings={catalog.visible.filter(isMine)}
      cloud={cloud}
      savedListings={saved.listings}
      archivedListings={catalog.archived.filter(isMine)}
      onSell={actions.onSell}
      onBrowse={actions.onBrowse}
      onOpen={actions.onOpen}
      onEdit={sell.editListing}
      onStatusChange={catalog.setStatus}
      renderSaved={saved.render}
      publishedIds={sell.publishedListings}
      onCelebrationEnd={sell.clearPublished}
      agreementFor={agreementFor}
    />
  );
}
