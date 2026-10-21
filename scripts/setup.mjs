import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { assertNodeVersion, projectRoot } from "./project.mjs";

assertNodeVersion();
try {
  await copyFile(
    path.join(projectRoot, ".env.example"),
    path.join(projectRoot, ".env"),
    constants.COPYFILE_EXCL,
  );
  console.log("Created .env. Add your own API keys to enable AI features.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log("Kept your existing .env unchanged.");
}
console.log("Run npm run dev, then open http://localhost:5173.");
