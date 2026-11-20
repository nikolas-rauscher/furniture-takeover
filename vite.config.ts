import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { readPort } from "./server/config";

/** Libraries that change rarely get their own chunks, so an app release keeps them cached. */
const VENDOR_CHUNKS: Record<string, RegExp> = {
  react: /\/node_modules(\.nosync)?\/(react|react-dom|scheduler)\//,
  motion:
    /\/node_modules(\.nosync)?\/(motion|framer-motion|motion-dom|motion-utils)\//,
};

function vendorChunk(id: string) {
  return Object.keys(VENDOR_CHUNKS).find((name) =>
    VENDOR_CHUNKS[name].test(id),
  );
}

const TOUR_PATH = /^\/tour(?=\?|$)/;

/** `/tour` serves the tour page in dev and preview; the production server maps it itself. */
const rewriteTour: Connect.NextHandleFunction = (request, _response, next) => {
  if (request.url) request.url = request.url.replace(TOUR_PATH, "/tour.html");
  next();
};

function tourRoute(): Plugin {
  return {
    name: "tour-route",
    configureServer: (server) => void server.middlewares.use(rewriteTour),
    configurePreviewServer: (server) =>
      void server.middlewares.use(rewriteTour),
  };
}

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

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
    plugins: [tailwindcss(), tourRoute()],
    resolve: {
      alias: { "@": page("./src") },
    },
    build: {
      rollupOptions: {
        input: { main: page("./index.html"), tour: page("./tour.html") },
        output: {
          manualChunks: vendorChunk,
          // Folds the many tiny shared chunks into their neighbours: fewer requests per screen.
          experimentalMinChunkSize: 20_000,
        },
      },
    },
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
