import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = [
  "202610300001_supabase.sql",
  "202610300002_accounts.sql",
  "202610300003_listing_details.sql",
  "202610300004_profile_and_api_keys.sql",
  "202611060001_ai_quota.sql",
  "202611190001_thread_reading.sql",
  "202611190002_deals.sql",
];
export const buyer = "11111111-1111-4111-8111-111111111111",
  seller = "22222222-2222-4222-8222-222222222222",
  stranger = "33333333-3333-4333-8333-333333333333";

export async function applyMigrations(db: PGlite, migrations: string[]) {
  for (const migration of migrations)
    await db.exec(await readFile(
      new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8",
    ));
}

export const adminMigration = "202611190004_admin.sql";
export const reviewMigration = "202611200001_review_fixes.sql";
export const dealRulesMigration = "202611200002_deal_rules.sql";
export const pickupMigration = "202611190003_pickup.sql";

/** A database through the original deals migration, with an existing listing and conversation. */
export async function marketplace() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth; create table auth.users(
  id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, banned_until timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz
 );
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;
 grant select,insert,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 create publication supabase_realtime;`);
  await applyMigrations(db, MIGRATIONS);
  await db.query("insert into auth.users(id) values ($1),($2),($3)", [
    buyer,
    seller,
    stranger,
  ]);
  async function as(id: string | null) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id ?? "",
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  }
  await as(seller);
  const listing = (
    await db.query<{ id: string }>(
      "insert into public.listings(title,price,location) values('Desk chair',30,'Ecublens') returning id",
    )
  ).rows[0].id;
  await as(buyer);
  const conversation = (
    await db.query<{ id: string }>(
      "select public.start_conversation($1) as id",
      [listing],
    )
  ).rows[0].id;
  const message = (
    await db.query<{ id: string }>(
      "insert into public.messages(conversation_id,body) values($1,'Could I get it for 20?') returning id",
      [conversation],
    )
  ).rows[0].id;
  return { db, as, conversation, message, listing };
}

export const count = async (db: PGlite, sql: string) =>
  (await db.query(sql)).rows.length;
