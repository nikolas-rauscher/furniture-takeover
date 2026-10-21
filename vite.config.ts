import { defineConfig, loadEnv } from "vite";
import { readPort } from "./server/config";

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, process.cwd(), ["API_", "APP_", "PREVIEW_"]),
    ...process.env,
  };
  const proxy = {
    "/api": `http://127.0.0.1:${readPort(env.API_PORT, 8787, "API_PORT")}`,
  };
  const allowedHosts = (env.APP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return {
    server: {
      host: env.APP_HOST || "127.0.0.1",
      port: readPort(env.APP_PORT, 5173, "APP_PORT"),
      allowedHosts,
      strictPort: true,
      watch: { ignored: ["**/data/**", "**/server/**"] },
      proxy,
    },
    preview: {
      host: env.APP_HOST || "127.0.0.1",
      port: readPort(env.PREVIEW_PORT, 4173, "PREVIEW_PORT"),
      strictPort: true,
      allowedHosts,
      proxy,
    },
  };
});
