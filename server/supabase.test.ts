import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Supabase migration enforces listing ownership, private chats and photo ownership", async () => {
  const db = new PGlite();
  try {
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
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300001_supabase.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300002_accounts.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300003_listing_details.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const alice = "11111111-1111-4111-8111-111111111111",
      bob = "22222222-2222-4222-8222-222222222222",
      eve = "33333333-3333-4333-8333-333333333333";
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610300004_profile_and_api_keys.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.query("insert into auth.users values ($1),($2),($3)", [
      alice,
      bob,
      eve,
    ]);
    async function as(id: string | null) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id ?? "",
      ]);
      await db.exec(`set role ${id ? "authenticated" : "anon"}`);
    }
    await as(alice);
    await db.query(
      "insert into profiles(id,display_name,bio) values($1,'Alice','Moving to Lausanne')",
      [alice],
    );
    await db.query(
      "insert into account_preferences(user_id,pickup_region,postal_code,country,handover) values($1,'Lausanne','1004','Switzerland','pickup')",
      [alice],
    );
    await db.query(
      "insert into account_api_keys(provider,encrypted_key,last_four) values('deepseek',$1,'1234')",
      ["v1:" + "a".repeat(16) + ":" + "b".repeat(24) + ":" + "c".repeat(24)],
    );
    // Only ciphertext can be stored; even the owner cannot accidentally insert a raw key.
    await assert.rejects(
      db.query(
        "update account_api_keys set encrypted_key='sk-plaintext-secret'",
      ),
      /check constraint/,
    );
    await as(bob);
    assert.equal(
      (await db.query("select * from account_api_keys")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from account_preferences")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update account_api_keys set last_four='9999' where user_id=$1 returning user_id",
          [alice],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "delete from account_api_keys where user_id=$1 returning user_id",
          [alice],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into account_api_keys(user_id,provider,encrypted_key,last_four) values($1,'brave',$2,'9999')",
        [
          alice,
          "v1:" + "a".repeat(16) + ":" + "b".repeat(24) + ":" + "c".repeat(24),
        ],
      ),
      /row-level security/,
    );
    await as(null);
    await assert.rejects(
      db.query("select * from account_api_keys"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query<{ bio: string }>(
          "select bio from profiles where id=$1",
          [alice],
        )
      ).rows[0].bio,
      "Moving to Lausanne",
    );
    await as(alice);
    assert.equal(
      (await db.query("select * from account_api_keys")).rows.length,
      1,
    );
    // Clear private profile fixtures so the existing account tests exercise fresh settings.
    await db.exec("reset role");
    await db.query("delete from account_preferences");
    await db.query("delete from profiles where id=$1", [alice]);
    await as(alice);
    const item = (
      await db.query<{ id: string }>(
        "insert into public.listings(title,price,location) values('Desk',40,'Lausanne') returning id",
      )
    ).rows[0].id;
    await db.query(
      "update public.listings set pickup_by='2026-11-15', tags=ARRAY['Desk','Wood'] where id=$1",
      [item],
    );
    const details = (
      await db.query<{ pickup_by: string; tags: string[] }>(
        "select pickup_by::text,tags from public.listings where id=$1",
        [item],
      )
    ).rows[0];
    assert.equal(details.pickup_by, "2026-11-15");
    assert.deepEqual(details.tags, ["Desk", "Wood"]);
    await assert.rejects(
      db.query("update public.listings set owner_id=$1 where id=$2", [
        eve,
        item,
      ]),
      /permission denied/i,
    );
    await assert.rejects(
      db.query("update public.listings set images=$1 where id=$2", [
        [`${eve}/a.jpg`],
        item,
      ]),
      /Invalid photo path/,
    );
    await as(null);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select * from public.messages"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.listings(title,price,location) values('Fake',0,'X')",
      ),
      /permission denied/,
    );
    await as(bob);
    assert.equal(
      (
        await db.query(
          "update public.listings set title='Stolen' where id=$1 returning id",
          [item],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.conversations(listing_id,buyer_id,seller_id) values($1,$2,$3)",
        [item, bob, alice],
      ),
      /permission denied/,
    );
    const convo = (
      await db.query<{ id: string }>(
        "select public.start_conversation($1) as id",
        [item],
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select public.start_conversation($1) as id",
          [item],
        )
      ).rows[0].id,
      convo,
    );
    await assert.rejects(
      db.query(
        "insert into public.messages(conversation_id,sender_id,body) values($1,$2,'spoof')",
        [convo, alice],
      ),
      /row-level security/,
    );
    const message = "44444444-4444-4444-8444-444444444444";
    await db.query(
      "insert into public.messages(id,conversation_id,body) values($1,$2,'Hello')",
      [message, convo],
    );
    await assert.rejects(
      db.query(
        "insert into public.messages(id,conversation_id,body) values($1,$2,'Hello')",
        [message, convo],
      ),
      /duplicate key/,
    );
    await db.query(
      "insert into public.conversation_archives(conversation_id) values($1)",
      [convo],
    );
    await as(eve);
    assert.equal(
      (await db.query("select * from public.messages")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.messages(conversation_id,body) values($1,'intrusion')",
        [convo],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.conversation_archives(conversation_id) values($1)",
        [convo],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('listing-photos',$1)",
        [`${alice}/a.jpg`],
      ),
      /row-level security/,
    );
    await as(alice);
    assert.equal(
      (await db.query("select * from public.messages")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.conversation_archives")).rows
        .length,
      0,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('listing-photos',$1)",
      [`${alice}/a.jpg`],
    );
    await db.query(
      "update public.listings set status='withdrawn' where id=$1",
      [item],
    );
    await as(null);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      0,
    );
    await as(eve);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.start_conversation($1)", [item]),
      /cannot be contacted/,
    );
    await as(bob);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      1,
    );
    await db.query(
      "insert into public.messages(conversation_id,body) values($1,'Still available?')",
      [convo],
    );
    assert.equal(
      (await db.query("select * from public.messages")).rows.length,
      2,
    );
    await db.query(
      "insert into public.account_preferences(pickup_region) values('Lausanne')",
    );
    await db.query("insert into public.profiles(display_name) values('Bob')");
    await db.query(
      "insert into public.reports(message_id,reason) values($1,'Test report')",
      [message],
    );
    await as(alice);
    assert.equal(
      (await db.query("select * from public.account_preferences")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.reports")).rows.length,
      0,
    );
    await db.query("update public.listings set status='active' where id=$1", [
      item,
    ]);
    await as(bob);
    await db.query("insert into public.saved_listings(listing_id) values($1)", [
      item,
    ]);
    await db.query("insert into public.blocked_users(blocked_id) values($1)", [
      alice,
    ]);
    await assert.rejects(
      db.query(
        "insert into public.messages(conversation_id,body) values($1,'blocked')",
        [convo],
      ),
      /Messaging is unavailable/,
    );
    await as(alice);
    assert.equal(
      (await db.query("select * from public.saved_listings")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.messages(conversation_id,body) values($1,'also blocked')",
        [convo],
      ),
      /Messaging is unavailable/,
    );
    await as(eve);
    await assert.rejects(
      db.query(
        "insert into public.reports(message_id,reason) values($1,'unreadable')",
        [message],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into public.saved_listings(user_id,listing_id) values($1,$2)",
        [bob, item],
      ),
      /row-level security/,
    );
    await db.query("select public.delete_account()");
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from auth.users where id=$1", [eve])).rows
        .length,
      0,
    );
    assert.equal((await db.query("select * from auth.users")).rows.length, 2);
    await as(alice);
    await assert.rejects(
      db.query("select public.delete_account()"),
      /Remove your uploaded photos/,
    );
    await db.query(
      "delete from storage.objects where bucket_id='listing-photos'",
    );
    await db.query("select public.delete_account()");
    await db.exec("reset role");
    assert.equal((await db.query("select * from auth.users")).rows.length, 1);
    assert.equal(
      (await db.query("select * from account_api_keys")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.messages")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.conversations")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.saved_listings")).rows.length,
      0,
    );
    // Optional demo seed must be repeatable and never overwrite existing user data.
    await db.exec(`alter table auth.users
      add column instance_id uuid, add column aud text, add column role text,
      add column email text, add column encrypted_password text,
      add column email_confirmed_at timestamptz, add column banned_until timestamptz,
      add column raw_app_meta_data jsonb, add column raw_user_meta_data jsonb,
      add column created_at timestamptz, add column updated_at timestamptz;`);
    const seed = await readFile(
      new URL("../supabase/seed-demo.sql", import.meta.url),
      "utf8",
    );
    await db.exec(seed);
    assert.equal(
      (
        await db.query(
          "select * from auth.users where raw_app_meta_data->>'demo_seed'='takeover-ebay-v1' and encrypted_password is null and email_confirmed_at is null and banned_until='infinity'::timestamptz",
        )
      ).rows.length,
      3,
    );
    await db.exec(
      "update public.listings set price=99,status='withdrawn' where title='[Demo] White study desk'",
    );
    await db.exec(seed);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      6,
    );
    assert.equal((await db.query("select * from auth.users")).rows.length, 4);
    const preserved = (
      await db.query<{ price: string; status: string }>(
        "select price,status from public.listings where title='[Demo] White study desk'",
      )
    ).rows[0];
    assert.equal(Number(preserved.price), 99);
    assert.equal(preserved.status, "withdrawn");
    await as(null);
    assert.equal(
      (await db.query("select * from public.listings")).rows.length,
      5,
    );
    await db.exec("reset role");
    await db.exec(
      "update auth.users set encrypted_password='collision-test' where id='df5ead21-cb17-52ad-af2d-b6b167100001'",
    );
    await assert.rejects(db.exec(seed), /Reserved demo owner/);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
