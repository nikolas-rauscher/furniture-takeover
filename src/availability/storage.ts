import { z } from "zod";
import { emptyAvailability, type AvailabilityState } from "./reservations.ts";

export const AVAILABILITY_STATE_KEY = "takeover-availability";

const id = z.string().min(1).max(120);
const title = z.string().max(180);
const instant = z.iso.datetime();
const status = z.enum(["active", "reserved", "sold", "withdrawn"]);

const availabilitySchema = z
  .object({
    version: z.literal(1),
    clockOffsetMs: z.number().int().min(0).max(1e12),
    reservations: z
      .array(
        z
          .object({
            listingId: id,
            title,
            status: z.enum(["pending", "held"]),
            requestedAt: instant,
            pickupBy: z.iso.date(),
            replyBy: instant,
            holdUntil: instant.optional(),
          })
          .strict(),
      )
      .max(200),
    waitlist: z
      .array(
        z
          .object({
            listingId: id,
            title,
            joinedAt: instant,
            priorityUntil: instant.optional(),
          })
          .strict(),
      )
      .max(200),
    notices: z
      .array(
        z
          .object({
            id: z.string().min(1).max(300),
            kind: z.enum([
              "declined",
              "expired",
              "hold_ended",
              "available_again",
            ]),
            listingId: id,
            title,
            createdAt: instant,
            until: instant.optional(),
          })
          .strict(),
      )
      .max(200),
    originalStatus: z.record(id, status),
    threads: z.array(id).max(200),
  })
  .strict();

export type RestoredAvailability = {
  state: AvailabilityState;
  source: "stored" | "empty" | "invalid";
};

/** Storage is injected so the state machine and tests don't need a browser. */
export function createAvailabilityRepository(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  key = AVAILABILITY_STATE_KEY,
) {
  return {
    load(): RestoredAvailability {
      const raw = storage.getItem(key);
      if (raw === null) return { state: emptyAvailability(), source: "empty" };
      try {
        return {
          state: availabilitySchema.parse(JSON.parse(raw)),
          source: "stored",
        };
      } catch {
        // Leave the stored value untouched until the next deliberate change.
        return { state: emptyAvailability(), source: "invalid" };
      }
    },
    save(state: AvailabilityState) {
      storage.setItem(key, JSON.stringify(state));
    },
    clear() {
      storage.removeItem(key);
    },
  };
}
