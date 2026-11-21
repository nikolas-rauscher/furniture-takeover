const messages: Record<string, string> = {
  deal_changed:
    "The deal just changed. Check the new terms. Your text is kept.",
  deal_closed: "This deal is closed.",
  deal_not_agreed: "Only an agreed deal can be cancelled.",
  listing_unavailable: "This listing is no longer available.",
  terms_not_stated: "Your message needs to mention the terms you are sending.",
  terms_incomplete: "Choose a price and handover details before confirming.",
  pickup_time_past: "Choose a pickup time in the future.",
  message_conflict: "This message was already used. Check the conversation.",
  terms_invalid: "Check the offer details.",
  message_invalid: "Enter a message of up to 4,000 characters.",
  conversation_unavailable: "This conversation is unavailable.",
  sign_in_required: "Sign in to update the deal.",
  reason_invalid: "Choose a reason for cancelling.",
  action_invalid: "Choose an available deal action.",
  shipping_unavailable: "Only the seller can complete an agreed shipping deal.",
  pickup_check_not_due:
    "The pickup follow-up opens one day after the booked time.",
  pickup_unavailable: "This conversation has no booked pickup.",
  pickup_terms_changed:
    "Choose a new time and keep the price and meeting point.",
  too_early: "This action is not available yet. Check the pickup time.",
  pickup_window_ended: "The window for pickup updates has passed.",
  pickup_collected:
    "The buyer already picked it up. Only the seller can mark it sold now.",
  minutes_invalid: "Choose 10, 20 or 30 minutes.",
  next_buyer_unavailable: "Choose another interested buyer for this item.",
};
export const dealErrorMessage = (key: string) => messages[key] ?? key;
