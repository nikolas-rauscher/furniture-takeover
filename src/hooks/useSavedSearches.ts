import { useState } from "react";
import { criteriaTitle, type Product } from "../../shared/marketplace";
import { useWatches } from "../alerts/useWatches";
import type { WatchTarget } from "../alerts/watch";
import { randomUuid } from "../randomUuid";
import {
  isSavedSearches,
  preferenceSearch,
  restoreSearch,
  sameCriteria,
  type SavedSearch,
} from "../searchRequest";
import type { SearchSession } from "./useSearchSession";
import { useSaved } from "./useSaved";
import type { Toasts } from "./useToast";

export type SavedSearches = ReturnType<typeof useSavedSearches>;

/** Searches kept in this browser, their new matches, and saving or editing one. */
export function useSavedSearches({
  search,
  location,
  listings,
  ready,
  toast,
  onSearchesPage,
  openSearches,
  closeDialog,
}: {
  search: SearchSession;
  location: string;
  /** Listings a saved search can match. */
  listings: Product[];
  ready: boolean;
  toast: Toasts;
  /** Saved searches are on screen already, so a note needs no way there. */
  onSearchesPage: boolean;
  openSearches: () => void;
  closeDialog: () => void;
}) {
  const [jobs, setJobs] = useSaved<SavedSearch[]>("takeover-jobs", [], isSavedSearches);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const saved = jobs.filter((job) => job.id !== "seed-search");
  const watches = useWatches({
    jobs,
    setJobs,
    watched: saved,
    listings,
    ready,
    location,
  });

  /** Puts a deleted saved search back where it was. */
  function restore(job: SavedSearch, index: number) {
    setJobs((current) => {
      if (current.some((item) => item.id === job.id)) return current;
      const at = Math.max(0, Math.min(index, current.length));
      return [...current.slice(0, at), job, ...current.slice(at)];
    });
    toast.say("Saved search restored.");
  }
  function remove(job: SavedSearch) {
    const index = jobs.findIndex((item) => item.id === job.id);
    setJobs((current) => current.filter((item) => item.id !== job.id));
    toast.show({
      message: "Saved search deleted.",
      action: {
        label: "Undo",
        description: "Undo saved search deletion",
        onClick: () => restore(job, index),
      },
    });
  }
  function save() {
    const existing = editingId
      ? jobs.find((job) => job.id === editingId)
      : undefined;
    const original = existing
      ? restoreSearch(existing, location)
      : search.committedSearch;
    if (!original) return;
    const next =
      existing && !sameCriteria(search.filterDraft, existing.criteria)
        ? preferenceSearch(search.normalizedFilterDraft, original.location, original)
        : original;
    const name = title.trim() || criteriaTitle(next.criteria);
    setJobs((current) =>
      existing
        ? current.map((job) =>
            job.id === existing.id
              ? {
                  ...job,
                  title: name,
                  criteria: next.criteria,
                  location: next.location,
                  request: next.text,
                  search: next,
                }
              : job,
          )
        : [
            ...current,
            {
              id: randomUuid(),
              title: name,
              criteria: next.criteria,
              location: next.location,
              request: next.text,
              search: next,
              paused: false,
              seen: true,
            },
          ],
    );
    setEditingId(null);
    closeDialog();
    toast.say("Search saved in this browser.");
  }
  /** Saves a search for an item, or says it is saved already. */
  function keepWatch({ query, maxPrice, radius }: WatchTarget) {
    if (!watches.watch({ query, maxPrice, radius })) {
      toast.show({
        message: `“${query}” is already a saved search.`,
        mood: "search",
      });
      return;
    }
    toast.show({
      message: "Search saved. New matches show up in Searches.",
      mood: "search",
      action: onSearchesPage
        ? undefined
        : {
            label: "View",
            description: "View your saved searches",
            onClick: openSearches,
          },
    });
  }

  return {
    saved,
    watches,
    title,
    setTitle,
    editing: editingId !== null,
    remove,
    save,
    keepWatch,
    /** The search on screen is about to be saved under its request as name. */
    startSaving() {
      setEditingId(null);
      setTitle((search.committedSearch?.originalRequest || "").slice(0, 90));
    },
    startEditing(job: SavedSearch) {
      setEditingId(job.id);
      setTitle(job.title);
      search.setFilterDraft(job.criteria);
    },
    stopEditing: () => setEditingId(null),
    clear() {
      setJobs([]);
      watches.clear();
    },
  };
}
