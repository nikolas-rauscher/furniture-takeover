import { test } from "node:test";
import assert from "node:assert/strict";
import { buyer,seller,stranger,count,marketplace } from "./supabase-fixture.ts";

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
