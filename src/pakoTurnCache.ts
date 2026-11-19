import { threadTurnSchema, type ThreadTurn } from "../shared/threadTurn.ts";
import { accountStorageKey } from "./cloud/session.ts";

/** Where Pako keeps his latest reading of a thread, so a reload never reads it again. */
export type PakoTurnCache = {
  /** The latest reading, or null when there is none. Throws when it cannot be read back. */
  load(): Promise<ThreadTurn | null>;
  save(turn: ThreadTurn): Promise<void>;
};

const TURNS_KEY = "takeover-pako-turns";
/** Readings of older threads make way, so this browser's storage stays small. */
const MAX_STORED_TURNS = 100;
const UNREADABLE =
  "Pako's last reading of this conversation could not be opened.";

function storedTurns(): Record<string, unknown> {
  const raw = localStorage.getItem(accountStorageKey(TURNS_KEY));
  if (raw === null) return {};
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(UNREADABLE);
  return value as Record<string, unknown>;
}

/** The local demo keeps one reading per thread and role in this browser. */
export function demoTurnCache(key: string): PakoTurnCache {
  return {
    async load() {
      const stored = storedTurns()[key];
      if (stored === undefined) return null;
      const parsed = threadTurnSchema.safeParse(stored);
      if (!parsed.success) throw new Error(UNREADABLE);
      return parsed.data;
    },
    async save(turn) {
      const kept = Object.entries(storedTurns())
        .filter(([stored]) => stored !== key)
        .slice(-(MAX_STORED_TURNS - 1));
      localStorage.setItem(
        accountStorageKey(TURNS_KEY),
        JSON.stringify(Object.fromEntries([...kept, [key, turn]])),
      );
    },
  };
}
