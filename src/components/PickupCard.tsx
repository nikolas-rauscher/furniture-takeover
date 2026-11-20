import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CircleHelp,
  Clock,
  MapPin,
  Package,
} from "@/components/icons";
import type { Deal, DealRole, DealTerms, LateMinutes } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import {
  formatPickup,
  pickupSlots,
  zurichClockTime,
} from "../../shared/pickupTime";
import { pickupCountdown, termPrice } from "../dealWords";
import type { Slot } from "../offerProposal";
import { pickupGuide } from "../pakoMoods";
import { motionBehavior } from "../uiMotion";
import {
  LATE_MINUTES,
  changeSend,
  lateSend,
  movedTerms,
  pickupChoices,
  type PickupChoice,
  type PickupChoices,
  type PickupDay,
  type PickupSend,
} from "../pickupOptions";
import { CARD_SWAP, PlaceNote } from "./DealTerms";
import Pako from "./onboarding/Pako";
import { TapChip, TimePanel } from "./OfferEditor";
import { Button } from "./ui/button";

/** How pickup-day taps reach the deal, or why they can't right now. */
export type PickupLink = {
  available: boolean;
  /** Why pickup actions don't work here, shown beside the card. */
  error: string;
  /** Sends one action with its message; true once it went out. */
  onSend: (send: PickupSend) => Promise<boolean>;
};

type Listing = Pick<Product, "title" | "price" | "available"> & {
  pickupBy?: string;
  pickupPoint?: Product["pickupPoint"];
};

/** What a tap opened before anything is sent: chips to choose from, or the exact message to check. */
type Step =
  | { kind: "late" }
  | { kind: "change" }
  | { kind: "check"; choice: PickupChoice & { send: PickupSend } };

function Countdown({ day }: { day: PickupDay }) {
  return (
    <div className="pickup-head">
      <span className="pickup-head-icon" aria-hidden="true">
        <CalendarCheck size={20} />
      </span>
      <p className="pickup-head-words">
        <strong className="pickup-countdown">{pickupCountdown(day)}</strong>
        <span>{formatPickup(day.terms.pickupAt!)}</span>
      </p>
    </div>
  );
}

/** A day after the pickup the head asks the question instead of counting down. */
function CheckHead({
  day,
  check,
}: {
  day: PickupDay;
  check: NonNullable<PickupDay["pickupCheck"]>;
}) {
  return (
    <div className="pickup-head" data-check={check.expired ? "expired" : "open"}>
      <span className="pickup-head-icon" aria-hidden="true">
        {check.expired ? <Clock size={20} /> : <CircleHelp size={20} />}
      </span>
      <p className="pickup-head-words">
        <strong className="pickup-countdown">
          {check.expired ? "Reservation released" : "Did the pickup happen?"}
        </strong>
        <span>
          {check.expired
            ? `No answer by ${formatPickup(check.expiresAt)}`
            : `Booked for ${formatPickup(day.terms.pickupAt!)}`}
        </span>
      </p>
    </div>
  );
}

/** What and where, beside the time the head already says. */
function Facts({ terms, listing }: { terms: DealTerms; listing: Listing }) {
  return (
    <dl className="pickup-facts">
      <div>
        <dt>
          <Package size={14} aria-hidden="true" />
          Item
        </dt>
        <dd>{listing.title}</dd>
        {terms.amount !== null && (
          <dd className="deal-card-term-note">{termPrice(terms.amount)}</dd>
        )}
      </div>
      {terms.pickupPoint && (
        <div>
          <dt>
            <MapPin size={14} aria-hidden="true" />
            Meeting point
          </dt>
          <dd>{terms.pickupPoint}</dd>
          <dd className="deal-card-term-note">
            <PlaceNote
              name={terms.pickupPoint}
              listingPoint={listing.pickupPoint}
            />
          </dd>
        </div>
      )}
    </dl>
  );
}

