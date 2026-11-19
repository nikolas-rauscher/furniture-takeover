import { accountStorageKey, getCloudClient } from "../cloud/session.ts";
import { useEffect, useRef, useState } from "react";
import {
  newNegotiation,
  type Negotiation,
  type NegotiationUpdate,
} from "../../shared/negotiation";
import {
  applyNegotiationUpdate,
  createNegotiationRepository,
  reconcileDeliveredDrafts,
} from "../negotiationRepository";
import { listMessages } from "../api/messages";
import { randomUuid } from "../randomUuid";

export function useNegotiations() {
  const key = accountStorageKey("takeover-negotiations");
  const [repository] = useState(() =>
    createNegotiationRepository(
      {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      },
      key,
    ),
  );
  const [items, setItems] = useState<Negotiation[]>([]);
  const [error, setError] = useState("");
  const activeId = useRef<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  function activate(id: string | null) {
    activeId.current = id;
    setActive(id);
  }
  function refresh() {
    try {
      setItems(repository.list());
      setError("");
    } catch {
      setError(
        "I couldn't open your saved offer drafts. Reload to try again.",
      );
    }
  }
  useEffect(() => {
    refresh();
    const changed = (event: StorageEvent) => {
      if (event.key === key) refresh();
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [repository, key]);
  useEffect(() => {
    const migrationKey = `${key}-sent-migration-v1`;
    let cancelled = false;
    async function reconcileLegacyDrafts() {
      try {
        if (getCloudClient() || localStorage.getItem(migrationKey)) return;
        const snapshot = repository.list();
        if (snapshot.some((item) => item.status === "draft" && item.draft)) {
          const conversations = await listMessages();
          if (cancelled) return;
          reconcileDeliveredDrafts(repository, snapshot, conversations);
          refresh();
        }
        localStorage.setItem(migrationKey, "complete");
      } catch {
        if (!cancelled)
          setError("I couldn't verify which saved drafts were already sent. Reload to try again.");
      }
    }
    void reconcileLegacyDrafts();
    return () => {
      cancelled = true;
    };
  }, [repository, key]);
  function current() {
    return repository
      .list()
      .find((item) => item.id === activeId.current && item.status === "draft");
  }
  function commit(event: NegotiationUpdate) {
    try {
      applyNegotiationUpdate(repository, event);
      refresh();
      activate(
        event.negotiation.status === "draft" ? event.negotiation.id : null,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "I couldn't save your offer draft. Try again.";
      setError(message);
      throw new Error(message);
    }
  }
  function open(listingId: string) {
    try {
      const previous = repository
        .list()
        .reverse()
        .find(
          (item) => item.listingId === listingId && item.status === "draft",
        );
      const value = previous ?? newNegotiation(randomUuid(), listingId);
      if (!previous)
        commit({
          type: "negotiation_update",
          previousVersion: 0,
          negotiation: value,
        });
      activate(value.id);
      return value;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "I couldn't open your offer draft. Try again.",
      );
      return undefined;
    }
  }
  return {
    items,
    current,
    commit,
    open,
    activate,
    error,
    active: items.find((item) => item.id === active && item.status === "draft"),
  };
}
