import type { IncomingMessage, ServerResponse } from "node:http";
import type { AccountKeyStore } from "../account-keys.ts";
import type { AgentRuntime } from "../runtime.ts";
import type { AgentService } from "../service.ts";
import type { CloudAccess } from "../cloud.ts";
import type { ListingsStore } from "../database.ts";
import type { MessagesStore } from "../messages.ts";
import type { StudyStore } from "../study-store.ts";
import type { ThreadAgent } from "../thread-agent.ts";
import type { StudyConfig } from "../../shared/study.ts";
import type { AgentRunEvent, AgentRuntimeHealth } from "../../shared/runs.ts";

/** A study that is configured to run. Without one, the study routes answer that it is closed. */
export type StudyAccess = {
  config: Extract<StudyConfig, { open: true }>;
  store: StudyStore;
  now?: () => Date;
};

export type ServerOptions = {
  cloud?: CloudAccess;
  accountKeys?: AccountKeyStore;
  forAccount?: (
    owner: string,
    authorization: string,
  ) => Promise<{
    service: AgentService;
    runtime: AgentRuntime;
    threads: ThreadAgent;
  }>;
  maxConcurrent?: number;
  staticDirectory?: string;
  allowedOrigins?: readonly string[];
  listings?: ListingsStore;
  messages?: MessagesStore;
  study?: StudyAccess;
  runtime?: {
    health: () => AgentRuntimeHealth;
    run: (
      input: unknown,
      emit: (event: AgentRunEvent) => void,
      signal: AbortSignal,
    ) => Promise<void>;
  };
  threads?: ThreadAgent;
};

export type RouteContext = {
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
  signal: AbortSignal;
  actor?: string;
};

export type RouteHandler = (context: RouteContext) => void | Promise<void>;
export type RouteTable = Record<string, RouteHandler>;