/** Who is on the way or late: the other student's news stands out, the student's own stays quiet. */
function Signals({
  deal,
  role,
  other,
}: {
  deal: Deal;
  role: DealRole;
  other: string;
}) {
  const signals = deal.pickup;
  if (!signals) return null;
  const theirs: DealRole = role === "buyer" ? "seller" : "buyer";
  const rows: { key: string; text: string; mine: boolean }[] = [];
  const onWay = (who: DealRole) => signals.onWay[who];
  if (onWay(theirs))
    rows.push({
      key: "their-way",
      text: `${other} is on the way · ${zurichClockTime(onWay(theirs)!)}`,
      mine: false,
    });
  if (signals.late)
    rows.push({
      key: "late",
      text:
        signals.late.by === role
          ? `You said about ${signals.late.minutes} min late · ${zurichClockTime(signals.late.at)}`
          : `${other} is about ${signals.late.minutes} min late · ${zurichClockTime(signals.late.at)}`,
      mine: signals.late.by === role,
    });
  if (signals.noShow && signals.noShow.by === theirs)
    rows.push({
      key: "waiting",
      text: `${other} is waiting at the meeting point`,
      mine: false,
    });
  if (onWay(role))
    rows.push({
      key: "my-way",
      text: `You're on the way · ${zurichClockTime(onWay(role)!)}`,
      mine: true,
    });
  if (!rows.length) return null;
  return (
    <ul className="pickup-signals" aria-label="Pickup news">
      {rows
        .sort((a, b) => Number(a.mine) - Number(b.mine))
        .map((row) => (
          <motion.li
            key={row.key}
            className="pickup-signal"
            data-mine={row.mine || undefined}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
          >
            {row.text}
          </motion.li>
        ))}
    </ul>
  );
}

/** The booked time and the new one side by side, until the other side answers. */
function TimeCompare({
  current,
  proposed,
  proposedBy,
}: {
  current: string;
  proposed: string;
  proposedBy: string;
}) {
  return (
    <div className="pickup-compare" role="group" aria-label="Pickup times">
      <p data-side="current">
        <small>Booked</small>
        <strong>{formatPickup(current)}</strong>
      </p>
      <ArrowRight
        size={18}
        className="pickup-compare-arrow"
        aria-hidden="true"
      />
      <p data-side="proposed">
        <small>{proposedBy}</small>
        <strong>{formatPickup(proposed)}</strong>
      </p>
    </div>
  );
}

