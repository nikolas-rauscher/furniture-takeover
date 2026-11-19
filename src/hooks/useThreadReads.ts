import { useCallback } from "react";
import { nextReadMarker } from "../inboxActivity";
import { useSaved } from "./useSaved";

const isReadMarkers = (value: unknown): value is Record<string, string> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (at) => typeof at === "string" && Number.isFinite(Date.parse(at)),
  );

export type ThreadReads = ReturnType<typeof useThreadReads>;

/** How far the student has read each local thread, kept in this browser. */
export function useThreadReads() {
  const [reads, setReads] = useSaved<Record<string, string>>(
    "takeover-thread-reads",
    {},
    isReadMarkers,
  );
  const markRead = useCallback(
    (readKey: string, seenUpTo: string) =>
      setReads((current) => {
        const next = nextReadMarker(current[readKey], seenUpTo);
        return next ? { ...current, [readKey]: next } : current;
      }),
    [setReads],
  );
  return { reads, markRead };
}
