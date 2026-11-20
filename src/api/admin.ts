import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminActions,
  adminErrors,
  demoAdminHeader,
  isAdminErrorKey,
  type AdminAction,
  type AdminErrorKey,
  type AdminInput,
  type AdminOutput,
} from "../../shared/admin.ts";
import type { AccountConnection } from "../cloud/connection";

export { adminIllustrations, adminMeetingPoints } from "../../shared/admin.ts";
export const adminCatalogChanged = "takeover:admin-catalog-changed";

export class AdminApiError extends Error {
  readonly code: AdminErrorKey;

  constructor(code: AdminErrorKey) {
    super(adminErrors[code]);
    this.name = "AdminApiError";
    this.code = code;
  }
}

export type AdminScope =
  { client: SupabaseClient } | { developerMode: boolean };

function failure(message: unknown) {
  return new AdminApiError(
    typeof message === "string" && isAdminErrorKey(message)
      ? message
      : "admin_unavailable",
  );
}

export function createAdminApi(scope: AdminScope) {
  async function run<A extends AdminAction>(
    action: A,
    input: AdminInput<A>,
  ): Promise<AdminOutput<A>> {
    const contract = adminActions[action];
    const parsed = contract.input.safeParse(input);
    if (!parsed.success) throw new AdminApiError("admin_invalid_input");
    let result: unknown;
    if ("client" in scope) {
      const reply = await Promise.resolve(
        scope.client.rpc(
          `admin_${action}`,
          parsed.data === null ? {} : { p: parsed.data },
        ),
      ).catch(() => {
        throw new AdminApiError("admin_unavailable");
      });
      if (reply.error) throw failure(reply.error.message);
      result = reply.data;
    } else {
      if (!scope.developerMode) throw new AdminApiError("admin_required");
      const response = await fetch(
        `/api/admin/${action.replaceAll("_", "-")}`,
        {
          method: parsed.data === null ? "GET" : "POST",
          headers: {
            [demoAdminHeader]: "1",
            ...(parsed.data === null
              ? {}
              : { "Content-Type": "application/json" }),
          },
          body: parsed.data === null ? undefined : JSON.stringify(parsed.data),
        },
      ).catch(() => {
        throw new AdminApiError("admin_unavailable");
      });
      const payload: unknown = await response.json().catch(() => {
        throw new AdminApiError(
          response.ok ? "admin_invalid_response" : "admin_unavailable",
        );
      });
      if (!response.ok) {
        const body = payload as { error?: { code?: unknown } } | null;
        throw failure(body?.error?.code);
      }
      result = payload;
    }
    const output = contract.output.safeParse(result);
    if (!output.success) throw new AdminApiError("admin_invalid_response");
    return output.data as AdminOutput<A>;
  }

  async function changeCatalog<A extends AdminAction>(
    action: A,
    input: AdminInput<A>,
  ) {
    const result = await run(action, input);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event(adminCatalogChanged));
    return result;
  }

  return {
    listDemoListings: () => run("list_demo_listings", null),
    saveDemoListing: (input: AdminInput<"save_demo_listing">) =>
      changeCatalog("save_demo_listing", input),
    setListingHidden: (input: AdminInput<"set_listing_hidden">) =>
      changeCatalog("set_listing_hidden", input),
    resetDemo: (input: AdminInput<"reset_demo">) =>
      changeCatalog("reset_demo", input),
    listDemoSellers: () => run("list_demo_sellers", null),
    saveDemoSeller: (input: AdminInput<"save_demo_seller">) =>
      changeCatalog("save_demo_seller", input),
    listReports: () => run("list_reports", null),
    resolveReport: (input: AdminInput<"resolve_report">) =>
      run("resolve_report", input),
    listBlocks: () => run("list_blocks", null),
    setStudentBlocked: (input: AdminInput<"set_student_blocked">) =>
      run("set_student_blocked", input),
    listModerationLog: () => run("list_moderation_log", null),
    overview: () => run("overview", null),
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;

type AdminCheck = {
  client: SupabaseClient;
  userId: string;
  allowed: boolean;
  error: AdminApiError | null;
};

export function useAdmin({
  account,
  developerMode,
}: {
  account?: AccountConnection;
  developerMode: boolean;
}) {
  const client = account?.client;
  const userId = account?.session?.user.id;
  const [check, setCheck] = useState<AdminCheck | null>(null);
  useEffect(() => {
    if (!client || !userId) return;
    let current = true;
    function finish(allowed: boolean, error: AdminApiError | null) {
      if (current && client && userId)
        setCheck({ client, userId, allowed, error });
    }
    void (async () => {
      try {
        const { data, error } = await client.rpc("is_admin");
        if (error) throw failure(error.message);
        if (typeof data !== "boolean")
          throw new AdminApiError("admin_invalid_response");
        finish(data, null);
      } catch (error) {
        finish(
          false,
          error instanceof AdminApiError
            ? error
            : new AdminApiError("admin_unavailable"),
        );
      }
    })();
    return () => {
      current = false;
    };
  }, [client, userId]);
  const result =
    check?.client === client && check?.userId === userId ? check : null;
  const isAdmin = client ? Boolean(userId && result?.allowed) : developerMode;
  const api = useMemo(() => {
    if (!isAdmin) return null;
    return createAdminApi(client ? { client } : { developerMode: true });
  }, [client, isAdmin]);
  return {
    api,
    isAdmin,
    loading: Boolean(client && userId && !result),
    error: result?.error ?? null,
  };
}
