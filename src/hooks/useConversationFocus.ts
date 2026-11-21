import { useEffect, useRef } from "react";

const hidden = (element: Element | null) =>
  !(element instanceof HTMLElement) || !element.checkVisibility();

/**
 * On a phone the list and the open conversation take turns on screen. When the
 * one that had focus goes away, focus follows: into the conversation that
 * opened, and back to its row in the list when it closes.
 */
export function useConversationFocus(conversationOpen: boolean) {
  const list = useRef<HTMLElement>(null);
  const conversation = useRef<HTMLElement>(null);
  const openedFrom = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const focused = document.activeElement;
    if (conversationOpen) {
      if (list.current?.contains(focused))
        openedFrom.current = focused as HTMLElement;
      if (hidden(focused)) conversation.current?.focus({ preventScroll: true });
      return;
    }
    if (!hidden(focused)) return;
    const row = openedFrom.current?.isConnected
      ? openedFrom.current
      : list.current?.querySelector<HTMLElement>("button");
    row?.focus({ preventScroll: true });
  }, [conversationOpen]);
  return { list, conversation };
}
