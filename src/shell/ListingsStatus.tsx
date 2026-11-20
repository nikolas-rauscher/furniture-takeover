import DatabaseStatus from "../components/DatabaseStatus";
import type { useMarketplaceListings } from "../hooks/useMarketplaceListings";
import { useNoticeableWait } from "../hooks/useNoticeableWait";

/** Says when listings or saved items failed, or take a noticeable while to load or save. */
export default function ListingsStatus({
  database,
  savedError,
}: {
  database: ReturnType<typeof useMarketplaceListings>;
  savedError: string;
}) {
  const slow = useNoticeableWait(!database.ready || database.pending > 0);
  return (
    <DatabaseStatus
      message={
        database.error ||
        savedError ||
        (slow
          ? database.pending
            ? "Saving listing changes…"
            : "Loading listings…"
          : "")
      }
      onRetry={database.error ? database.retry : undefined}
    />
  );
}
