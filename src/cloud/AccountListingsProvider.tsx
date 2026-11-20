import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminCatalogChanged } from "../api/admin";
import type { Product } from "../../shared/marketplace";
import { ListingsContext } from "../hooks/useMarketplaceListings";
import { createAccountListings } from "./accountListings";

function useAccountListings(client: SupabaseClient, userId?: string) {
  const api = useMemo(
    () => createAccountListings(client, userId),
    [client, userId],
  );
  const [listings, setListingsState] = useState<Product[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(0);
  const current = useRef(listings),
    mounted = useRef(true),
    generation = useRef(0),
    writing = useRef(false);
  const load = useCallback(async () => {
    if (writing.current) return false;
    const token = ++generation.current;
    try {
      const values = await api.read();
      if (mounted.current && generation.current === token) {
        if (JSON.stringify(current.current) !== JSON.stringify(values)) {
          current.current = values;
          setListingsState(values);
        }
        setReady(true);
        setError("");
      }
      return true;
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Could not load listings.",
        );
      return false;
    }
  }, [api]);
  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener(adminCatalogChanged, refresh);
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(adminCatalogChanged, refresh);
    };
  }, [load]);
  async function save(update: SetStateAction<Product[]>) {
    if (!userId) {
      setError("Sign in to save a listing.");
      return false;
    }
    if (writing.current) return false;
    writing.current = true;
    generation.current++;
    setPending(1);
    setError("");
    const previous = current.current;
    const proposed = typeof update === "function" ? update(previous) : update;
    try {
      for (const item of proposed) {
        const old = previous.find((p) => p.id === item.id);
        if (JSON.stringify(item) === JSON.stringify(old)) continue;
        await api.save(item, old);
      }
      const values = await api.read();
      if (mounted.current) {
        current.current = values;
        setListingsState(values);
        setReady(true);
      }
      return true;
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Could not save listing.",
        );
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) setPending(0);
    }
  }
  return {
    listings,
    setListings: save,
    ready,
    error,
    pending,
    retry: load,
    addDemo: async () => false,
    canShow: () => true,
    dealStatusOwner: "server" as const,
    refreshOnDealChange: Boolean(userId),
  };
}

export function AccountListingsProvider({
  client,
  userId,
  children,
}: PropsWithChildren<{ client: SupabaseClient; userId?: string }>) {
  return (
    <ListingsContext value={useAccountListings(client, userId)}>
      {children}
    </ListingsContext>
  );
}
