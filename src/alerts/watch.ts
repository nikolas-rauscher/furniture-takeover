import { criteriaTitle, defaults } from "../../shared/marketplace.ts";
import {
  preferenceSearch,
  sameCriteria,
  type SavedSearch,
  type SearchSnapshot,
} from "../searchRequest.ts";
import { NO_BUDGET } from "./matching.ts";

export function watchSearch(
  query: string,
  location: string,
  maxPrice?: number,
): SearchSnapshot | undefined {
  const text = query.trim().slice(0, 120);
  if (!text) return;
  const price =
    maxPrice === undefined || !Number.isFinite(maxPrice)
      ? NO_BUDGET
      : Math.min(Math.max(maxPrice, 0), NO_BUDGET);
  return preferenceSearch(
    { ...defaults, query: text, maxPrice: price },
    location,
  );
}

const normalize = (text: string) => text.trim().toLowerCase();

export function findWatch(jobs: SavedSearch[], search: SearchSnapshot) {
  const criteria = {
    ...search.criteria,
    query: normalize(search.criteria.query),
  };
  const location = normalize(search.location);
  let paused: SavedSearch | undefined;
  for (const job of jobs) {
    if (
      job.id === "seed-search" ||
      normalize(job.search?.location || job.location || search.location) !==
        location ||
      !sameCriteria(criteria, {
        ...job.criteria,
        query: normalize(job.criteria.query),
      })
    )
      continue;
    if (!job.paused) return job;
    paused ??= job;
  }
  return paused;
}

/** Resume in place to preserve the existing search and its alert history. */
export function activateWatch(
  jobs: SavedSearch[],
  search: SearchSnapshot,
  newId: string,
): SavedSearch[] {
  const existing = findWatch(jobs, search);
  if (existing) {
    if (!existing.paused) return jobs;
    return jobs.map((job) =>
      job === existing ? { ...job, paused: false } : job,
    );
  }
  return [
    ...jobs,
    {
      id: newId,
      title: criteriaTitle(search.criteria),
      criteria: search.criteria,
      location: search.location,
      request: search.text,
      search,
      paused: false,
      seen: true,
    },
  ];
}
