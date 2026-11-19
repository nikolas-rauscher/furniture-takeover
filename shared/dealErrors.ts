const messages: Record<string, string> = {
  deal_changed:
    "The deal just changed. Check the new terms. Your text is kept.",
  deal_closed: "This deal is closed.",
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
};
export const dealErrorMessage = (key: string) => messages[key] ?? key;