function PakoLine({ mood, line }: ReturnType<typeof pickupGuide>) {
  return (
    <div className="pickup-pako">
      <Pako mood={mood} size={40} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={line} className="pickup-pako-bubble" {...CARD_SWAP}>
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

const MessagePreview = ({
  other,
  message,
}: {
  other: string;
  message: string;
}) => (
  <p className="deal-card-sends">
    Message to {other}: <q>{message}</q>
  </p>
);

function StepActions({
  label,
  danger,
  back,
  disabled,
  busy,
  onSend,
  onBack,
}: {
  label: string;
  danger?: boolean;
  back: string;
  disabled: boolean;
  busy: boolean;
  onSend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="deal-card-actions">
      <Button
        type="button"
        className={`button ${danger ? "danger" : "primary"} small`}
        disabled={busy || disabled}
        onClick={onSend}
      >
        {busy ? "Sending…" : label}
      </Button>
      <Button
        type="button"
        className="button quiet"
        disabled={busy}
        onClick={onBack}
      >
        {back}
      </Button>
    </div>
  );
}

function LateStep({
  other,
  busy,
  locked,
  onSend,
  onBack,
}: {
  other: string;
  busy: boolean;
  locked: boolean;
  onSend: (send: PickupSend) => void;
  onBack: () => void;
}) {
  const [minutes, setMinutes] = useState<LateMinutes>(10);
  const send = lateSend(minutes);
  return (
    <motion.div className="deal-card-confirm" {...CARD_SWAP}>
      <p className="deal-card-question">About how late?</p>
      <div className="offer-chips" role="group" aria-label="Minutes late">
        {LATE_MINUTES.map((option) => (
          <TapChip
            key={option}
            selected={option === minutes}
            onSelect={() => setMinutes(option)}
          >
            {option} min
          </TapChip>
        ))}
      </div>
      <MessagePreview other={other} message={send.message} />
      <StepActions
        label={`Tell ${other}`}
        back="Not now"
        disabled={locked}
        busy={busy}
        onSend={() => onSend(send)}
        onBack={onBack}
      />
    </motion.div>
  );
}

function ChangeStep({
  day,
  listing,
  other,
  now,
  busy,
  locked,
  onSend,
  onBack,
}: {
  day: PickupDay;
  listing: Listing;
  other: string;
  now: Date;
  busy: boolean;
  locked: boolean;
  onSend: (send: PickupSend) => void;
  onBack: () => void;
}) {
  const booked = day.terms.pickupAt!;
  const slots = useMemo(
    () =>
      pickupSlots(listing.available, now, listing.pickupBy).filter(
        (slot) => Date.parse(slot.pickupAt) !== Date.parse(booked),
      ),
    [listing.available, listing.pickupBy, now, booked],
  );
  const [slot, setSlot] = useState<Slot | null>(null);
  const send = slot && changeSend(movedTerms(day.terms, slot.pickupAt));
  return (
    <motion.div className="deal-card-confirm" {...CARD_SWAP}>
      <p className="deal-card-question">Which time works for you?</p>
      <TimePanel slots={slots} slot={slot} now={now} onSlot={setSlot} />
      {send && slot ? (
        <>
          <TimeCompare
            current={booked}
            proposed={slot.pickupAt}
            proposedBy="You suggest"
          />
          <MessagePreview other={other} message={send.message} />
        </>
      ) : (
        <small className="pickup-reason">
          Choose a time to see the message.
        </small>
      )}
      <StepActions
        label="Suggest this time"
        back="Not now"
        disabled={locked || !send}
        busy={busy}
        onSend={() => send && onSend(send)}
        onBack={onBack}
      />
    </motion.div>
  );
}

function CheckStep({
  choice,
  other,
  busy,
  locked,
  onSend,
  onBack,
}: {
  choice: PickupChoice & { send: PickupSend };
  other: string;
  busy: boolean;
  locked: boolean;
  onSend: (send: PickupSend) => void;
  onBack: () => void;
}) {
  return (
    <motion.div className="deal-card-confirm" {...CARD_SWAP}>
      {choice.confirm && <p className="deal-card-question">{choice.confirm}</p>}
      <MessagePreview other={other} message={choice.send.message} />
      <StepActions
        label={choice.confirmLabel ?? `Send to ${other}`}
        danger={Boolean(choice.confirm)}
        back={choice.id === "cant_make_it" ? "Keep pickup" : "Not now"}
        disabled={locked}
        busy={busy}
        onSend={() => onSend(choice.send)}
        onBack={onBack}
      />
    </motion.div>
  );
}

type CheckAnswer = PickupChoice & { send: PickupSend; effect?: string };

/**
 * Pako's question a day after the pickup: each answer shows the exact message
 * and what it does to the deal, and sends on its own tap.
 */
function CheckAnswers({
  answers,
  other,
  locked,
  busy,
  onSend,
}: {
  answers: CheckAnswer[];
  other: string;
  locked: boolean;
  busy: boolean;
  onSend: (send: PickupSend) => void;
}) {
  const [tapped, setTapped] = useState<CheckAnswer["id"]>();
  return (
    <motion.div className="pickup-answers" {...CARD_SWAP}>
      {answers.map((answer, index) => (
        <div
          key={answer.id}
          className="pickup-answer"
          data-primary={index === 0 || undefined}
        >
          <Button
            type="button"
            animateIcon={index === 0}
            className={index === 0 ? "button primary" : "button secondary"}
            disabled={locked}
            onClick={() => {
              setTapped(answer.id);
              onSend(answer.send);
            }}
          >
            {busy && tapped === answer.id ? "Sending…" : answer.label}
          </Button>
          <p className="deal-card-sends">
            Message to {other}: <q>{answer.send.message}</q>
            {answer.effect && (
              <span className="pickup-answer-effect">{answer.effect}</span>
            )}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

const checkAnswers = ({ primary, secondary }: PickupChoices): CheckAnswer[] =>
  [primary, ...secondary].map((choice) => {
    if (!choice?.send)
      throw new Error("A pickup follow-up answer has nothing to send.");
    return { ...choice, send: choice.send };
  });

/** A choice that can't be tapped now keeps its reason right beside it. */
function ChoiceButton({
  choice,
  primary,
  locked,
  busy,
  onChoose,
}: {
  choice: PickupChoice;
  primary?: boolean;
  locked: boolean;
  busy: boolean;
  onChoose: (choice: PickupChoice) => void;
}) {
  return (
    <span className="pickup-choice" data-primary={primary || undefined}>
      <Button
        type="button"
        animateIcon={primary}
        className={primary ? "button primary" : "button quiet"}
        disabled={locked || Boolean(choice.unavailable)}
        onClick={() => onChoose(choice)}
      >
        {busy && primary ? "Sending…" : choice.label}
      </Button>
      {choice.unavailable && (
        <small className="pickup-reason">{choice.unavailable}</small>
      )}
    </span>
  );
}

/**
 * The booked deal on pickup day: what, when and where at a glance, a calm
 * countdown, the other student's news, Pako's line and the actions the
 * pickup allows now. The main action shows its message under it and sends on
 * its tap; every other one opens its message first. Nothing goes out without
 * the student's own tap.
 */
export default function PickupCard({
  day,
  deal,
  role,
  otherName,
  listing,
  busy,
  error,
  now,
  pickup,
}: {
  day: PickupDay;
  deal: Deal;
  role: DealRole;
  otherName: string;
  listing: Listing;
  busy: boolean;
  error: string;
  now: Date;
  pickup: PickupLink;
}) {
  const [step, setStep] = useState<Step>();
  const actions = useRef<HTMLDivElement>(null);
  // An opened step can sit below a tall card on a phone: it comes into view.
  useEffect(() => {
    if (step)
      actions.current?.scrollIntoView({
        block: "nearest",
        behavior: motionBehavior(),
      });
  }, [step]);
  const context = { day, deal, role, other: otherName, title: listing.title };
  const choices = pickupChoices(context);
  const { primary, secondary } = choices;
  const check = day.pickupCheck;
  const locked = busy || !pickup.available;
  const send = async (chosen: PickupSend) => {
    if (await pickup.onSend(chosen)) setStep(undefined);
  };
  const choose = (choice: PickupChoice) => {
    if (choice.id === "late") setStep({ kind: "late" });
    else if (choice.id === "change_time") setStep({ kind: "change" });
    else if (!choice.send)
      throw new Error(`Pickup choice ${choice.id} has nothing to send.`);
    else if (choice === primary && !choice.confirm) void send(choice.send);
    else setStep({ kind: "check", choice: { ...choice, send: choice.send } });
  };
  const back = () => setStep(undefined);
  const proposed = deal.proposal?.terms.pickupAt;
  const stepProps = {
    other: otherName,
    busy,
    locked,
    onSend: send,
    onBack: back,
  };
  return (
    <div className="deal-card-body pickup-card" data-phase={day.phase}>
      {check ? <CheckHead day={day} check={check} /> : <Countdown day={day} />}
      <Facts terms={day.terms} listing={listing} />
      {!check && <Signals deal={deal} role={role} other={otherName} />}
      {day.change && proposed && (
        <TimeCompare
          current={day.terms.pickupAt!}
          proposed={proposed}
          proposedBy={
            day.change === "sent" ? "You suggest" : `${otherName} suggests`
          }
        />
      )}
      <PakoLine {...pickupGuide(context)} />
      <div ref={actions} className="pickup-steps">
        <AnimatePresence mode="wait" initial={false}>
          {check ? (
            !check.expired && (
              <CheckAnswers
                key="answers"
                answers={checkAnswers(choices)}
                other={otherName}
                locked={locked}
                busy={busy}
                onSend={(chosen) => void send(chosen)}
              />
            )
          ) : step?.kind === "late" ? (
            <LateStep key="late" {...stepProps} />
          ) : step?.kind === "change" ? (
            <ChangeStep
              key="change"
              day={day}
              listing={listing}
              now={now}
              {...stepProps}
            />
          ) : step?.kind === "check" ? (
            <CheckStep
              key={`check-${step.choice.id}`}
              choice={step.choice}
              {...stepProps}
            />
          ) : (
            <motion.div
              key="choices"
              className="deal-card-choices"
              {...CARD_SWAP}
            >
              {primary && (
                <ChoiceButton
                  choice={primary}
                  primary
                  locked={locked}
                  busy={busy}
                  onChoose={choose}
                />
              )}
              {primary?.send && !primary.unavailable && !primary.confirm && (
                <MessagePreview
                  other={otherName}
                  message={primary.send.message}
                />
              )}
              {secondary.length > 0 && (
                <div className="pickup-actions">
                  {secondary.map((choice) => (
                    <ChoiceButton
                      key={choice.id}
                      choice={choice}
                      locked={locked}
                      busy={busy}
                      onChoose={choose}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!pickup.available && pickup.error && (
        <p className="chat-error" role="alert">
          {pickup.error}
        </p>
      )}
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
