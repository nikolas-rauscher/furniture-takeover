import {
  listMessages,
  sendMessage,
  setConversationDeleted,
} from "./messages.ts";
import { demoTurnCache } from "../pakoTurnCache.ts";
import type { DemoInboxApi } from "./inbox.ts";

export const demoInboxApi: DemoInboxApi = {
  load: listMessages,
  send: sendMessage,
  archive: setConversationDeleted,
  draftCache: demoTurnCache,
};
