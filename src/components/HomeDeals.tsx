import { motion } from "motion/react";
import { ArrowRight } from "@/components/icons";
import type { StripView } from "../dealWords";
import { DealTile } from "./DealTerms";
import { Button } from "./ui/button";
import "./deal-card.css";

/** Deals rise in one after another, like Pako's answers. */
const RISE = { type: "spring", stiffness: 420, damping: 32 } as const;
const STAGGER_S = 0.05;

export type HomeDeal = {
  /** The deal's conversation. */
  id: string;
  title: string;
  image?: string;
  view: StripView;
  onOpen: () => void;
  /** The student's offer has waited a day: its thread opens with a follow-up drafted. */
  onFollowUp?: () => void;
};

/**
 * The student's live deals on home, at most three: what waits for them
 * first, then booked pickups, then their own offers. Each opens its thread,
 * an offer that waited a day with a follow-up ready to send.
 */
export default function HomeDeals({
  deals,
  onSeeAll,
}: {
  deals: HomeDeal[];
  onSeeAll: () => void;
}) {
  if (!deals.length) return null;
  return (
    <section className="home-deals" aria-labelledby="home-deals-heading">
      <div className="section-heading">
        <h2 id="home-deals-heading">Your deals</h2>
        <Button animateIcon className="button quiet" onClick={onSeeAll}>
          See all in Messages
          <ArrowRight size={16} />
        </Button>
      </div>
      <ul className="home-deals-list">
        {deals.map((deal, order) => (
          <motion.li
            key={deal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...RISE, delay: order * STAGGER_S }}
          >
            <article
              className="deal-bar home-deal"
              data-tone={deal.view.tone}
              aria-label={deal.title}
            >
              <DealTile image={deal.image} />
              <div className="deal-bar-copy">
                <strong>{deal.title}</strong>
                <span>
                  {[deal.view.lead, deal.view.detail, deal.view.status]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {deal.onFollowUp ? (
                <Button
                  className="button secondary small"
                  aria-label={`Draft a follow-up about ${deal.title}`}
                  onClick={deal.onFollowUp}
                >
                  Follow up
                </Button>
              ) : (
                <Button
                  className={`button small ${deal.view.tone === "needs" ? "primary" : "secondary"}`}
                  aria-label={`Open the conversation about ${deal.title}`}
                  onClick={deal.onOpen}
                >
                  Open chat
                </Button>
              )}
            </article>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
