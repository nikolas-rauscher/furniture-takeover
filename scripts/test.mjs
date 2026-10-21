import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { assertNodeVersion, projectRoot } from "./project.mjs";

assertNodeVersion();
async function discover(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return discover(filename);
      return /\.test\.(?:ts|mjs)$/.test(entry.name) ? [filename] : [];
    }),
  );
  return files.flat().sort();
}
const tests = (
  await Promise.all(
    ["src", "server", "shared", "scripts"].map((dir) =>
      discover(path.join(projectRoot, dir)),
    ),
  )
).flat();
if (!tests.length) throw new Error("No tests found.");
const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", ...tests],
  { cwd: projectRoot, stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
