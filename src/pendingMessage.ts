import { randomUuid } from "./randomUuid.ts";

/** Reuse an ID only while the outcome of a delivery is still unknown. */
export class PendingMessage {
  private pending?: { key: string; id: string };

  idFor(listingId: string, sender: string, text: string): string {
    const key = JSON.stringify([listingId, sender, text]);
    if (this.pending?.key !== key) this.pending = { key, id: randomUuid() };
    return this.pending.id;
  }

  acknowledge(id: string): void {
    if (this.pending?.id === id) this.pending = undefined;
  }
}
