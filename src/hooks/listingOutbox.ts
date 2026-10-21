import type { Product } from "../../shared/marketplace.ts";
import { isProducts } from "./savedState.ts";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/** Journal demo writes before changing the UI; personal listings never enter it. */
export class ListingOutbox {
  private records: Product[] = [];
  private storage: Storage;
  private key: string;
  constructor(storage: Storage, key: string) {
    this.storage = storage;
    this.key = key;
    const raw = storage.getItem(key);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (!isProducts(value) || value.some((item) => !item.demo || !item.own))
        throw new Error("The pending listing changes could not be read.");
      this.records = value;
    }
  }

  pending(): Product[] {
    return structuredClone(this.records);
  }

  private write(records: Product[]) {
    // If durable storage fails, leave the previous journal intact.
    this.storage.setItem(this.key, JSON.stringify(records));
    this.records = structuredClone(records);
  }

  stage(listings: Product[]) {
    const changes = listings.filter((item) => item.demo && item.own);
    if (!changes.length) return;
    const ids = new Set(changes.map((item) => item.id));
    this.write([
      ...this.records.filter((item) => !ids.has(item.id)),
      ...changes,
    ]);
  }

  acknowledge(sent: Product) {
    // An old response must not acknowledge a newer edit to the same listing.
    this.write(
      this.records.filter(
        (item) =>
          item.id !== sent.id || JSON.stringify(item) !== JSON.stringify(sent),
      ),
    );
  }

  merge(server: Product[], local: Product[]): Product[] {
    const pending = new Map(this.records.map((item) => [item.id, item]));
    const ids = new Set(server.map((item) => item.id));
    return [
      ...local.filter((item) => !item.demo),
      ...server.map((item) => pending.get(item.id) ?? item),
      ...this.records.filter((item) => !ids.has(item.id)),
    ];
  }
}
