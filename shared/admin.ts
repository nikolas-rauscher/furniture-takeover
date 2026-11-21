import { z } from "zod";
import { demoListings } from "./demoListings.ts";
import { campusPickupPoints } from "./campusPickupPoints.ts";

export const adminIllustrations = [
  ...new Set(demoListings.map(({ image }) => image)),
].sort();
export const adminMeetingPoints: readonly string[] = campusPickupPoints.map(
  ({ name }) => name,
);

const id = z.string().min(1).max(120);
const reason = z.string().trim().min(1).max(1000);
const listingStatus = z.enum(["active", "reserved", "sold", "withdrawn"]);
const count = z.number().int().nonnegative();
const timestamp = z.string();
const note = z.string().trim().max(1000);
const meetingPoint = z
  .string()
  .refine((name) => name === "" || adminMeetingPoints.includes(name));
const pickupBy = z.union([z.literal(""), z.iso.date()]);
const listingFields = {
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(4000),
  price: z.number().min(0).max(1_000_000).multipleOf(0.01),
  condition: z.string().trim().max(180),
  location: z.string().trim().min(1).max(180),
  meetingPoint,
  pickup: z.string().trim().max(300),
  pickupBy,
  status: listingStatus,
};
const demoListingSchema = z
  .object({
    ...listingFields,
    status: listingStatus.exclude(["withdrawn"]),
    image: z.string().refine((image) => adminIllustrations.includes(image)),
    sellerId: z.uuid(),
  })
  .strict();
const adminListing = z.object({
  ...listingFields,
  id,
  sellerId: z.uuid(),
  image: z.string(),
  hidden: z.boolean(),
});
const demoSellerSchema = z
  .object({ name: z.string().trim().min(1).max(80), styleNote: note })
  .strict();
const adminSeller = demoSellerSchema.extend({
  id: z.uuid(),
  listingIds: z.array(id),
});
const adminBlock = z.object({
  studentId: z.uuid(),
  name: z.string().nullable(),
  reason,
  at: timestamp,
});
const reportTarget = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("listing"),
    id,
    title: z.string(),
    description: z.string(),
    hidden: z.boolean(),
  }),
  z.object({
    kind: z.literal("message"),
    id,
    conversationId: id,
    listingId: id,
    listingTitle: z.string().optional(),
    body: z.string(),
  }),
]);
const adminReport = z.object({
  id: z.uuid(),
  reporterId: z.uuid(),
  studentId: z.uuid().nullable(),
  reason,
  createdAt: timestamp,
  resolvedAt: timestamp.nullable(),
  target: reportTarget,
});
const moderationActions = z.enum([
  "hide_listing",
  "restore_listing",
  "block_student",
  "unblock_student",
  "resolve_report",
  "reset_demo",
]);
const moderationEntry = z.object({
  id: z.uuid(),
  adminId: z.string(),
  action: moderationActions,
  targetId: id.nullable(),
  reason,
  at: timestamp,
});
export const adminOverviewSchema = z.object({
  listings: z.object({
    active: count,
    reserved: count,
    sold: count,
    withdrawn: count,
    hidden: count,
  }),
  conversations: count,
  deals: z.object({
    open: count,
    agreed: count,
    completed: count,
    cancelled: count,
  }),
  reportsOpen: count,
  pakoToday: z.object({ requests: count, threadReads: count }),
});

export const demoReportSchema = z
  .object({ id, kind: z.enum(["listing", "message"]), reason })
  .strict();
export const demoAdminHeader = "X-Takeover-Developer-Mode";

export const adminActions = {
  list_demo_listings: { input: z.null(), output: z.array(adminListing) },
  save_demo_listing: {
    input: demoListingSchema.extend({ id: id.optional() }),
    output: adminListing,
  },
  set_listing_hidden: {
    input: z.object({ id, hidden: z.boolean(), reason }).strict(),
    output: z.object({ id, hidden: z.boolean() }),
  },
  reset_demo: {
    input: z.object({ reason }).strict(),
    output: z.object({ listings: count, sellers: count }),
  },
  list_demo_sellers: { input: z.null(), output: z.array(adminSeller) },
  save_demo_seller: {
    input: demoSellerSchema.extend({ id: z.uuid().optional() }),
    output: adminSeller,
  },
  list_reports: { input: z.null(), output: z.array(adminReport) },
  resolve_report: {
    input: z.object({ id: z.uuid(), reason }).strict(),
    output: z.object({ id: z.uuid(), resolvedAt: timestamp }),
  },
  list_blocks: { input: z.null(), output: z.array(adminBlock) },
  set_student_blocked: {
    input: z
      .object({ studentId: z.uuid(), blocked: z.boolean(), reason })
      .strict(),
    output: z.object({ studentId: z.uuid(), blocked: z.boolean() }),
  },
  list_moderation_log: { input: z.null(), output: z.array(moderationEntry) },
  overview: { input: z.null(), output: adminOverviewSchema },
} as const;

export type AdminAction = keyof typeof adminActions;
export type AdminInput<A extends AdminAction> = z.infer<
  (typeof adminActions)[A]["input"]
>;
export type AdminOutput<A extends AdminAction> = z.infer<
  (typeof adminActions)[A]["output"]
>;
export type AdminListing = z.infer<typeof adminListing>;
export type AdminReport = z.infer<typeof adminReport>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type ModerationAction = z.infer<typeof moderationActions>;

export const adminErrors = {
  admin_required: "Administrator access is required.",
  admin_unavailable: "Admin tools are unavailable in this session.",
  admin_invalid_input: "Check the admin action details.",
  admin_invalid_response: "The admin service returned an invalid response.",
  admin_listing_missing: "This listing could not be found.",
  admin_seller_missing: "This demo seller could not be found.",
  admin_student_missing: "This student could not be found.",
  admin_report_missing: "This report could not be found.",
  admin_deal_agreed:
    "Finish or cancel the agreed deal before changing this listing.",
  admin_seed_conflict: "A shipped demo ID or email is already in use.",
  admin_student_blocked:
    "This student cannot create listings or send messages.",
  admin_listing_hidden: "This listing is hidden.",
} as const;
export type AdminErrorKey = keyof typeof adminErrors;

export function isAdminAction(value: string): value is AdminAction {
  return Object.hasOwn(adminActions, value);
}

export function isAdminErrorKey(value: string): value is AdminErrorKey {
  return Object.hasOwn(adminErrors, value);
}
