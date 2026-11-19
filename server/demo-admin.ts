import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  adminErrors,
  adminOverviewSchema,
  type AdminErrorKey,
  type AdminInput,
  type AdminListing,
  type AdminReport,
  type ModerationAction,
} from "../shared/admin.ts";
import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import { demoListings } from "../shared/demoListings.ts";
import { demoSellers } from "../shared/demoSellers.ts";
import type { Product } from "../shared/marketplace.ts";
import type { SellerConversation } from "../shared/messages.ts";
import { AgentError } from "./errors.ts";

export function adminFailure(code: AdminErrorKey, status: number) {
  return new AgentError(status, code, adminErrors[code]);
}

export function initializeDemoModeration(db: DatabaseSync) {
  db.exec(`
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS demo_listing_admin (
      id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0,
      edited INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS demo_student_blocks (
      student_id TEXT PRIMARY KEY, reason TEXT NOT NULL, at TEXT NOT NULL
    );
  `);
}

export function checkDemoStudent(db: DatabaseSync, workspace: string) {
  if (
    db
      .prepare("SELECT 1 FROM demo_student_blocks WHERE student_id=?")
      .get(workspace)
  )
    throw adminFailure("admin_student_blocked", 403);
}

export function checkDemoContact(
  db: DatabaseSync,
  workspace: string,
  listingId: string,
) {
  checkDemoStudent(db, workspace);
  if (
    db
      .prepare("SELECT 1 FROM demo_listing_admin WHERE id=? AND hidden=1")
      .get(listingId)
  )
    throw adminFailure("admin_listing_hidden", 409);
}

function conversationsExist(db: DatabaseSync) {
  return Boolean(db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='conversations'",
  ).get());
}

export function hasAgreedDemoDeal(db: DatabaseSync, listingId?: string) {
  if (!conversationsExist(db)) return false;
  return Boolean(db.prepare(`
    SELECT 1 FROM conversations c JOIN listings l ON l.id=c.listing_id AND l.demo=1
    WHERE json_extract(c.payload,'$.deal.status')='agreed'
      AND json_extract(c.payload,'$.deletedAt') IS NULL AND (? IS NULL OR l.id=?)
    LIMIT 1
  `).get(listingId ?? null, listingId ?? null));
}

