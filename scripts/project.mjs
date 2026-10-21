import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function assertNodeVersion(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 18)) {
    throw new Error(
      `Takeover requires Node.js 22.18 or newer (found ${version}). Use the version in .nvmrc, then run npm ci.`,
    );
  }
}
