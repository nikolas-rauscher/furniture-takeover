import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderDemoSeed } from "./render-demo-seed.ts";

test("supabase/seed-demo.sql is the rendered demo set, so account mode shows the same listings", async () => {
  const committed = await readFile(
    new URL("../supabase/seed-demo.sql", import.meta.url),
    "utf8",
  );
  assert.equal(committed, renderDemoSeed());
});
