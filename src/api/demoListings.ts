import { AdminApiError } from "./admin.ts";
import { getMessageWorkspace } from "./messages.ts";
import type { Product } from "../../shared/marketplace.ts";
import { isProducts } from "../hooks/savedState.ts";
import { readDemoCatalog } from "../demoCatalogRead.ts";
import type { ListingsApi } from "./listings.ts";

async function requestListings(
  path: string,
  init?: RequestInit,
): Promise<Product[]> {
  return listingsFrom(await fetch(path, init));
}

async function listingsFrom(response: Response): Promise<Product[]> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (body?.error?.code === "admin_listing_hidden")
      throw new AdminApiError("admin_listing_hidden");
    throw new Error("Couldn't load listings. Try again.");
  }
  const body: unknown = await response.json();
  const listings =
    body && typeof body === "object"
      ? (body as { listings?: unknown }).listings
      : null;
  if (!isProducts(listings) || listings.some((item) => item.demo !== true))
    throw new Error("Couldn't load listings. Try again.");
  return listings;
}

export const postingCheckUnavailable =
  "Couldn't check that you can publish. Try again.";

async function postingPermission() {
  const response = await fetch("/api/listings/permission", {
    headers: { "X-Message-Workspace": getMessageWorkspace() },
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json();
  return { allowed: response.ok && body.allowed === true, error: body.error };
}

async function verifyCanPost() {
  const { allowed, error } = await postingPermission();
  if (allowed) return;
  if (error?.code === "admin_student_blocked")
    throw new AdminApiError("admin_student_blocked");
  throw new Error(postingCheckUnavailable);
}

export const demoListings = {
  read: async (fresh = false) => listingsFrom(await readDemoCatalog(fresh)),
  async save(listing) {
    await requestListings("/api/listings/demo/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: [listing] }),
      signal: AbortSignal.timeout(8000),
    });
  },
  seed: () => requestListings("/api/listings/demo/seed", { method: "POST" }),
  verifyCanPost,
  async verifyEdit() {
    const { allowed, error } = await postingPermission();
    if (!allowed) throw new Error(error?.message ?? postingCheckUnavailable);
  },
} satisfies ListingsApi & { verifyEdit: () => Promise<void> };
