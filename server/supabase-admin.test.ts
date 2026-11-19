import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import {
  adminActions,
  adminIllustrations,
  type AdminAction,
  type AdminOutput,
} from "../shared/admin.ts";
import { adminMigration, applyMigrations, buyer, marketplace, pickupMigration, reviewMigration, seller, stranger } from "./supabase-fixture.ts";

const why = { reason: "Reviewed with the marketplace team" };
const draft = {
  title: "Desk",
  description: "Solid wood",
  price: 25.5,
  location: "Lausanne",
  condition: "Good",
  image: adminIllustrations[0],
  meetingPoint: "",
  pickup: "Friday evening",
  pickupBy: "2027-01-01",
  status: "active",
};

async function setup(t: TestContext) {
  const fixture = await marketplace();
  const { db } = fixture;
  t.after(() => db.close());
  await db.exec("reset role");
  await db.query(
    "insert into public.reports(reporter_id,listing_id,reason) values($1,$2,'Listing problem')",
    [buyer, fixture.listing],
  );
  await db.query(
    "insert into public.reports(reporter_id,message_id,reason) values($1,$2,'Message problem')",
    [seller, fixture.message],
  );
  await applyMigrations(db, [pickupMigration, adminMigration, reviewMigration]);
  await db.query("insert into public.admins(user_id) values($1)", [stranger]);
  return {
    ...fixture,
    async rpc<A extends AdminAction>(
      action: A,
      input?: object,
    ): Promise<AdminOutput<A>> {
      const { rows } = await db.query<{ value: unknown }>(
        `select public.admin_${action}(${input ? "$1::jsonb" : ""}) as value`,
        input ? [input] : [],
      );
      return adminActions[action].output.parse(rows[0].value) as AdminOutput<A>;
    },
  };
}

test("every admin RPC checks membership before input, and clients cannot grant it", async (t) => {
  const { db, as, rpc } = await setup(t);
  const mutations = new Set<AdminAction>([
    "save_demo_listing",
    "save_demo_seller",
    "set_listing_hidden",
    "reset_demo",
    "resolve_report",
    "set_student_blocked",
  ]);
  for (const actor of [buyer, null]) {
    await as(actor);
    assert.equal(
      (await db.query<{ admin: boolean }>("select public.is_admin() as admin"))
        .rows[0].admin,
      false,
    );
    for (const action of Object.keys(adminActions) as AdminAction[])
      await assert.rejects(
        rpc(action, mutations.has(action) ? {} : undefined),
        actor ? /admin_required/ : /permission denied/,
      );
    await assert.rejects(
      db.query("insert into public.admins(user_id) values($1)", [buyer]),
      /permission denied/,
    );
  }
  await as(stranger);
  assert.equal(
    (await db.query<{ admin: boolean }>("select public.is_admin() as admin"))
      .rows[0].admin,
    true,
  );
  await assert.rejects(
    db.query("delete from public.admins"),
    /permission denied/,
  );
});