export function createDemoAdmin(
  db: DatabaseSync,
  write: <T>(work: () => T) => T,
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demo_sellers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, style_note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS demo_reports (
      id TEXT PRIMARY KEY, reporter_id TEXT NOT NULL, student_id TEXT,
      reason TEXT NOT NULL, created_at TEXT NOT NULL, resolved_at TEXT,
      target TEXT NOT NULL CHECK(json_valid(target))
    );
    CREATE TABLE IF NOT EXISTS demo_moderation_log (
      id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT, reason TEXT NOT NULL, at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_pako_totals (
      day TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0, thread_reads INTEGER NOT NULL DEFAULT 0
    );
  `);

  const shippedSellerIds = new Map<string, string>(
    demoSellers.map(({ id, name }) => [name, id]),
  );
  const associate = db.prepare(
    "INSERT INTO demo_listing_admin(id,seller_id) VALUES(?,?) ON CONFLICT(id) DO NOTHING",
  );
  function seedSellers() {
    const insert = db.prepare(
      "INSERT INTO demo_sellers(id,name) VALUES(?,?) ON CONFLICT(id) DO NOTHING",
    );
    for (const seller of demoSellers) insert.run(seller.id, seller.name);
    for (const listing of demoListings) {
      const seller = shippedSellerIds.get(listing.seller);
      if (!seller) throw new Error(`No demo seller named ${listing.seller}.`);
      associate.run(listing.id, seller);
    }
  }
  write(seedSellers);

  const readListing = db.prepare(`
    SELECT l.payload,a.seller_id,a.hidden FROM listings l
    JOIN demo_listing_admin a ON l.id=a.id WHERE l.id=? AND l.demo=1
  `);
  function listingJson(row: {
    payload?: unknown;
    seller_id?: unknown;
    hidden?: unknown;
  }): AdminListing {
    const item: Product = JSON.parse(String(row.payload));
    return {
      id: item.id,
      sellerId: String(row.seller_id),
      title: item.title,
      description: item.description,
      price: item.price,
      location: item.location,
      condition: item.condition,
      meetingPoint: campusPickupPoints.some(
        ({ name }) => name === item.pickupPoint?.name,
      )
        ? item.pickupPoint!.name
        : "",
      pickup: item.available,
      pickupBy: item.pickupBy,
      image: item.image,
      status: item.status,
      hidden: Boolean(row.hidden),
    };
  }
  function listListings() {
    return db
      .prepare(
        `
      SELECT l.payload,a.seller_id,a.hidden FROM listings l JOIN demo_listing_admin a ON l.id=a.id
      WHERE l.demo=1 ORDER BY l.rowid
    `,
      )
      .all()
      .map(listingJson);
  }

  function sellerJson(row: {
    id?: unknown;
    name?: unknown;
    style_note?: unknown;
  }) {
    const id = String(row.id);
    return {
      id,
      name: String(row.name),
      styleNote: String(row.style_note),
      listingIds: db
        .prepare(
          `
        SELECT l.id FROM listings l JOIN demo_listing_admin a ON l.id=a.id
        WHERE l.demo=1 AND a.seller_id=? ORDER BY l.rowid
      `,
        )
        .all(id)
        .map((listing) => String(listing.id)),
    };
  }
  const findSeller = db.prepare(
    "SELECT id,name,style_note FROM demo_sellers WHERE id=?",
  );
  function requireNoDeal(id?: string) {
    if (hasAgreedDemoDeal(db, id)) throw adminFailure("admin_deal_agreed", 409);
  }
  function log(action: ModerationAction, id: string | null, reason: string) {
    db.prepare("INSERT INTO demo_moderation_log VALUES(?,?,?,?,?,?)").run(
      randomUUID(),
      "demo-developer",
      action,
      id,
      reason,
      new Date().toISOString(),
    );
  }
  function isKnownWorkspace(id: string) {
    return (
      (conversationsExist(db) &&
        db.prepare("SELECT 1 FROM conversations WHERE workspace=?").get(id)) ||
      db.prepare("SELECT 1 FROM demo_reports WHERE reporter_id=?").get(id)
    );
  }
  function listingTarget(
    row: NonNullable<ReturnType<typeof readListing.get>>,
  ): AdminReport["target"] {
    const { id, title, description, hidden } = listingJson(row);
    return { kind: "listing", id, title, description, hidden };
  }

  return {
    list_demo_listings: listListings,
    save_demo_listing(input: AdminInput<"save_demo_listing">) {
      return write(() => {
        const seller = findSeller.get(input.sellerId);
        if (!seller) throw adminFailure("admin_seller_missing", 404);
        const id = input.id ?? randomUUID();
        const row = input.id ? readListing.get(id) : undefined;
        if (input.id && !row) throw adminFailure("admin_listing_missing", 404);
        if (row && row.seller_id !== input.sellerId)
          throw adminFailure("admin_invalid_input", 400);
        const before: Product | undefined = row
          ? JSON.parse(String(row.payload))
          : undefined;
        if (before && before.status !== input.status) requireNoDeal(id);
        const point = campusPickupPoints.find(
          ({ name }) => name === input.meetingPoint,
        );
        const name = String(seller.name);
        const listing: Product = {
          id,
          title: input.title,
          description: input.description,
          price: input.price,
          location: input.location,
          condition: input.condition,
          category: before?.category ?? "All",
          image: input.image,
          ...(point ? { pickupPoint: point } : {}),
          distance: before?.distance ?? 0,
          dimensions: before?.dimensions ?? "",
          ...(before?.tags ? { tags: before.tags } : {}),
          seller: name,
          initials: name.slice(0, 1).toUpperCase(),
          source: "takeover",
          available: input.pickup,
          pickupBy: input.pickupBy,
          status: input.status,
          own: true,
          demo: true,
        };
        associate.run(id, input.sellerId);
        db.prepare("UPDATE demo_listing_admin SET edited=1 WHERE id=?").run(id);
        db.prepare(
          `
          INSERT INTO listings(id,demo,payload) VALUES(?,1,?)
          ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
        `,
        ).run(id, JSON.stringify(listing));
        return listingJson({
          payload: JSON.stringify(listing),
          seller_id: input.sellerId,
          hidden: row?.hidden,
        });
      });
    },
    set_listing_hidden({
      id,
      hidden,
      reason,
    }: AdminInput<"set_listing_hidden">) {
      return write(() => {
        const row = readListing.get(id);
        if (!row) throw adminFailure("admin_listing_missing", 404);
        if (hidden !== Boolean(row.hidden)) {
          if (hidden) requireNoDeal(id);
          db.prepare("UPDATE demo_listing_admin SET hidden=? WHERE id=?").run(
            Number(hidden),
            id,
          );
          log(hidden ? "hide_listing" : "restore_listing", id, reason);
        }
        return { id, hidden };
      });
    },
    reset_demo({ reason }: AdminInput<"reset_demo">) {
      return write(() => {
        requireNoDeal();
        db.exec(`
          UPDATE demo_listing_admin SET hidden=1;
          DELETE FROM listings WHERE demo=1;
          DELETE FROM demo_sellers;
        `);
        seedSellers();
        const insert = db.prepare(
          "INSERT INTO listings(id,demo,payload) VALUES(?,1,?)",
        );
        const restore = db.prepare(
          "UPDATE demo_listing_admin SET hidden=0, edited=0 WHERE id=?",
        );
        for (const listing of demoListings) {
          insert.run(listing.id, JSON.stringify(listing));
          restore.run(listing.id);
        }
        log("reset_demo", null, reason);
        return { listings: demoListings.length, sellers: demoSellers.length };
      });
    },
    list_demo_sellers() {
      return db
        .prepare("SELECT * FROM demo_sellers ORDER BY name,id")
        .all()
        .map(sellerJson);
    },
    save_demo_seller(input: AdminInput<"save_demo_seller">) {
      return write(() => {
        const id = input.id ?? randomUUID();
        if (input.id && !findSeller.get(id))
          throw adminFailure("admin_seller_missing", 404);
        db.prepare(
          `
          INSERT INTO demo_sellers(id,name,style_note) VALUES(?,?,?)
          ON CONFLICT(id) DO UPDATE SET name=excluded.name,style_note=excluded.style_note
        `,
        ).run(id, input.name, input.styleNote);
        db.prepare(
          `
          UPDATE listings SET payload=json_set(payload,'$.seller',?,'$.initials',?)
          WHERE demo=1 AND id IN (SELECT id FROM demo_listing_admin WHERE seller_id=?)
        `,
        ).run(input.name, input.name.slice(0, 1).toUpperCase(), id);
        db.prepare(
          "UPDATE demo_listing_admin SET edited=1 WHERE seller_id=?",
        ).run(id);
        return sellerJson({
          id,
          name: input.name,
          style_note: input.styleNote,
        });
      });
    },
    list_reports(): AdminReport[] {
      return db
        .prepare(
          `
        SELECT * FROM demo_reports ORDER BY resolved_at IS NOT NULL, created_at DESC,id
      `,
        )
        .all()
        .map((row) => {
          let target = JSON.parse(String(row.target)) as AdminReport["target"];
          let studentId = row.student_id ? String(row.student_id) : null;
          if (target.kind === "listing") {
            const current = readListing.get(target.id);
            target = current ? listingTarget(current) : { ...target, hidden: true };
          } else if (target.listingTitle === undefined) {
            // Older reports stored the workspace even for simulated seller replies.
            const conversationRow = conversationsExist(db) && db.prepare(
              "SELECT payload FROM conversations WHERE id=?",
            ).get(target.conversationId);
            const conversation: SellerConversation | undefined = conversationRow
              ? JSON.parse(String(conversationRow.payload))
              : undefined;
            const messageId = target.id;
            const sender = conversation?.messages.find(({ id }) => id === messageId)?.sender;
            studentId = sender === "buyer" ? studentId : null;
            const listing = readListing.get(target.listingId);
            target = { ...target, listingTitle: listing ? listingJson(listing).title : conversation?.title };
          }
          return {
            id: String(row.id),
            reporterId: String(row.reporter_id),
            studentId,
            reason: String(row.reason),
            createdAt: String(row.created_at),
            resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
            target,
          };
        });
    },
    resolve_report({ id, reason }: AdminInput<"resolve_report">) {
      return write(() => {
        const row = db
          .prepare("SELECT resolved_at FROM demo_reports WHERE id=?")
          .get(id);
        if (!row) throw adminFailure("admin_report_missing", 404);
        if (row.resolved_at) return { id, resolvedAt: String(row.resolved_at) };
        const resolvedAt = new Date().toISOString();
        db.prepare("UPDATE demo_reports SET resolved_at=? WHERE id=?").run(
          resolvedAt,
          id,
        );
        log("resolve_report", id, reason);
        return { id, resolvedAt };
      });
    },
    list_blocks() {
      return db
        .prepare(
          "SELECT * FROM demo_student_blocks ORDER BY at DESC,student_id",
        )
        .all()
        .map((row) => ({
          studentId: String(row.student_id),
          name: null,
          reason: String(row.reason),
          at: String(row.at),
        }));
    },
    set_student_blocked({
      studentId,
      blocked,
      reason,
    }: AdminInput<"set_student_blocked">) {
      return write(() => {
        if (!isKnownWorkspace(studentId))
          throw adminFailure("admin_student_missing", 404);
        const result = blocked
          ? db
              .prepare(
                "INSERT INTO demo_student_blocks VALUES(?,?,?) ON CONFLICT DO NOTHING",
              )
              .run(studentId, reason, new Date().toISOString())
          : db
              .prepare("DELETE FROM demo_student_blocks WHERE student_id=?")
              .run(studentId);
        if (result.changes)
          log(blocked ? "block_student" : "unblock_student", studentId, reason);
        return { studentId, blocked };
      });
    },
    list_moderation_log() {
      return db
        .prepare("SELECT * FROM demo_moderation_log ORDER BY rowid DESC")
        .all()
        .map((row) => ({
          id: String(row.id),
          adminId: String(row.admin_id),
          action: String(row.action),
          targetId: row.target_id ? String(row.target_id) : null,
          reason: String(row.reason),
          at: String(row.at),
        }));
    },
    overview() {
      const report = adminOverviewSchema.parse({
        listings: { active: 0, reserved: 0, sold: 0, withdrawn: 0, hidden: 0 },
        conversations: 0,
        deals: { open: 0, agreed: 0, completed: 0, cancelled: 0 },
        reportsOpen: db
          .prepare(
            "SELECT count(*) AS count FROM demo_reports WHERE resolved_at IS NULL",
          )
          .get()?.count,
        pakoToday: { requests: 0, threadReads: 0 },
      });
      for (const listing of listListings())
        report.listings[listing.hidden ? "hidden" : listing.status]++;
      if (conversationsExist(db)) {
        for (const row of db
          .prepare(
            "SELECT payload FROM conversations WHERE json_extract(payload,'$.deletedAt') IS NULL",
          )
          .all()) {
          const conversation: SellerConversation = JSON.parse(
            String(row.payload),
          );
          report.conversations++;
          if (conversation.deal) report.deals[conversation.deal.status]++;
        }
      }
      const totals = db
        .prepare("SELECT * FROM demo_pako_totals WHERE day=date('now')")
        .get();
      if (totals)
        report.pakoToday = {
          requests: Number(totals.requests),
          threadReads: Number(totals.thread_reads),
        };
      return report;
    },
    checkPosting(workspace: string) {
      checkDemoStudent(db, workspace);
    },
    countPako(thread: boolean) {
      db.prepare(
        `
        INSERT INTO demo_pako_totals(day,requests,thread_reads) VALUES(date('now'),?,?)
        ON CONFLICT(day) DO UPDATE SET requests=requests+excluded.requests,thread_reads=thread_reads+excluded.thread_reads
      `,
      ).run(Number(!thread), Number(thread));
    },
    submitReport(
      workspace: string,
      input: { id: string; kind: "listing" | "message"; reason: string },
    ) {
      return write(() => {
        let target: AdminReport["target"] | undefined;
        let studentId: string | null = null;
        if (input.kind === "listing") {
          const row = readListing.get(input.id);
          if (row && !row.hidden) target = listingTarget(row);
        } else if (conversationsExist(db)) {
          const rows = db
            .prepare("SELECT payload FROM conversations WHERE workspace=?")
            .all(workspace);
          for (const row of rows) {
            const conversation: SellerConversation = JSON.parse(
              String(row.payload),
            );
            const message =
              !conversation.deletedAt &&
              conversation.messages.find(({ id }) => id === input.id);
            if (!message) continue;
            target = {
              kind: "message",
              id: message.id,
              conversationId: conversation.id,
              listingId: conversation.listingId,
              listingTitle: conversation.title,
              body: message.text,
            };
            studentId = message.sender === "buyer" ? workspace : null;
            break;
          }
        }
        if (!target) throw adminFailure("admin_report_missing", 404);
        const id = randomUUID();
        db.prepare(
          `
          INSERT INTO demo_reports(id,reporter_id,student_id,reason,created_at,target) VALUES(?,?,?,?,?,?)
        `,
        ).run(
          id,
          workspace,
          studentId,
          input.reason,
          new Date().toISOString(),
          JSON.stringify(target),
        );
        return { id };
      });
    },
  };
}
