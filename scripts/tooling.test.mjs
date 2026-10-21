import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { assertNodeVersion, projectRoot } from "./project.mjs";

test("setup rejects unsupported Node releases before loading the app", () => {
  assert.throws(() => assertNodeVersion("20.19.0"), /Node.js 22.18/);
  assert.throws(() => assertNodeVersion("22.17.0"), /Node.js 22.18/);
  assert.doesNotThrow(() => assertNodeVersion("22.18.0"));
  assert.doesNotThrow(() => assertNodeVersion("24.0.0"));
});

test("setup creates local configuration once and preserves existing settings", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "takeover-setup-"));
  try {
    await mkdir(path.join(temp, "scripts"));
    for (const file of [
      "scripts/setup.mjs",
      "scripts/project.mjs",
      ".env.example",
    ])
      await copyFile(path.join(projectRoot, file), path.join(temp, file));
    const setup = path.join(temp, "scripts/setup.mjs");
    assert.equal(spawnSync(process.execPath, [setup]).status, 0);
    assert.equal(
      await readFile(path.join(temp, ".env"), "utf8"),
      await readFile(path.join(temp, ".env.example"), "utf8"),
    );
    await writeFile(path.join(temp, ".env"), "LOCAL_SETTING=keep-me\n");
    assert.equal(spawnSync(process.execPath, [setup]).status, 0);
    assert.equal(
      await readFile(path.join(temp, ".env"), "utf8"),
      "LOCAL_SETTING=keep-me\n",
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
