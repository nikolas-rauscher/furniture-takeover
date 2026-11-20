import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import {
  CalendarCheck,
  Clock,
  MapPin,
  MessageCircle,
} from "@/components/icons";
import PakoReaction from "../components/PakoReaction";
import { Button } from "../components/ui/button";
import type { Product } from "../../shared/marketplace";
import { HOLD_HOURS, OPEN_QUESTIONS, SELLER_REPLY_HOURS } from "./config";
import { formatDay, formatDeadline, formatTimeLeft } from "./format";
import type { ListingAvailability } from "./reservations";

type DetailPanelProps = {
  listing: Product;
  view: ListingAvailability;
  now: Date;
  busy: boolean;
  onRequest(): void;
  onCancel(): void;
  onJoin(): void;
  onLeave(): void;
  onMessage(): void;
  onFindSimilar(): void;
};

/** A reservation's state changes slide up like the deal card. */
const SLIDE_UP = { type: "spring", stiffness: 380, damping: 32 } as const;

function Status({
  tone,
  icon,
  title,
  detail,
}: {
  tone: "butter" | "sky" | "canvas";
  icon?: ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="availability-status" data-tone={tone} role="status">
      {icon}
      <p>
        <strong>{title}</strong>
        {detail && <span>{detail}</span>}
      </p>
    </div>
  );
}

/** Replaces the detail page's "Message seller" button while the prototype runs. */
export default function DetailPanel(props: DetailPanelProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={props.view.kind}
        className="availability-panel"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={SLIDE_UP}
      >
        <PanelContent {...props} />
      </motion.div>
    </AnimatePresence>
  );
}

function PanelContent({
  listing,
  view,
  now,
  busy,
  onRequest,
  onCancel,
  onJoin,
  onLeave,
  onMessage,
  onFindSimilar,
}: DetailPanelProps) {
  const messageSeller = (enabled: boolean) => (
    <Button
      animateIcon
      className="button secondary full"
      disabled={!enabled}
      onClick={onMessage}
    >
      <MessageCircle size={17} aria-hidden="true" />
      Message seller
    </Button>
  );
  if (view.kind === "pending")
    return (
      <>
        <Status
          tone="butter"
          icon={<Clock size={18} aria-hidden="true" />}
          title={`Waiting for ${listing.seller || "the seller"} · confirms by ${formatDeadline(view.reservation.replyBy)}`}
          detail={`You asked to pick it up by ${formatDay(view.reservation.pickupBy)}. ${formatTimeLeft(view.reservation.replyBy, now)} left to reply.`}
        />
        {messageSeller(true)}
        <Button className="button quiet" onClick={onCancel}>
          Cancel request
        </Button>
      </>
    );
  if (view.kind === "held")
    return (
      <>
        <Status
          tone="sky"
          icon={<MapPin size={18} aria-hidden="true" />}
          title={`Reserved for you until ${formatDeadline(view.reservation.holdUntil!)}`}
          detail={`Pickup at ${
            listing.pickupPoint
              ? `${listing.pickupPoint.name}, ${listing.pickupPoint.address}`
              : listing.location
          }`}
        />
        {messageSeller(true)}
        <Button className="button quiet" onClick={onCancel}>
          Cancel reservation
        </Button>
      </>
    );
  if (view.kind === "reserved")
    return (
      <>
        <Status
          tone="canvas"
          title={
            view.position
              ? `Position ${view.position} on the waitlist`
              : "Someone reserved it."
          }
          detail={
            view.position
              ? "If the item becomes available, the first person on the waitlist gets priority."
              : "Join the waitlist. If the item becomes available, the first person on it gets priority."
          }
        />
        {view.position ? (
          <Button className="button quiet" onClick={onLeave}>
            Leave the waitlist
          </Button>
        ) : (
          <Button className="button secondary full" onClick={onJoin}>
            Join the waitlist
          </Button>
        )}
        {messageSeller(false)}
      </>
    );
  if (view.kind === "sold" || view.kind === "removed")
    return (
      <>
        <div className="availability-gone" role="status">
          <PakoReaction mood="sad" size={48} />
          <p>
            <strong>This one&apos;s gone.</strong>
            <span>
              {view.kind === "removed"
                ? "The listing was removed."
                : view.declined
                  ? "The seller says it's no longer available."
                  : "It has been sold."}
            </span>
          </p>
        </div>
        <Button
          animateIcon
          className="button primary full"
          onClick={onFindSimilar}
        >
          Find something similar
        </Button>
      </>
    );
  return (
    <>
      {view.priorityUntil && (
        <Status
          tone="sky"
          title="It's available again."
          detail={`You're first in line for ${formatTimeLeft(view.priorityUntil, now)}.`}
        />
      )}
      <Button
        animateIcon
        className="button primary large full"
        disabled={busy}
        onClick={onRequest}
      >
        <CalendarCheck size={18} aria-hidden="true" />
        Request reservation
      </Button>
      {messageSeller(true)}
      <ul className="availability-rules" aria-label="How reserving works">
        <li className="chip">
          The seller has {SELLER_REPLY_HOURS} h to respond
        </li>
        <li className="chip">Reserved for {HOLD_HOURS} h</li>
      </ul>
      <p className="availability-open-questions">{OPEN_QUESTIONS}</p>
    </>
  );
}
