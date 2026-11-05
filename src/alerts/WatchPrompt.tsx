import { Bell, Check } from "lucide-react";
import { money } from "../../shared/marketplace";
import "./alerts.css";

type WatchPromptProps = {
  query: string;
  maxPrice?: number;
  watching: boolean;
  onWatch(): void;
};

/** The agent only offers this; nothing is watched until the buyer taps it. */
export default function WatchPrompt({
  query,
  maxPrice,
  watching,
  onWatch,
}: WatchPromptProps) {
  const what = `“${query}”${maxPrice === undefined ? "" : ` up to ${money(maxPrice)}`}`;
  return (
    <div className="watch-prompt">
      <p>
        {watching
          ? `Watching for ${what}. You'll get a notification in the app when a matching listing appears.`
          : `Nothing matches yet. Get notified in the app when a listing for ${what} appears.`}
      </p>
      <button
        type="button"
        className="button secondary small"
        disabled={watching}
        onClick={onWatch}
      >
        {watching ? <Check size={14} /> : <Bell size={14} />}
        {watching ? "Watching" : "Notify me"}
      </button>
    </div>
  );
}
