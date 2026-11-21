import { accountStorageKey } from "./cloud/session.ts";
import type { AgentRunState } from "./hooks/useAgentRun.ts";
import { restoreSavedValue } from "./hooks/savedState.ts";
import { isSnapshot, type SearchSnapshot } from "./searchRequest.ts";

/** The finished Pako search on screen in this tab: a reload brings it back, a new visit starts fresh. */
export type LastSearch = { search: SearchSnapshot; run: AgentRunState };

const NAME = "takeover-last-search";

function isLastSearch(value: unknown): value is LastSearch {
  if (typeof value !== "object" || value === null) return false;
  const { search, run } = value as LastSearch;
  return (
    isSnapshot(search) &&
    typeof run === "object" &&
    run !== null &&
    run.status === "complete" &&
    typeof run.id === "string" &&
    typeof run.request === "string" &&
    typeof run.text === "string" &&
    Array.isArray(run.history) &&
    Array.isArray(run.sources) &&
    Array.isArray(run.questions) &&
    Array.isArray(run.actions) &&
    Array.isArray(run.steps)
  );
}

/** Where the browser blocks storage the search lasts for the page load: the page works without it. */
export function readLastSearch(): LastSearch | null {
  try {
    const stored = sessionStorage.getItem(accountStorageKey(NAME));
    return restoreSavedValue<LastSearch | null>(stored, null, isLastSearch)
      .value;
  } catch {
    return null;
  }
}

export function keepLastSearch(last: LastSearch | null) {
  const key = accountStorageKey(NAME);
  try {
    if (last) sessionStorage.setItem(key, JSON.stringify(last));
    else sessionStorage.removeItem(key);
  } catch {
    window.dispatchEvent(new CustomEvent("storage-failure"));
  }
}
