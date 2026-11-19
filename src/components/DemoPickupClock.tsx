import { Clock } from "@/components/icons";
import { formatPickup } from "../../shared/pickupTime";
import { setDemoPickupClock } from "../hooks/useNow";
import { Button } from "./ui/button";

const MINUTE_MS = 60_000;

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
  ];
  return (
    <div className="demo-clock" role="group" aria-label="Demo clock">
      <span className="demo-clock-now">
        <Clock size={14} aria-hidden="true" />
        Demo clock · {formatPickup(now.toISOString())}
      </span>
      <div className="demo-clock-jumps">
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
    </div>
  );
}
