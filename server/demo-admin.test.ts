import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import {
  adminActions,
  adminIllustrations,
  adminMeetingPoints,
  demoAdminHeader,
  type AdminAction,
  type AdminInput,
  type AdminOutput,
} from "../shared/admin.ts";
import { acceptMessage, cantMakeItMessage, offerMessage } from "../shared/dealMessages.ts";
import type { DealTerms } from "../shared/deal.ts";
import { formatPickup } from "../shared/pickupTime.ts";
import { createListingsStore } from "./database.ts";
import { createAgentServer } from "./http.ts";
import { createMessagesStore } from "./messages.ts";
import { createAgentService } from "./service.ts";

const why = { reason: "Reviewed the demo" };
const draft = {
  title: "Stackable chairs",
  description: "A pair",
  price: 19.5,
  condition: "Good",
  location: "Lausanne",
  meetingPoint: adminMeetingPoints[0],
  image: adminIllustrations[0],
  pickup: "Weekday afternoons",
  pickupBy: "2027-01-01",
  status: "active",
} as const;

async function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "takeover-admin-test-"));
  const dbPath = join(directory, "marketplace.sqlite");
  const listings = createListingsStore(dbPath);
  const messages = createMessagesStore(dbPath);
  listings.seedDemo();
  const server = createAgentServer(
    createAgentService({
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-flash",
    }),
    {
      listings,
      messages,
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise<void>((done) => server.close(() => done()));
    messages.close();
    listings.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  function request(path: string, input?: unknown, headers?: HeadersInit) {
    return fetch(base + path, {
      method: input === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: input === undefined ? undefined : JSON.stringify(input),
    });
  }
  function admin(action: AdminAction, input?: unknown, enabled = true) {
    return request(
      `/api/admin/${action.replaceAll("_", "-")}`,
      input,
      enabled ? { [demoAdminHeader]: "1" } : {},
    );
  }
  async function call<A extends AdminAction>(
    action: A,
    input: AdminInput<A>,
  ): Promise<AdminOutput<A>> {
    const response = await admin(action, input ?? undefined);
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    return adminActions[action].output.parse(body) as AdminOutput<A>;
  }
  async function error(
    response: Promise<Response>,
    status: number,
    code: string,
  ) {
    const res = await response;
    const body = await res.json();
    assert.equal(res.status, status, JSON.stringify(body));
    assert.equal(body.error.code, code);
  }
  return { dbPath, listings, admin, call, error, request };
}

test("local admin routes all require Developer mode and validate requests", async (t) => {
  const { admin, error, request } = await setup(t);
  for (const action of Object.keys(adminActions) as AdminAction[]) {
    const read = adminActions[action].input.safeParse(null).success;
    await error(
      admin(action, read ? undefined : {}, false),
      403,
      "admin_required",
    );
  }
  await error(admin("save_demo_listing", {}), 400, "admin_invalid_input");
  await error(admin("save_demo_listing"), 405, "METHOD_NOT_ALLOWED");
  await error(
    request("/api/admin/overview", undefined, {
      origin: "https://other.example",
      [demoAdminHeader]: "1",
    }),
    403,
    "ORIGIN_NOT_ALLOWED",
  );
});

test("demo admin saves listings and seller notes, hides and restores, and resets after reopening SQLite", async (t) => {
  const { admin, call, dbPath, error, request, listings } = await setup(t);
  const original = await call("list_demo_listings", null);
  assert.equal(original.length, 40);
  assert.equal((await call("list_demo_sellers", null)).length, 6);
  const seller = await call("save_demo_seller", {
    name: "Alix",
    styleNote: "",
  });
  const added = await call("save_demo_listing", {
    ...draft,
    sellerId: seller.id,
  });
  const edited = await call("save_demo_listing", {
    ...draft,
    sellerId: seller.id,
    id: added.id,
    title: "Side table",
    meetingPoint: "",
    status: "reserved",
  });
  assert.equal(edited.title, "Side table");
  assert.equal(edited.status, "reserved");
  assert.equal(edited.meetingPoint, "");
  const renamed = await call("save_demo_seller", {
    id: seller.id,
    name: "Camille",
    styleNote: "Short sentences",
  });
  assert.deepEqual(renamed, {
    id: seller.id,
    name: "Camille",
    styleNote: "Short sentences",
    listingIds: [added.id],
  });
  await error(
    admin("save_demo_listing", {
      ...draft,
      sellerId: seller.id,
      image: "/samples/nope.svg",
    }),
    400,
    "admin_invalid_input",
  );

  await call("set_listing_hidden", { id: added.id, hidden: true, ...why });
  assert.equal((await call("overview", null)).listings.hidden, 1);
  assert.equal(
    (await call("list_demo_listings", null)).find(({ id }) => id === added.id)
      ?.hidden,
    true,
  );
  assert.equal(
    (await (await request("/api/listings")).json()).listings.length,
    40,
  );
  await call("set_listing_hidden", { id: added.id, hidden: false, ...why });
  const product = listings.listDemo().find(({ id }) => id === added.id)!;
  assert.equal(product.seller, "Camille");
  assert.equal(
    listings
      .updateDemo([{ ...product, status: "sold" }])
      .find(({ id }) => id === added.id)?.status,
    "sold",
  );

  const shipped = original[0];
  await call("save_demo_listing", {
    ...draft,
    id: shipped.id,
    sellerId: shipped.sellerId,
    meetingPoint: "",
  });
  const reopened = createListingsStore(dbPath);
  try {
    reopened.seedDemo();
    assert.equal(
      reopened.listDemo().find(({ id }) => id === shipped.id)?.location,
      "Lausanne",
    );
    assert.equal(
      reopened.admin.list_demo_sellers().find(({ id }) => id === seller.id)
        ?.styleNote,
      "Short sentences",
    );
  } finally {
    reopened.close();
  }
  assert.deepEqual(await call("reset_demo", why), { listings: 40, sellers: 6 });
  assert.deepEqual(await call("list_demo_listings", null), original);
  assert.equal((await call("list_demo_sellers", null)).length, 6);
  assert.deepEqual(
    (await call("list_moderation_log", null)).map(({ action }) => action),
    ["reset_demo", "restore_listing", "hide_listing"],
  );
});

test("demo moderation persists reports and workspace blocks and exposes usage", async (t) => {
  const { call, request, error, listings } = await setup(t);
  const listing = listings.listDemo()[0];
  const workspace = { "X-Message-Workspace": randomUUID() };
  const message = {
    messageId: randomUUID(),
    listingId: listing.id,
    title: listing.title,
    seller: listing.seller,
    sender: "buyer",
    text: "When can I collect it?",
  };
  assert.equal(
    (await request("/api/messages", message, workspace)).status,
    200,
  );
  await error(
    request(
      "/api/reports",
      { kind: "message", id: message.messageId, ...why },
      {
        "X-Message-Workspace": randomUUID(),
      },
    ),
    404,
    "admin_report_missing",
  );
  const reportListing = await request(
    "/api/reports",
    { kind: "listing", id: listing.id, ...why },
    workspace,
  );
  assert.equal(reportListing.status, 200);
  const reportMessage = await request(
    "/api/reports",
    { kind: "message", id: message.messageId, ...why },
    workspace,
  );
  assert.equal(reportMessage.status, 200);
  const reports = await call("list_reports", null);
  assert.equal(reports.length, 2);
  assert.equal(
    reports.find(({ target }) => target.kind === "listing")?.studentId,
    null,
  );
  const reported = reports.find(({ target }) => target.kind === "message")!;
  assert.equal(reported.studentId, workspace["X-Message-Workspace"]);
  assert.equal(reported.target.kind === "message" && reported.target.listingTitle, listing.title);
  assert.equal(
    reported.target.kind === "message" && reported.target.body,
    message.text,
  );
  const overview = await call("overview", null);
  assert.equal(overview.reportsOpen, 2);
  assert.equal(overview.conversations, 1);

  const studentId = workspace["X-Message-Workspace"];
  assert.equal(
    (await request("/api/listings/permission", undefined, workspace)).status,
    200,
  );
  await call("set_student_blocked", { studentId, blocked: true, ...why });
  await error(
    request("/api/listings/permission", undefined, workspace),
    403,
    "admin_student_blocked",
  );
  assert.equal((await call("list_blocks", null))[0].studentId, studentId);
  await error(
    request(
      "/api/messages",
      { ...message, messageId: randomUUID() },
      workspace,
    ),
    403,
    "admin_student_blocked",
  );
  await call("set_student_blocked", { studentId, blocked: false, ...why });
  assert.equal(
    (await request("/api/listings/permission", undefined, workspace)).status,
    200,
  );
  assert.deepEqual(await call("list_blocks", null), []);
  await call("set_listing_hidden", { id: listing.id, hidden: true, ...why });
  await error(
    request(
      "/api/messages",
      { ...message, messageId: randomUUID() },
      workspace,
    ),
    409,
    "admin_listing_hidden",
  );
  const resolution = await call("resolve_report", { id: reported.id, ...why });
  assert.deepEqual(
    await call("resolve_report", { id: reported.id, ...why }),
    resolution,
  );
  assert.equal((await call("overview", null)).reportsOpen, 1);
  assert.equal((await call("list_moderation_log", null)).length, 4);

  await call("set_listing_hidden", { id: listing.id, hidden: false, ...why });
  const replyId = randomUUID();
  assert.equal((await request("/api/messages", {
    ...message, sender: "seller", messageId: replyId, text: "This afternoon works.",
  }, workspace)).status, 200);
  assert.equal((await request("/api/reports", {
    id: replyId, kind: "message", ...why,
  }, workspace)).status, 200);
  const replyReport = (await call("list_reports", null)).find(({ target }) => target.id === replyId);
  assert.equal(replyReport?.studentId, null);
  assert.equal(replyReport?.target.kind === "message" && replyReport.target.listingTitle, listing.title);

  listings.admin.countPako(true);
  listings.admin.countPako(false);
  assert.deepEqual((await call("overview", null)).pakoToday, {
    requests: 1,
    threadReads: 1,
  });
});

test("demo hide and reset protect agreed deals and preserve them while a workspace is blocked", async (t) => {
  const { admin, call, error, listings, request } = await setup(t);
  const listing = listings.listDemo()[0];
  const workspace = { "X-Message-Workspace": randomUUID() };
  const pickupAt = new Date(Date.now() + 90 * 60_000).toISOString();
  const terms: DealTerms = {
    amount: 30, fulfillment: "pickup", pickupAt,
    pickupTime: formatPickup(pickupAt), pickupPoint: "Atrium",
  };
  const steps = [
    { actor: "buyer", action: { type: "propose", terms }, body: offerMessage(listing.title, terms) },
    { actor: "seller", action: { type: "accept", terms }, body: acceptMessage("seller", terms) },
  ];
  for (const [version, step] of steps.entries()) {
    const response = await request(
      "/api/messages/deal",
      {
        listingId: listing.id,
        title: listing.title,
        seller: listing.seller,
        text: step.body,
        sender: step.actor,
        messageId: randomUUID(),
        action: step.action,
        expectedVersion: version,
        listingStatus: "active",
      },
      workspace,
    );
    assert.equal(response.status, 200, await response.text());
  }
  assert.equal((await call("overview", null)).deals.agreed, 1);
  const update = (changes: object) => request(
    "/api/listings/demo/update", { listings: [{ ...listing, status: "reserved", ...changes }] }, workspace,
  );
  await error(update({ status: "active" }), 409, "listing_deal_agreed");
  assert.equal((await update({})).status, 200);
  for (const status of ["active", "sold", "withdrawn"])
    await error(update({ status }), 409, "listing_deal_agreed");
  const inbox = async () => (await (await request("/api/messages", undefined, workspace)).json()).conversations[0];
  const before = await inbox();
  assert.equal(before.deal.status, "agreed");
  assert.equal(before.deal.outcome, null);
  assert.equal(before.messages.length, 2);
  const cancellation = {
    listingId: listing.id, title: listing.title, seller: listing.seller,
    text: cantMakeItMessage(), sender: "seller", messageId: randomUUID(),
    expectedVersion: 2, listingStatus: "reserved",
  };
  const cancelPickup = () => request("/api/messages/pickup", {
    ...cancellation, action: { type: "cancel_pickup", reason: "cant_make_it" },
  }, workspace);
  await error(
    admin("set_listing_hidden", { id: listing.id, hidden: true, ...why }),
    409,
    "admin_deal_agreed",
  );
  await error(admin("reset_demo", why), 409, "admin_deal_agreed");
  await call("set_student_blocked", {
    studentId: workspace["X-Message-Workspace"],
    blocked: true,
    ...why,
  });
  assert.equal((await call("overview", null)).deals.agreed, 1);
  assert.equal((await call("overview", null)).listings.hidden, 0);
  await error(update({ title: "Changed while blocked" }), 403, "admin_student_blocked");
  await error(cancelPickup(), 403, "admin_student_blocked");
  await error(request("/api/messages/deal", {
    ...cancellation, action: { type: "cancel", reason: "cant_make_it" },
  }, workspace), 403, "admin_student_blocked");
  assert.deepEqual(await inbox(), before);
  await call("set_student_blocked", {
    studentId: workspace["X-Message-Workspace"], blocked: false, ...why,
  });
  const response = await cancelPickup();
  assert.equal(response.status, 200, await response.text());
  const after = await inbox();
  assert.equal(after.messages.at(-1).text, cancellation.text);
  assert.equal(after.messages.at(-1).pickupEvent.kind, "pickup_cancelled");
  assert.equal(after.deal.outcome.kind, "cancelled");
  assert.equal((await update({ status: "withdrawn" })).status, 200);
});
