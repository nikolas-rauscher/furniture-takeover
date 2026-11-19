import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoAdminHeader } from "../../shared/admin.ts";
import { AdminApiError, createAdminApi } from "./admin.ts";

const overview = {
  listings: { active: 2, reserved: 1, sold: 0, withdrawn: 0, hidden: 3 },
  conversations: 4,
  deals: { open: 1, agreed: 1, completed: 0, cancelled: 0 },
  reportsOpen: 2,
  pakoToday: { requests: 6, threadReads: 5 },
};
const why = { reason: "Restore the shipped data" };

test("admin account calls use the RPC and surface its error key", async () => {
  const calls: unknown[][] = [];
  const client = {
    async rpc(...args: unknown[]) {
      calls.push(args);
      return args[0] === "admin_overview"
        ? { data: overview, error: null }
        : { data: null, error: { message: "admin_deal_agreed" } };
    },
  } as unknown as SupabaseClient;
  const api = createAdminApi({ client });
  assert.deepEqual(await api.overview(), overview);
  await assert.rejects(api.resetDemo(why), {
    name: "AdminApiError",
    code: "admin_deal_agreed",
  });
  assert.deepEqual(calls, [
    ["admin_overview", {}],
    ["admin_reset_demo", { p: why }],
  ]);
});

test("the demo API follows Developer mode and sends the shared contract", async (t) => {
  const requests: [unknown, RequestInit | undefined][] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (path: unknown, init?: RequestInit) => {
      requests.push([path, init]);
      return Response.json(
        path === "/api/admin/overview"
          ? overview
          : { listings: 40, sellers: 6 },
      );
    },
  );
  await assert.rejects(createAdminApi({ developerMode: false }).overview(), {
    code: "admin_required",
  });
  assert.equal(requests.length, 0);
  const api = createAdminApi({ developerMode: true });
  assert.deepEqual(await api.overview(), overview);
  assert.deepEqual(await api.resetDemo(why), { listings: 40, sellers: 6 });
  assert.deepEqual(
    requests.map(([path]) => path),
    ["/api/admin/overview", "/api/admin/reset-demo"],
  );
  assert.equal(requests[0][1]?.method, "GET");
  assert.equal(requests[1][1]?.method, "POST");
  assert.equal(new Headers(requests[1][1]?.headers).get(demoAdminHeader), "1");
  assert.equal(requests[1][1]?.body, JSON.stringify(why));
});

test("the client rejects malformed admin responses with a stable error key", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ listings: [] }),
  );
  await assert.rejects(
    createAdminApi({ developerMode: true }).overview(),
    (error) =>
      error instanceof AdminApiError && error.code === "admin_invalid_response",
  );
});
