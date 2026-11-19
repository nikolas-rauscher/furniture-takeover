import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = [
  "202610300001_supabase.sql",
  "202610300002_accounts.sql",
  "202610300003_listing_details.sql",
  "202610300004_profile_and_api_keys.sql",
  "202611060001_ai_quota.sql",
  "202611190001_thread_reading.sql",
];
const buyer = "11111111-1111-4111-8111-111111111111",
  seller = "22222222-2222-4222-8222-222222222222",
  stranger = "33333333-3333-4333-8333-333333333333";

/** A database with every migration applied, Supabase's roles and one conversation. */
async function marketplace() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;
 grant select,insert,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 create publication supabase_realtime;`);
  for (const migration of MIGRATIONS)
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${migration}`, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users values ($1),($2),($3)", [
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
  return { db, as, conversation, message };
}

const count = async (db: PGlite, sql: string) =>
  (await db.query(sql)).rows.length;

test("read markers belong to one participant and only move forward", async () => {
  const { db, as, conversation } = await marketplace();
  try {
    const save = (at: string) =>
      db.query(
        "insert into public.conversation_reads(conversation_id,last_read_at) values($1,$2) on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at",
        [conversation, at],
      );
    await as(buyer);
    await save("2026-11-19T13:00:00Z");
    await save("2026-11-19T12:00:00Z"); // An older device saves later.
    const marker = await db.query<{ last_read_at: Date }>(
      "select last_read_at from public.conversation_reads",
    );
    assert.equal(
      marker.rows[0].last_read_at.toISOString(),
      "2026-11-19T13:00:00.000Z",
    );
    await assert.rejects(
      db.query(
        "insert into public.conversation_reads(conversation_id,user_id,last_read_at) values($1,$2,now())",
        [conversation, seller],
      ),
      /row-level security/,
    );
    await as(seller);
    assert.equal(await count(db, "select * from public.conversation_reads"), 0);
    await as(stranger);
    await assert.rejects(save("2026-11-19T13:00:00Z"), /row-level security/);
    await as(null);
    await assert.rejects(
      db.query("select * from public.conversation_reads"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

test("Pako's readings stay private to the student they were made for", async () => {
  const { db, as, conversation, message } = await marketplace();
  try {
    const save = (turn: string) =>
      db.query(
        "insert into public.pako_drafts(conversation_id,for_message_id,turn) values($1,$2,$3::jsonb) on conflict(conversation_id,user_id) do update set for_message_id=excluded.for_message_id,turn=excluded.turn",
        [conversation, message, turn],
      );
    await as(seller);
    await save(JSON.stringify({ summary: "{other} offers CHF 20." }));
    await assert.rejects(save("[]"), /check constraint/);
    await assert.rejects(
      save(JSON.stringify({ summary: "x".repeat(16_001) })),
      /check constraint/,
    );
    await as(buyer);
    assert.equal(await count(db, "select * from public.pako_drafts"), 0);
    await as(stranger);
    await assert.rejects(save("{}"), /row-level security/);
    await as(null);
    await assert.rejects(
      db.query("select * from public.pako_drafts"),
      /permission denied/,
    );
    await as(seller);
    assert.equal(await count(db, "select * from public.pako_drafts"), 1);
  } finally {
    await db.close();
  }
});

test("Pako reads replies by himself until the student turns it off", async () => {
  const { db, as } = await marketplace();
  try {
    await as(buyer);
    await db.query("insert into public.account_preferences default values");
    const read = async () =>
      (
        await db.query<{ pako_auto_read: boolean }>(
          "select pako_auto_read from public.account_preferences",
        )
      ).rows[0].pako_auto_read;
    assert.equal(await read(), true);
    await db.query(
      "update public.account_preferences set pako_auto_read=false",
    );
    assert.equal(await read(), false);
  } finally {
    await db.close();
  }
});

test("deleting an account removes its read markers and Pako's readings", async () => {
  const { db, as, conversation, message } = await marketplace();
  try {
    await as(buyer);
    await db.query(
      "insert into public.conversation_reads(conversation_id,last_read_at) values($1,now())",
      [conversation],
    );
    await as(seller);
    await db.query(
      "insert into public.pako_drafts(conversation_id,for_message_id,turn) values($1,$2,'{}')",
      [conversation, message],
    );
    await as(buyer);
    await db.query("select public.delete_account()");
    await db.exec("reset role");
    assert.equal(await count(db, "select * from public.conversation_reads"), 0);
    assert.equal(await count(db, "select * from public.pako_drafts"), 0);
  } finally {
    await db.close();
  }
});

test("reading replies has its own allowance of 150 a day, apart from searches", async () => {
  const { db, as } = await marketplace();
  try {
    type Budget = { allowed: boolean; limit: number; remaining: number };
    const allowance = async (name: string, spend: boolean) =>
      (
        await db.query<{ budget: Budget }>(
          `select public.${name}($1) as budget`,
          [spend],
        )
      ).rows[0].budget;
    await as(null);
    await assert.rejects(
      allowance("ai_thread_quota", true),
      /permission denied/,
    );
    await as(buyer);
    assert.equal((await allowance("ai_thread_quota", false)).remaining, 150);
    const spent = await db.query<{ budget: Budget }>(
      "select public.ai_thread_quota(true) as budget from generate_series(1,150)",
    );
    assert.equal(spent.rows[149].budget.allowed, true);
    assert.equal(spent.rows[149].budget.remaining, 0);
    assert.equal((await allowance("ai_thread_quota", true)).allowed, false);
    assert.equal((await allowance("ai_quota", false)).remaining, 50);
    await assert.rejects(
      db.exec("update public.ai_thread_usage set requests=0"),
      /permission denied/,
    );
    await as(seller);
    assert.equal(await count(db, "select * from public.ai_thread_usage"), 0);
    assert.equal((await allowance("ai_thread_quota", true)).remaining, 149);
  } finally {
    await db.close();
  }
});
