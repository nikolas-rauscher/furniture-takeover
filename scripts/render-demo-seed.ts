import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { demoListings } from "../shared/demoListings.ts";
import { adminMeetingPoints } from "../shared/admin.ts";
import { demoSellers } from "../shared/demoSellers.ts";

const listingNamespace = "a242d50ba8735a99a3395dd97af0c19d";

/** A version-5 UUID, so each demo listing keeps the same id every time the seed is rendered. */
function listingUuid(demoId: string): string {
  const bytes = createHash("sha1")
    .update(Buffer.from(listingNamespace, "hex"))
    .update(demoId)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

const sellerEmail = (name: string) =>
  `takeover-demo-v2-${name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}@example.invalid`;

export const catalogStart = "-- BEGIN SHIPPED CATALOG";
export const catalogEnd = "-- END SHIPPED CATALOG";
export const migrationUrl = new URL(
  "../supabase/migrations/202611190004_admin.sql",
  import.meta.url,
);

export function renderDemoCatalog(): string {
  const sellers = demoSellers.map(({ id, name }) => ({
    id,
    name,
    email: sellerEmail(name),
  }));
  const listings = demoListings.map((listing) => {
    const seller = demoSellers.find(({ name }) => name === listing.seller);
    if (!seller) throw new Error(`No demo seller named ${listing.seller}.`);
    return {
      id: listingUuid(listing.id),
      sellerId: seller.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      location: listing.location,
      meetingPoint: listing.pickupPoint?.name ?? "",
      condition: listing.condition,
      dimensions: listing.dimensions,
      pickup: listing.available,
      pickupBy: listing.pickupBy,
      image: listing.image,
      status: listing.status,
    };
  });
  const json = (value: object) =>
    "'" + JSON.stringify(value).replaceAll("'", "''") + "'";
  const rows = (items: object[]) =>
    "jsonb_build_array(\n" +
    items.map((item) => " " + json(item) + "::jsonb").join(",\n") +
    "\n)";
  return `${catalogStart}
insert into takeover_admin.catalog(sellers,listings,meeting_points) values(
${rows(sellers)},
${rows(listings)},
 array(select jsonb_array_elements_text(${json(adminMeetingPoints)}::jsonb))
);
${catalogEnd}`;
}

export function renderDemoSeed(): string {
  return `-- OPTIONAL SANDBOX DEMO SEED. Run in the SQL Editor after the admin migration.
-- The shipped catalog is stored by the migration. This seed preserves existing edits.
begin;
select takeover_admin.seed_demo_catalog(false);
commit;
`;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  if (process.argv[2] === "--refresh-migration") {
    const sql = readFileSync(migrationUrl, "utf8");
    const start = sql.indexOf(catalogStart);
    const end = sql.indexOf(catalogEnd);
    if (start < 0 || end < start)
      throw new Error("The shipped catalog markers are missing.");
    writeFileSync(
      migrationUrl,
      sql.slice(0, start) +
        renderDemoCatalog() +
        sql.slice(end + catalogEnd.length),
    );
  } else {
    process.stdout.write(renderDemoSeed());
  }
}
