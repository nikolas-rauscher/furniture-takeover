import { Clock } from "@/components/icons";
import { shortPickup } from "../dealWords";
import { setDemoPickupClock } from "../hooks/useNow";
import { Button } from "./ui/button";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Developer mode only: jumps the local demo's clock around a booked pickup,
 * so every phase of pickup day can be shown, then back to the real time. The
 * jumped clock keeps running and sends nothing by itself.
 */
export default function DemoPickupClock({
  pickupAt,
  now,
}: {
  pickupAt: string;
  now: Date;
}) {
  const at = Date.parse(pickupAt);
  const jumps = [
    { label: "2 h before", to: at - 120 * MINUTE_MS },
    { label: "Pickup time", to: at },
    { label: "20 min after", to: at + 20 * MINUTE_MS },
    { label: "Next day", to: at + DAY_MS + 5 * MINUTE_MS },
    { label: "2 days after", to: at + 2 * DAY_MS },
  ];
  return (
    <div className="pickup-clock" role="group" aria-label="Demo clock">
      <span className="pickup-clock-now">
        <Clock size={14} aria-hidden="true" />
        Demo clock {shortPickup(now.toISOString())}
      </span>
      {jumps.map((jump) => (
        <Button
          key={jump.label}
          type="button"
          className="tap-chip"
          onClick={() => setDemoPickupClock(new Date(jump.to))}
        >
          {jump.label}
        </Button>
      ))}
      <Button
        type="button"
        className="tap-chip"
        onClick={() => setDemoPickupClock(null)}
      >
        Real time
      </Button>
    </div>
  );
}
