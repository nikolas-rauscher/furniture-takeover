import { spawn } from "node:child_process";
import { assertNodeVersion, projectRoot } from "./project.mjs";

assertNodeVersion();
const childOptions = { cwd: projectRoot, stdio: "inherit" };

const services = [
  spawn(
    process.execPath,
    [
      "--watch",
      "--env-file-if-exists=.env",
      "--experimental-strip-types",
      "server/index.ts",
    ],
    childOptions,
  ),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)],
    childOptions,
  ),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  services.forEach((service) => service.kill("SIGTERM"));
  process.exitCode = code;
}
services.forEach((service) => {
  service.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  service.on("exit", (code) => {
    if (!closing) stop(code || 0);
  });
});
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
