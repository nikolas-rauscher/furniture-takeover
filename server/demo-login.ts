import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { DEMO_SEED, type DemoLoginRequest } from "../shared/demoLogin.ts";
import { AgentError } from "./errors.ts";

export type DemoLogin = {
  /** A one-time token that signs the caller in as the chosen demo student. */
  open(request: DemoLoginRequest): Promise<string>;
};

const unavailable = (cause: unknown) =>
  new AgentError(
    503,
    "DEMO_LOGIN_UNAVAILABLE",
    "This demo account can't be opened right now. Please try again.",
    { cause },
  );

const digest = (value: string) => createHash("sha256").update(value).digest();

export function createDemoLogin({
  url,
  secretKey,
  code,
  fetchImpl,
}: {
  url: string;
  secretKey: string;
  code: string;
  fetchImpl?: typeof fetch;
}): DemoLogin {
  const { admin } = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: fetchImpl && { fetch: fetchImpl },
  }).auth;
  return {
    async open(request) {
      if (!timingSafeEqual(digest(request.code), digest(code)))
        throw new AgentError(
          403,
          "DEMO_LINK_INVALID",
          "This team link is no longer valid. Ask for the current one.",
        );
      const { data, error } = await admin.getUserById(request.accountId);
      if (error) throw unavailable(error);
      const { email, app_metadata } = data.user;
      if (!email || app_metadata.demo_seed !== DEMO_SEED)
        throw unavailable(new Error("The account is not a demo student."));
      const link = await admin.generateLink({ type: "magiclink", email });
      if (link.error) throw unavailable(link.error);
      return link.data.properties.hashed_token;
    },
  };
}
