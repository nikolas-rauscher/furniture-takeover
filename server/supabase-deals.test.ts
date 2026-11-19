import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  marketplace,
  buyer,
  seller,
  stranger,
  count,
} from "./supabase-fixture.ts";
import { dealScenarios } from "../shared/dealScenarios.ts";
import type { DealAction } from "../shared/deal.ts";
async function setup() {
  const fixture = await marketplace();
  async function act(
    action: DealAction,
    body: string,
    version: number,
    id: string = randomUUID(),
    conversation = fixture.conversation,
  ) {
    const t = "terms" in action ? action.terms : null;
    const terms = t && {
      amount: t.amount,
      fulfillment: t.fulfillment,
      pickup_time: t.pickupTime,
      pickup_at: t.pickupAt,
      pickup_point: t.pickupPoint,
    };
    return (
      await fixture.db.query<{ version: number; status: string }>(
        "select version,status from public.deal_action($1,$2,$3,$4,$5,$6,$7)",
        [
          conversation,
          id,
          body,
          action.type,
          terms,
          version,
          action.type === "cancel" ? action.reason : null,
        ],
      )
    ).rows[0];
  }
  return { ...fixture, act };
}
for (const scenario of dealScenarios)
  test("RPC: " + scenario.name, async () => {
    const { db, as, act, listing } = await setup();
    try {
      let version = 0;
      for (const step of scenario.steps) {
        await as(step.actor === "buyer" ? buyer : seller);
        const id = randomUUID();
        const apply = () => act(step.action, step.body, version, id);
        if (step.error) {
          await assert.rejects(apply, new RegExp(step.error));
        } else {
          const row = await apply();
          assert.equal(row.version, version + 1);
          assert.deepEqual(await apply(), row);
          version++;
          const event = await db.query<{ kind: string }>(
            "select kind from public.deal_events where message_id=$1",
            [id],
          );
          assert.equal(event.rows[0].kind, step.kind);
          if (step.statusChange)
            assert.equal(
              (
                await db.query<{ status: string }>(
                  "select status from public.listings where id=$1",
                  [listing],
                )
              ).rows[0].status,
              step.statusChange,
            );
        }
        assert.equal(
          await count(db, "select * from public.messages"),
          version + 1,
        );
        assert.equal(
          await count(db, "select * from public.deal_events"),
          version,
        );
      }
    } finally {
      await db.close();
    }
  });
for (const end of ["buyer deletion", "seller deletion", "sold", "active"])
  test("Reservations, competing buyers and " + end, async () => {
    const { db, act, as, listing, conversation } = await setup();
    const offer = dealScenarios[0].steps[0];
    try {
      await as(stranger);
      await assert.rejects(
        act(offer.action, offer.body, 0),
        /conversation_unavailable/,
      );
      const other = (
        await db.query<{ id: string }>(
          "select public.start_conversation($1) id",
          [listing],
        )
      ).rows[0].id;
      await act(offer.action, offer.body, 0, randomUUID(), other);
      await as(buyer);
      assert.equal(await count(db, "select * from public.deals"), 0);
      await assert.rejects(
        db.exec("delete from public.deals"),
        /permission denied/,
      );
      await act(offer.action, offer.body, 0);
      await as(seller);
      await db.query(
        "insert into public.blocked_users(blocked_id) values($1)",
        [buyer],
      );
      await assert.rejects(act(offer.action, offer.body, 1), /unavailable/);
      assert.equal(await count(db, "select * from public.deal_events"), 2);
      await db.exec("delete from public.blocked_users");
      await assert.rejects(act(offer.action, offer.body, 0), /deal_changed/);
      await act(offer.action, offer.body, 1);
      await as(stranger);
      assert.equal(
        await count(
          db,
          "select * from public.deal_events where kind='superseded'",
        ),
        1,
      );
      assert.equal(
        await count(
          db,
          "select * from public.deal_events where kind='accepted'",
        ),
        0,
      );
      await assert.rejects(
        act(offer.action, offer.body, 2, randomUUID(), other),
        /listing_unavailable/,
      );
      if (end.endsWith("deletion")) {
        await as(end === "buyer deletion" ? buyer : seller);
        await db.exec("select public.delete_account()");
        await db.exec("reset role");
        assert.equal(
          (
            await db.query(
              "select * from public.deals where conversation_id=$1",
              [conversation],
            )
          ).rows.length,
          0,
        );
        const rows = (
          await db.query<{ status: string }>(
            "select status from public.listings where id=$1",
            [listing],
          )
        ).rows;
        if (end === "buyer deletion") assert.equal(rows[0].status, "active");
        else assert.equal(rows.length, 0);
      } else {
        await as(seller);
        await db.query("update public.listings set status=$1 where id=$2", [
          end,
          listing,
        ]);
        assert.equal(
          await count(
            db,
            "select * from public.deal_events where kind='" +
              (end === "sold" ? "completed" : "listing_reopened") +
              "'",
          ),
          1,
        );
      }
    } finally {
      await db.close();
    }
  });

test("an action cannot reuse a plain message or bypass participant grants",async()=>{
 const {db,as,act,message,conversation}=await setup();
 try{
 const offer=dealScenarios[0].steps[0];
 await assert.rejects(act(offer.action,"Could I get it for 20?",0,message),/message_conflict/);
 assert.equal(await count(db,"select * from public.deals"),0);
 const id=randomUUID();
 await act(offer.action,offer.body,0,id);
 await assert.rejects(act(offer.action,offer.body+"!",1,id),/message_conflict/);
 await as(null);
 await assert.rejects(act(offer.action,offer.body,1),/permission denied/);
 await assert.rejects(db.exec("select * from public.deal_events"),/permission denied/);
 await as(buyer);
 await assert.rejects(db.exec("update public.deals set version=5"),/permission denied/);
 await assert.rejects(db.query("insert into public.deal_events(conversation_id,kind) values($1,'accepted')",[conversation]),/permission denied/);
 await db.exec("reset role");
 await db.query("delete from public.messages where id=$1",[id]);
 assert.equal(await count(db,"select * from public.deals where proposal_message_id is null"),1);
 assert.equal(await count(db,"select * from public.deal_events where message_id is null"),1);
 }finally{await db.close();}
});
