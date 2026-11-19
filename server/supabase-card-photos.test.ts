import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, type TestContext } from "node:test";
import { adminIllustrations } from "../shared/admin.ts";
import {
  adminMigration,
  applyMigrations,
  buyer,
  dealRulesMigration,
  marketplace,
  pickupMigration,
  reviewMigration,
  seller,
  stranger,
} from "./supabase-fixture.ts";

const cardPhotosMigration = "202611200003_card_photos.sql";
const why = { reason: "Reviewed with the marketplace team" };
const upload = (owner: string, extension = "jpg") =>
  `${owner}/${randomUUID()}.${extension}`;

async function setup(t: TestContext) {
  const fixture = await marketplace();
  t.after(() => fixture.db.close());
  await fixture.db.exec("reset role");
  await applyMigrations(fixture.db, [
    pickupMigration,
    adminMigration,
    reviewMigration,
    dealRulesMigration,
    cardPhotosMigration,
  ]);
  await fixture.as(seller);
  const insertListing = (images: string[], cardImages: string[]) =>
    fixture.db.query<{ id: string }>(
      "insert into public.listings(title,price,location,images,card_images) values('Lamp',10,'Renens',$1,$2) returning id",
      [images, cardImages],
    );
  return { ...fixture, insertListing };
}

test("a seller stores one card photo per uploaded photo in their own folder", async (t) => {
  const { db, insertListing } = await setup(t);
  const images = [upload(seller), upload(seller, "png")];
  const cardImages = [upload(seller), upload(seller)];
  const { id } = (await insertListing(images, cardImages)).rows[0];
  const replacement = [upload(seller)];
  await db.query(
    "update public.listings set images=$1,card_images=$2 where id=$3",
    [replacement, [upload(seller, "webp")], id],
  );
  const { rows } = await db.query<{ card_images: string[] }>(
    "select card_images from public.listings where id=$1",
    [id],
  );
  assert.equal(rows[0].card_images.length, replacement.length);
});

test("card photos must pair with the photos and follow the upload rules", async (t) => {
  const { insertListing } = await setup(t);
  const images = [upload(seller), upload(seller)];
  for (const cardImages of [
    [upload(seller)],
    [upload(seller), upload(buyer)],
    [upload(seller), upload(seller, "gif")],
    [upload(seller), `${seller}/card-photo.jpg`],
    [upload(seller), "/samples/desk.svg"],
  ])
    await assert.rejects(insertListing(images, cardImages), /Invalid card photo/);
  await assert.rejects(insertListing([], [upload(seller)]), /Invalid card photo list/);
});

test("listings saved before card photos keep working without them", async (t) => {
  const { db, as, listing } = await setup(t);
  await as(seller);
  await db.query("update public.listings set title='Office chair' where id=$1", [
    listing,
  ]);
  const { rows } = await db.query<{ card_images: string[] }>(
    "select card_images from public.listings where id=$1",
    [listing],
  );
  assert.deepEqual(rows[0].card_images, []);
});

test("seeding and admin edits keep demo drawings without card photos", async (t) => {
  const { db, as } = await setup(t);
  await db.exec("reset role");
  await db.query("insert into public.admins(user_id) values($1)", [stranger]);
  await as(stranger);
  const rpc = async (name: string, input: object) =>
    (
      await db.query<{ value: Record<string, unknown> }>(
        `select public.admin_${name}($1::jsonb) as value`,
        [input],
      )
    ).rows[0].value;
  assert.deepEqual(await rpc("reset_demo", why), { listings: 40, sellers: 6 });
  const demo = await rpc("save_demo_seller", { name: "Alix", styleNote: "Brief" });
  const draft = {
    title: "Desk",
    description: "Solid wood",
    price: 25,
    location: "Lausanne",
    condition: "Good",
    image: adminIllustrations[0],
    meetingPoint: "",
    pickup: "Friday evening",
    pickupBy: "",
    status: "active",
    sellerId: demo.id,
  };
  const item = await rpc("save_demo_listing", draft);
  await rpc("save_demo_listing", { ...draft, id: item.id, title: "Table" });
  await db.exec("reset role");
  const demoCards = await db.query<{ card_images: string[] }>(
    "select card_images from public.listings where tags @> array['Demo']",
  );
  assert.ok(demoCards.rows.length > 40);
  assert.ok(demoCards.rows.every((row) => row.card_images.length === 0));
  await assert.rejects(
    db.query("update public.listings set card_images=$1 where id=$2", [
      [upload(String(demo.id))],
      item.id,
    ]),
    /Invalid photo path/,
  );
});