test("admins provision inert sellers, edit demo listings, and restore the shipped catalog", async (t) => {
  const { db, as, rpc } = await setup(t);
  await as(stranger);
  assert.deepEqual(await rpc("reset_demo", why), { listings: 40, sellers: 6 });
  const shipped = await rpc("list_demo_listings");
  assert.equal(shipped.length, 40);
  assert.ok(shipped.some((listing) => listing.meetingPoint));
  const demo = await rpc("save_demo_seller", {
    name: "Alix",
    styleNote: "Matter of fact",
  });
  assert.deepEqual(demo.listingIds, []);
  const item = await rpc("save_demo_listing", { ...draft, sellerId: demo.id });
  assert.equal(item.title, draft.title);
  assert.equal(item.hidden, false);
  const renamed = await rpc("save_demo_seller", {
    id: demo.id,
    name: "Camille",
    styleNote: "Brief",
  });
  assert.deepEqual(renamed, {
    id: demo.id,
    name: "Camille",
    styleNote: "Brief",
    listingIds: [item.id],
  });
  const edited = await rpc("save_demo_listing", {
    ...draft,
    id: item.id,
    sellerId: demo.id,
    title: "Table",
    status: "sold",
  });
  assert.equal(edited.title, "Table");
  assert.equal(edited.status, "sold");
  await rpc("set_listing_hidden", { id: item.id, hidden: true, ...why });
  assert.equal(
    (await rpc("list_demo_listings")).find(({ id }) => id === item.id)?.hidden,
    true,
  );
  await rpc("set_listing_hidden", { id: item.id, hidden: false, ...why });
  await assert.rejects(
    rpc("save_demo_listing", {
      ...draft,
      sellerId: demo.id,
      image: "/samples/unknown.svg",
    }),
    /admin_invalid_input/,
  );
  await assert.rejects(
    rpc("save_demo_listing", { ...draft, sellerId: seller }),
    /admin_seller_missing/,
  );

  await db.exec("reset role");
  const auth = (
    await db.query(
      "select encrypted_password, email_confirmed_at, banned_until::text, raw_app_meta_data->>'demo_seed' as marker from auth.users where id=$1",
      [demo.id],
    )
  ).rows[0];
  assert.deepEqual(auth, {
    encrypted_password: null,
    email_confirmed_at: null,
    banned_until: "infinity",
    marker: "takeover-demo-v2",
  });
  await assert.rejects(
    db.query("update public.listings set images=$1 where id=$2", [
      [`${seller}/abcd.jpg`],
      item.id,
    ]),
    /Invalid photo path/,
  );

  await as(buyer);
  const retained = await rpcAsAdminThenBuyer();
  async function rpcAsAdminThenBuyer() {
    await as(stranger);
    const listing = await rpc("save_demo_listing", {
      ...draft,
      sellerId: demo.id,
    });
    await as(buyer);
    await db.query("select public.start_conversation($1)", [listing.id]);
    return listing.id;
  }
  await as(stranger);
  await rpc("reset_demo", why);
  assert.deepEqual(await rpc("list_demo_listings"), shipped);
  assert.equal((await rpc("list_demo_sellers")).length, 6);
  assert.equal(
    (
      await db.query<{ hidden: boolean }>(
        "select hidden_at is not null as hidden from public.listings where id=$1",
        [retained],
      )
    ).rows[0].hidden,
    true,
  );
  assert.equal((await rpc("overview")).conversations, 2);
});

test("hide, block and report moderation preserve privacy and write a reasoned audit trail", async (t) => {
  const { db, as, rpc, listing, conversation, message } = await setup(t);
  await as(buyer);
  await assert.rejects(
    db.query(
      "insert into public.listings(title,price,location,tags,images) values('Spoof',1,'Here',array['Demo'],$1)",
      [[adminIllustrations[0]]],
    ),
    /Invalid photo path/,
  );
  await assert.rejects(
    db.query(
      "insert into public.reports(listing_id,reason,resolved_at) values($1,'Spoof',now())",
      [listing],
    ),
    /permission denied/,
  );

  await as(stranger);
  const reports = await rpc("list_reports");
  assert.equal(reports.length, 2);
  const listingReport = reports.find(
    ({ target }) => target.kind === "listing",
  )!;
  const messageReport = reports.find(
    ({ target }) => target.kind === "message",
  )!;
  assert.equal(listingReport.studentId, seller);
  assert.equal(messageReport.studentId, buyer);
  assert.deepEqual(messageReport.target, {
    kind: "message",
    id: message,
    conversationId: conversation,
    listingId: listing,
    body: "Could I get it for 20?",
  });
  assert.equal((await rpc("overview")).reportsOpen, 2);
  await rpc("set_listing_hidden", { id: listing, hidden: true, ...why });
  assert.equal((await rpc("overview")).listings.hidden, 1);
  assert.equal(
    (await db.query("select id from public.listings")).rows.length,
    1,
  );
  for (const actor of [null, buyer, seller]) {
    await as(actor);
    assert.equal(
      (await db.query("select id from public.listings")).rows.length,
      actor === seller ? 1 : 0,
    );
  }
  await as(buyer);
  await assert.rejects(
    db.query(
      "insert into public.messages(conversation_id,body) values($1,'Hello')",
      [conversation],
    ),
    /admin_listing_hidden/,
  );
  assert.deepEqual(
    (await db.query("select * from public.moderation_log")).rows,
    [],
  );
  await as(stranger);
  await rpc("set_listing_hidden", { id: listing, hidden: false, ...why });
  await rpc("set_student_blocked", { studentId: buyer, blocked: true, ...why });
  assert.equal((await rpc("list_blocks"))[0].studentId, buyer);
  const receipt = await rpc("resolve_report", { id: listingReport.id, ...why });
  assert.deepEqual(
    await rpc("resolve_report", { id: listingReport.id, ...why }),
    receipt,
  );
  await as(buyer);
  await assert.rejects(
    db.query(
      "insert into public.listings(title,price,location) values('Desk',1,'Here')",
    ),
    /admin_student_blocked/,
  );
  await assert.rejects(
    db.query(
      "insert into public.messages(conversation_id,body) values($1,'Hello')",
      [conversation],
    ),
    /admin_student_blocked/,
  );
  await as(seller);
  await db.query(
    "insert into public.messages(conversation_id,body) values($1,'Still available')",
    [conversation],
  );
  await as(stranger);
  await rpc("set_student_blocked", {
    studentId: buyer,
    blocked: false,
    ...why,
  });
  assert.deepEqual(await rpc("list_blocks"), []);
  assert.equal((await rpc("overview")).reportsOpen, 1);
  const audit = await rpc("list_moderation_log");
  assert.deepEqual(audit.map(({ action }) => action).sort(), [
    "block_student",
    "hide_listing",
    "resolve_report",
    "restore_listing",
    "unblock_student",
  ]);
  assert.ok(
    audit.every(
      ({ adminId, reason, at }) =>
        adminId === stranger &&
        reason === why.reason &&
        Number.isFinite(Date.parse(at)),
    ),
  );
  await as(buyer);
  await db.query(
    "insert into public.messages(conversation_id,body) values($1,'Hello')",
    [conversation],
  );
});

