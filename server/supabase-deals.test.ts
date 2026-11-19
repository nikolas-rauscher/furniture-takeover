import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  marketplace,
  applyMigrations, adminMigration, pickupMigration, reviewMigration, dealRulesMigration,
  buyer,
  seller,
  stranger,
  count,
} from "./supabase-fixture.ts";
import { dealScenarios, pickupScenarios, type PickupStep } from "../shared/dealScenarios.ts";
import { offerMessage, counterMessage, acceptMessage, confirmAgreementMessage, cantMakeItMessage } from "../shared/dealMessages.ts";
import { messageStatesTerms, type DealTerms, type DealAction } from "../shared/deal.ts";
import { NO_SHOW_AFTER_MINUTES, SIGNAL_WINDOW } from "../shared/dealConfig.ts";
import { formatPickup } from "../shared/pickupTime.ts";

const bugsMigration = "202611200004_bugs_and_features.sql";
const throughBugs = [pickupMigration, adminMigration, reviewMigration, dealRulesMigration, "202611200003_card_photos.sql", bugsMigration];

const storeTerms = (terms: DealTerms) => ({
  amount: terms.amount,
  fulfillment: terms.fulfillment,
  pickup_time: terms.pickupTime,
  pickup_at: terms.pickupAt,
  pickup_point: terms.pickupPoint,
});
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
    const terms = t && storeTerms(t);
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
      await db.exec("reset role");
      await applyMigrations(db, throughBugs);
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
for (const end of ["buyer deletion", "seller deletion", "sold", "active", "withdrawn"])
  test("Reservations, competing buyers and " + end, async () => {
    const { db, act, as, listing, conversation } = await setup();
    const pickupAt = new Date(Date.now() + 90 * 60_000).toISOString();
    const terms: DealTerms = {
      amount: 30, fulfillment: "pickup", pickupAt,
      pickupTime: formatPickup(pickupAt), pickupPoint: "Atrium",
    };
    const offer = { action: { type: "propose", terms } as const, body: offerMessage("desk", terms) };
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
      await db.exec("reset role");
      await applyMigrations(db, [pickupMigration, adminMigration, reviewMigration]);
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
        const setStatus = () => db.query(
          "update public.listings set status=$1 where id=$2", [end, listing],
        );
        await assert.rejects(setStatus, /listing_deal_agreed/);
        await as(buyer);
        assert.deepEqual((await db.query(
          "select status, outcome, version from public.deals where conversation_id=$1", [conversation],
        )).rows, [{ status: "agreed", outcome: null, version: 2 }]);
        assert.equal(await count(db, "select * from public.deal_events where kind in ('completed','listing_reopened')"), 0);
        if (end === "withdrawn") {
          const message = cantMakeItMessage();
          await as(seller);
          await db.query(
            "select public.pickup_action($1,$2,$3,'cancel_pickup',2,null,null,'cant_make_it')",
            [conversation, randomUUID(), message],
          );
          await setStatus();
          await as(buyer);
          assert.deepEqual((await db.query(
            "select m.body from public.deal_events e join public.messages m on m.id=e.message_id where e.kind='pickup_cancelled'",
          )).rows, [{ body: message }]);
          assert.deepEqual((await db.query(
            "select status, outcome from public.deals where conversation_id=$1", [conversation],
          )).rows, [{ status: "cancelled", outcome: "cancelled" }]);
        }
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

for (const ending of ["pickup", "no-show", "cancel"] as const) {
  test("migrated bookings keep both students in sync through " + ending, async () => {
    const { db, as, act, listing, conversation } = await setup();
    const pickupAt = new Date(Date.now() + 90 * 60000).toISOString();
    const terms: DealTerms = {
      amount: 0, fulfillment: "pickup", pickupAt, pickupTime: formatPickup(pickupAt),
      pickupPoint: "Atrium",
    };
    const later = new Date(Date.now() + 86400000).toISOString();
    const scenarios = pickupScenarios(terms, later, conversation);
    let version = 2;
    async function pickup(step: PickupStep, target = conversation, expected = version) {
      await as(step.actor === "buyer" ? buyer : seller);
      const { action } = step;
      const id = randomUUID();
      const params = [target, id, step.body, action.type, expected,
        "terms" in action ? storeTerms(action.terms) : null,
        "minutes" in action ? action.minutes : null,
        "reason" in action ? action.reason : null,
        "releasedConversationId" in action ? action.releasedConversationId : null];
      const apply = () => db.query<{
        status: string; version: number; agreed: ReturnType<typeof storeTerms>;
        late_minutes: number | null; buyer_picked_up_at: Date | null;
        pickup_cancel_reason: string | null;
      }>("select * from public.pickup_action($1,$2,$3,$4,$5,$6,$7,$8,$9)", params);
      if (step.error) {
        await assert.rejects(apply, new RegExp(step.error));
        assert.equal((await db.query("select id from public.messages where id=$1", [id])).rows.length, 0);
        return;
      }
      const result = (await apply()).rows[0];
      assert.equal(result.version, expected + 1);
      assert.deepEqual((await apply()).rows[0], result);
      assert.deepEqual((await db.query(
        "select kind, pickup_minutes from public.deal_events where message_id=$1", [id],
      )).rows, [{ kind: step.kind, pickup_minutes: "minutes" in action ? action.minutes : null }]);
      if (target === conversation) version++;
      const currentListing = (await db.query<{ status: string }>(
        "select status from public.listings where id=$1", [listing],
      )).rows[0];
      assert.equal(currentListing.status, step.statusChange ?? (target === conversation ? "reserved" : "active"));
      return result;
    }
    async function movePickup(minutesFromNow: number) {
      await db.exec("reset role");
      await db.query("update public.deals set pickup_at = now() + $1 * interval '1 minute' where conversation_id=$2",
        [minutesFromNow, conversation]);
    }
    async function blockBuyer() {
      await db.exec("reset role");
      await db.query(
        "insert into takeover_admin.student_blocks(student_id,reason) values($1,'Blocked')",
        [buyer],
      );
    }
    try {
      await as(stranger);
      const { rows: [{ id: other }] } = await db.query<{ id: string }>(
        "select public.start_conversation($1) as id", [listing],
      );
      await db.query("insert into public.messages(conversation_id,body) values ($1,'Can I be next?')", [other]);
      await act({ type: "cancel", reason: "changed_mind" }, "I'll pass for now.", 0, randomUUID(), other);
      await as(buyer);
      await act({ type: "propose", terms }, offerMessage("desk", terms), 0);
      await as(seller);
      await act({ type: "accept", terms }, acceptMessage("seller", terms), 1);
      await db.exec("reset role");
      await applyMigrations(db, [pickupMigration, adminMigration, reviewMigration, dealRulesMigration]);
      await as(buyer);
      assert.deepEqual((await db.query(
        "select version, agreed, late_minutes from public.deals where conversation_id=$1", [conversation],
      )).rows, [{ version: 2, agreed: storeTerms(terms), late_minutes: null }]);
      await as(stranger);
      for (const table of ["deals", "deal_events"]) {
        const { rows } = await db.query(
          `select * from public.${table} where conversation_id=$1`, [conversation],
        );
        assert.deepEqual(rows, []);
      }
      await assert.rejects(db.query(
        "select public.pickup_action($1,$2,'On my way','on_my_way',2)", [conversation, randomUUID()],
      ), /conversation_unavailable/);
      await as(null);
      await assert.rejects(db.query(
        "select public.pickup_action($1,$2,'On my way','on_my_way',2)", [conversation, randomUUID()],
      ), /permission denied/);
      await as(seller);
      await db.query("insert into public.blocked_users(blocked_id) values($1)", [buyer]);
      await pickup({ ...scenarios.handling[0], error: "unavailable" });
      await as(seller);
      await db.exec("delete from public.blocked_users");

      await pickup(scenarios.earlyNoShow);
      await pickup({ ...scenarios.handling[0], error: "deal_changed" }, conversation, 1);
      if (ending === "pickup") {
        await pickup({ ...scenarios.handling.at(-1)!, error: "too_early" });
        await movePickup(SIGNAL_WINDOW.beforeMinutes + 1);
        await pickup({ ...scenarios.handling[1], error: "too_early" });
        await movePickup(SIGNAL_WINDOW.beforeMinutes - 1);
        for (const step of scenarios.handling) {
          if (step.action.type === "picked_up" && step.actor === "seller")
            await blockBuyer();
          const result = await pickup(step);
          if (!result) continue;
          if (step.kind === "time_kept") assert.deepEqual(result.agreed, storeTerms(terms));
          if (step.kind === "time_accepted") {
            assert.equal(result.agreed.pickup_at, later);
            assert.equal(result.late_minutes, null);
          }
          if (step.kind === "picked_up" && step.actor === "buyer") {
            assert.equal(result.status, "agreed");
            assert.ok(result.buyer_picked_up_at);
          }
        }
      } else {
        if (ending === "no-show") {
          await movePickup(-SIGNAL_WINDOW.afterMinutes - 1);
          await pickup({ ...scenarios.handling[1], error: "pickup_window_ended" });
          await movePickup(10);
          await pickup({
            actor: "buyer", action: { type: "late", minutes: 30 },
            body: "Running 30 minutes late.", kind: "late",
          });
          await movePickup(-NO_SHOW_AFTER_MINUTES - 1);
          for (const step of scenarios.overdue)
            await pickup({ ...step, error: "too_early" });
          await movePickup(-30 - NO_SHOW_AFTER_MINUTES - 1);
          for (const step of scenarios.overdue) {
            if (step.action.type === "release_no_show") await blockBuyer();
            await pickup(step);
          }
        } else {
          const result = await pickup({
            actor: "buyer", action: { type: "cancel_pickup", reason: "cant_make_it" },
            body: cantMakeItMessage(), kind: "pickup_cancelled", statusChange: "active",
          });
          assert.equal(result?.pickup_cancel_reason, "cant_make_it");
        }
        await pickup({
          ...scenarios.nextBuyer,
          actor: "buyer",
          error: ending === "no-show" ? "admin_student_blocked" : "next_buyer_unavailable",
        });
        await pickup(scenarios.nextBuyer, other, 1);
      }
    } finally {
      await db.close();
    }
  });
}

test("the original buyer can negotiate again after a pre-agreement cancellation", async () => {
  const { db, act, as, conversation, listing } = await setup();
  const terms = dealScenarios[0].steps[0].action;
  assert.equal(terms.type, "propose");
  try {
    await as(seller);
    assert.equal((await act({ type: "cancel", reason: "changed_mind" }, "Sorry", 0)).status, "cancelled");
    await db.exec("reset role");
    await applyMigrations(db, [pickupMigration, adminMigration, reviewMigration, dealRulesMigration]);
    await as(buyer);
    assert.deepEqual((await db.query("select public.start_conversation($1) as id", [listing])).rows, [
      { id: conversation },
    ]);
    assert.deepEqual(await act(terms, "CHF 30 shipped?", 1), { status: "open", version: 2 });
    assert.deepEqual((await db.query("select outcome, outcome_by from public.deals")).rows, [
      { outcome: null, outcome_by: null },
    ]);
    await as(seller);
    assert.deepEqual(await act(terms, "CHF 30 shipped?", 2), { status: "agreed", version: 3 });
  } finally {
    await db.close();
  }
});

test("every terms message states its terms in the demo and the deal RPC", async () => {
  const { db } = await setup();
  const base: DealTerms = {
    amount: 60,
    fulfillment: "pickup",
    pickupAt: "2026-11-21T10:00:00Z",
    pickupTime: "tomorrow morning",
    pickupPoint: "FMEL Atrium · outside entrance",
  };
  try {
    await db.exec("reset role");
    await applyMigrations(db, [pickupMigration, adminMigration, reviewMigration, dealRulesMigration]);
    const zero = storeTerms({ ...base, amount: 0, pickupAt: null, pickupPoint: null, pickupTime: null });
    for (const [body, ok] of [
      ["I'm free after 18:00.", false], ["This is not free.", false],
      ["I can't do it for free.", false], ["CHF 05", false],
      ["Could I have it for free?", true], ["Free pickup at Vortex.", true],
      ["It's free!", true], ["C'est gratuit.", true], ["Kostenlos", true], ["CHF 0", true],
    ] as const) {
      const { rows } = await db.query<{ ok: boolean }>(
        "select public.body_states_terms($1, $2) as ok", [body, zero],
      );
      assert.equal(rows[0].ok, ok, body);
    }
    for (const terms of [
      base,
      { ...base, amount: 0 },
      { ...base, amount: null, pickupAt: null },
      { ...base, pickupTime: null, pickupAt: null },
      { ...base, pickupPoint: null },
      {
        ...base,
        fulfillment: "shipping" as const,
        pickupTime: null,
        pickupAt: null,
        pickupPoint: null,
      },
    ]) {
      for (const body of [
        offerMessage("White work desk", terms),
        counterMessage(terms),
        acceptMessage("buyer", terms),
        acceptMessage("seller", terms),
        confirmAgreementMessage(terms),
      ]) {
        assert.deepEqual(messageStatesTerms(body, terms), { ok: true }, body);
        const { rows } = await db.query<{ ok: boolean }>(
          "select public.body_states_terms($1, $2) as ok",
          [
            body,
            {
              amount: terms.amount,
              fulfillment: terms.fulfillment,
              pickup_at: terms.pickupAt,
              pickup_time: terms.pickupTime,
              pickup_point: terms.pickupPoint,
            },
          ],
        );
        assert.equal(rows[0].ok, true, body);
      }
    }
  } finally {
    await db.close();
  }
});

for (const ending of ["confirm_pickup_happened", "release_stale_pickup", "expired", "release_no_show"] as const) {
  test(`Pickup follow-up RPC handles ${ending} and retains the conversation history`, async () => {
    const { db, act, as, conversation, listing } = await setup();
    const pickupAt = new Date(Date.now() + 60 * 60_000).toISOString();
    const terms: DealTerms = {
      amount: 30, fulfillment: "pickup", pickupAt, pickupTime: formatPickup(pickupAt), pickupPoint: "Atrium",
    };
    const offer = offerMessage("desk", terms);
    const dismiss = (action: string, version = 2) =>
      db.query<{ status: string; version: number }>(
        "select status,version from public.pickup_action($1,$2,'Pickup follow-up',$3,$4)",
        [conversation, randomUUID(), action, version],
      );
    const refresh = () => db.query("select public.refresh_pickup_checks()");
    const movePickup = async (hoursAgo: number) => {
      const at = new Date(Date.now() - hoursAgo * 60 * 60_000).toISOString();
      await db.exec("reset role");
      await db.query(
        "update public.deals set pickup_at=$2, agreed=agreed || $3::jsonb where conversation_id=$1",
        [conversation, at, { pickup_at: at, pickup_time: formatPickup(at) }],
      );
    };
    try {
      await db.exec("reset role");
      await applyMigrations(db, throughBugs);
      await as(buyer);
      await act({ type: "propose", terms }, offer, 0);
      await as(seller);
      await act({ type: "accept", terms }, offer, 1);
      await assert.rejects(dismiss("confirm_pickup_happened"), /pickup_check_not_due/);

      if (ending === "release_no_show") {
        await movePickup(1);
        await as(buyer);
        assert.deepEqual((await dismiss(ending)).rows, [{ status: "cancelled", version: 3 }]);
      } else {
        await movePickup(25);
        await as(stranger);
        await refresh();
        await as(buyer);
        assert.equal(await count(db, "select * from public.deal_events where kind='pickup_check_due'"), 0);
        await refresh();
        await as(seller);
        await refresh();
        assert.equal(await count(db, "select * from public.deal_events where kind='pickup_check_due' and actor_role is null"), 1);
        assert.equal(await count(db, "select * from public.listings where status='reserved'"), 1);
        await as(buyer);
        if (ending === "expired") {
          await movePickup(49);
          await as(buyer);
          await assert.rejects(dismiss("confirm_pickup_happened"), /pickup_unavailable/);
          await as(stranger);
          await db.query("select public.refresh_pickup_checks(true)");
          assert.equal(await count(db, "select * from public.deal_events"), 0);
          await as(buyer);
          await refresh();
          assert.deepEqual((await db.query("select status,outcome,version from public.deals")).rows, [
            { status: "cancelled", outcome: "pickup_expired", version: 3 },
          ]);
          assert.equal(await count(db, "select * from public.deal_events where kind='pickup_expired' and actor_role is null"), 1);
        } else {
          assert.deepEqual((await dismiss(ending)).rows, [
            { status: ending === "confirm_pickup_happened" ? "completed" : "cancelled", version: 3 },
          ]);
        }
      }
      const status = ending === "confirm_pickup_happened" ? "sold" : "active";
      for (const student of [buyer, seller]) {
        await as(student);
        assert.deepEqual((await db.query("select status from public.listings where id=$1", [listing])).rows, [{ status }]);
      }
      if (status === "active") {
        await as(buyer);
        assert.deepEqual(await act({ type: "propose", terms }, offer, 3), { status: "open", version: 4 });
        assert.deepEqual((await db.query("select agreed, outcome, no_show_at, pickup_checked_at from public.deals")).rows, [
          { agreed: null, outcome: null, no_show_at: null, pickup_checked_at: null },
        ]);
        assert.equal(await count(db, "select * from public.deal_events where kind='accepted'"), 1);
      }
    } finally {
      await db.close();
    }
  });
}

test("saved listing price snapshots and sold visibility are scoped to the saver", async () => {
  const { db, as, listing } = await setup();
  try {
    await as(buyer);
    await db.query("insert into public.saved_listings(listing_id) values ($1)", [listing]);
    await db.exec("reset role");
    await applyMigrations(db, throughBugs);
    await as(buyer);
    assert.deepEqual((await db.query("select price_at_save from public.saved_listings")).rows, [{ price_at_save: null }]);
    await as(stranger);
    await db.query("insert into public.saved_listings(listing_id,price_at_save) values ($1,5)", [listing]);
    assert.deepEqual((await db.query("select price_at_save from public.saved_listings")).rows, [{ price_at_save: "30.00" }]);
    await as(seller);
    await db.query("update public.listings set status='sold',price=20 where id=$1", [listing]);
    await as(stranger);
    assert.deepEqual((await db.query("select l.status,l.price<s.price_at_save as cheaper from public.listings l join public.saved_listings s on s.listing_id=l.id")).rows, [
      { status: "sold", cheaper: true },
    ]);
    await as(null);
    assert.equal(await count(db, "select * from public.listings"), 0);
    await as(stranger);
    await db.query("delete from public.saved_listings where listing_id=$1", [listing]);
    assert.equal(await count(db, "select * from public.listings"), 0);
  } finally {
    await db.close();
  }
});

test("the signup trigger checks exact university domains and preserves trusted demo seeding", async () => {
  const { db } = await setup();
  const create = (email: string | null, userMetadata = {}, appMetadata = {}) =>
    db.query("insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values ($1,$2,$3,$4)",
      [randomUUID(), email, userMetadata, appMetadata]);
  try {
    await db.exec("reset role");
    await applyMigrations(db, throughBugs);
    const demoMeta = { demo_seed: "takeover-demo-v2", synthetic: true };
    await create("first@EPFL.CH");
    await create("second@unil.ch");
    for (const email of ["personal@gmail.com", "x@eng.epfl.ch", "x@epfl.ch.example.org", "x@home-unil.ch", null])
      await assert.rejects(create(email, demoMeta), /Sign up with your @epfl.ch or @unil.ch address/);
    await create("catalogue@example.invalid", {}, demoMeta);
    await create("qa@example.invalid", {}, { qa_account: true });
    await assert.rejects(create("self@example.invalid", { qa_account: true }), /Sign up with your @epfl.ch or @unil.ch address/);
    assert.equal(await count(db, "select * from auth.users"), 7);
  } finally {
    await db.close();
  }
});
