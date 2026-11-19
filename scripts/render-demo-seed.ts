import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { demoListings } from "../shared/demoListings.ts";
import { demoSellers } from "../shared/demoSellers.ts";

const seedMarker = "takeover-demo-v2";
const retiredSeedMarker = "takeover-ebay-v1";
const listingNamespace = "a242d50ba8735a99a3395dd97af0c19d";

const quote = (value: string | number) =>
  "'" + String(value).replaceAll("'", "''") + "'";

const row = (values: (string | number)[]) => `(${values.map(quote).join(",")})`;

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

function sellerRows(): string {
  return demoSellers
    .map(({ id, name }) => row([id, sellerEmail(name), name]))
    .join(",\n");
}

function listingRows(): string {
  return demoListings
    .map((listing) => {
      const seller = demoSellers.find(({ name }) => name === listing.seller);
      if (!seller) throw new Error(`No demo seller named ${listing.seller}.`);
      return row([
        listingUuid(listing.id),
        seller.id,
        listing.title,
        listing.description,
        listing.price,
        listing.location,
        listing.condition,
        listing.dimensions,
        listing.available,
        listing.pickupBy,
        listing.image,
        listing.status,
      ]);
    })
    .join(",\n");
}

/** The optional sandbox seed: the same sellers and listings as the local demo, with pictures served by the app. */
export function renderDemoSeed(): string {
  return `-- OPTIONAL SANDBOX DEMO SEED. Review before executing in the SQL Editor.
-- Generated from shared/demoListings.ts and shared/demoSellers.ts. Regenerate with:
--   node --experimental-strip-types scripts/render-demo-seed.ts > supabase/seed-demo.sql
-- This is not an application migration and must not run automatically.
-- The sellers are inert: no passwords, confirmed emails, identities or sign-in. Their listings
-- carry the tag Demo and point at the pictures in public/samples, which the app serves itself.
begin;
create temporary table demo_seed_owners(id uuid primary key,email text,name text) on commit drop;
insert into demo_seed_owners values
${sellerRows()};
create temporary table demo_seed_listings(id uuid primary key,owner_id uuid,title text,description text,price numeric,location text,condition text,dimensions text,pickup text,pickup_by text,image text,status text) on commit drop;
insert into demo_seed_listings values
${listingRows()};
do $$
begin
 if exists(select 1 from auth.users u join demo_seed_owners d on u.id=d.id
  where u.email is distinct from d.email or u.raw_app_meta_data->>'demo_seed' is distinct from ${quote(seedMarker)}
    or u.encrypted_password is not null or u.email_confirmed_at is not null
    or u.banned_until is distinct from 'infinity'::timestamptz) then
  raise exception 'Reserved demo owner ID belongs to a different or login-capable account';
 end if;
 if exists(select 1 from auth.users u join demo_seed_owners d on lower(u.email)=d.email where u.id<>d.id) then
  raise exception 'Reserved demo email already belongs to another account';
 end if;
 if exists(select 1 from public.listings l join demo_seed_listings d on l.id=d.id
  where l.owner_id<>d.owner_id or not (l.tags @> array['Demo'])) then
  raise exception 'Reserved demo listing ID contains non-demo data';
 end if;
end $$;
-- Retire the first demo set (three sellers, six listings) unless someone has already written to it.
delete from public.listings l using auth.users u
 where l.owner_id=u.id and u.raw_app_meta_data->>'demo_seed'=${quote(retiredSeedMarker)}
   and not exists(select 1 from public.conversations c where c.listing_id=l.id);
delete from auth.users u
 where u.raw_app_meta_data->>'demo_seed'=${quote(retiredSeedMarker)}
   and not exists(select 1 from public.listings l where l.owner_id=u.id);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated',email,null,null,'infinity'::timestamptz,
 jsonb_build_object('demo_seed',${quote(seedMarker)},'synthetic',true),jsonb_build_object('display_name',name),now(),now()
from demo_seed_owners on conflict(id) do nothing;
insert into public.profiles(id,display_name) select id,name from demo_seed_owners on conflict(id) do nothing;
-- The photo check only accepts a seller's own uploads; the bundled illustrations are not uploads.
alter table public.listings disable trigger validate_listing_photos;
insert into public.listings(id,owner_id,title,description,price,location,condition,dimensions,pickup,pickup_by,images,status,tags)
select id,owner_id,title,description,price,location,condition,dimensions,pickup,nullif(pickup_by,'')::date,array[image],status,array['Demo']
from demo_seed_listings on conflict(id) do nothing;
alter table public.listings enable trigger validate_listing_photos;
-- Readback before commit: the inert sellers and their listings.
select d.name,u.email,u.encrypted_password is null as no_password,u.email_confirmed_at is null as unconfirmed,u.banned_until from demo_seed_owners d join auth.users u using(id) order by d.name;
select l.id,l.title,l.price,l.status,p.display_name from public.listings l join demo_seed_listings d using(id) join public.profiles p on p.id=l.owner_id order by l.title;
commit;
`;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  process.stdout.write(renderDemoSeed());
}