test("an agreed pickup survives a refused hide and a block, with atomic deal writes", async (t) => {
  const { db, as, rpc, listing, conversation } = await setup(t);
  const terms = {
    amount: 30,
    fulfillment: "pickup",
    pickup_time: "Friday 6pm",
    pickup_at: "2099-11-20T17:00:00Z",
    pickup_point: "Vortex",
  };
  const act = (action: string, version: number, reason?: string) =>
    db.query("select status from public.deal_action($1,$2,$3,$4,$5,$6,$7)", [
      conversation,
      randomUUID(),
      "CHF 30 at Vortex on Friday at 18:00",
      action,
      terms,
      version,
      reason,
    ]);
  await as(buyer);
  await act("propose", 0);
  await as(seller);
  await act("accept", 1);
  await as(stranger);
  await assert.rejects(
    rpc("set_listing_hidden", { id: listing, hidden: true, ...why }),
    /admin_deal_agreed/,
  );
  await rpc("set_student_blocked", { studentId: buyer, blocked: true, ...why });
  await as(buyer);
  await assert.rejects(act("cancel", 2, "cant_make_it"), /admin_student_blocked/);
  await assert.rejects(db.query("select public.delete_account()"), /admin_student_blocked/);
  await assert.rejects(
    db.query(
      "select public.pickup_action($1,$2,'I cannot make it','cancel_pickup',2,null,null,'cant_make_it')",
      [conversation, randomUUID()],
    ),
    /admin_student_blocked/,
  );
  const deal = (await db.query("select status,version from public.deals"))
    .rows[0];
  assert.deepEqual(deal, { status: "agreed", version: 2 });
  await as(stranger);
  await rpc("set_student_blocked", { studentId: buyer, blocked: false, ...why });
  await rpc("set_student_blocked", { studentId: seller, blocked: true, ...why });
  await as(seller);
  for (const update of ["title='New title'", "status='withdrawn'"])
    await assert.rejects(db.query(`update public.listings set ${update} where id=$1`, [listing]), /admin_student_blocked/);
  await assert.rejects(db.query("select public.delete_account()"), /admin_student_blocked/);
  await as(buyer);
  await act("cancel", 2, "cant_make_it");
  await as(stranger);
  await rpc("set_listing_hidden", { id: listing, hidden: true, ...why });
  await db.exec("reset role");
  assert.equal((await db.query("select * from public.reports")).rows.length, 2);
  assert.deepEqual((await db.query("select student_id from takeover_admin.student_blocks")).rows, [{ student_id: seller }]);
  await db.exec(
    "insert into public.ai_daily_totals values ((now() at time zone 'UTC')::date,4); insert into public.ai_thread_totals values ((now() at time zone 'UTC')::date,7)",
  );
  await as(stranger);
  const overview = await rpc("overview");
  assert.deepEqual(overview.pakoToday, { requests: 4, threadReads: 7 });
  assert.equal(overview.deals.cancelled, 1);
});
