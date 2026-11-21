import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adminIllustrations } from "../shared/admin.ts";
import { readdir } from "node:fs/promises";
import {
  catalogStart,
  catalogEnd,
  migrationUrl,
  renderDemoCatalog,
  renderDemoSeed,
} from "./render-demo-seed.ts";

test("supabase/seed-demo.sql is the rendered demo set, so account mode shows the same listings", async () => {
  const committed = await readFile(
    new URL("../supabase/seed-demo.sql", import.meta.url),
    "utf8",
  );
  assert.equal(committed, renderDemoSeed());
});

test("the migration ships the same catalog and every bundled illustration", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.equal(
    migration.slice(
      migration.indexOf(catalogStart),
      migration.indexOf(catalogEnd) + catalogEnd.length,
    ),
    renderDemoCatalog(),
  );
  const illustrations = await readdir(
    new URL("../public/samples/", import.meta.url),
  );
  assert.deepEqual(
    illustrations
      .filter((name) => name.endsWith(".svg"))
      .sort()
      .map((name) => `/samples/${name}`),
    adminIllustrations,
  );
});
