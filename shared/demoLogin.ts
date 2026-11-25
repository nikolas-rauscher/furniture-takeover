import { z } from "zod";
import { demoSellers } from "./demoSellers.ts";

export const DEMO_LOGIN_ROUTE = "/api/demo-login";
/** The query parameter of the team's link that carries the demo login code. */
export const DEMO_LINK_PARAM = "team";
/** Marks the demo students in app metadata, which only trusted server paths can set. */
export const DEMO_SEED = "takeover-demo-v2";

export const demoLoginRequestSchema = z.strictObject({
  code: z.string().max(64),
  accountId: z.enum(demoSellers.map(({ id }) => id)),
});
export type DemoLoginRequest = z.infer<typeof demoLoginRequestSchema>;
export const demoLoginResponseSchema = z.object({
  tokenHash: z.string().min(1),
});
export type DemoLoginResponse = z.infer<typeof demoLoginResponseSchema>;
