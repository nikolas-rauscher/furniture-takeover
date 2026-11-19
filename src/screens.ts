import { lazyScreen } from "./lazyScreen";
import type { View } from "./navigation";

/** Screens beyond home load on first use, or earlier once a tap on their entry point is likely. */
export const SellFlow = lazyScreen(() => import("./components/SellFlow"));
export const BatchSellFlow = lazyScreen(
  () => import("./components/BatchSellFlow"),
);
export const ListingConversation = lazyScreen(
  () => import("./components/ListingConversation"),
);
export const MessagesPage = lazyScreen(
  () => import("./components/MessagesPage"),
);
export const ComparePage = lazyScreen(() => import("./components/ComparePage"));
export const LocalSettings = lazyScreen(
  () => import("./components/LocalSettings"),
);
export const DeveloperSettings = lazyScreen(
  () => import("./components/DeveloperSettings"),
);
export const AccountSettings = lazyScreen(() => import("./cloud/Account"));
export const Auth = lazyScreen(() => import("./cloud/Auth"));
export const AdminArea = lazyScreen(
  () => import("./components/admin/AdminArea"),
);
export const Onboarding = lazyScreen(
  () => import("./components/onboarding/Onboarding"),
);

/** Where a `data-prefetch` entry point leads. */
export type PrefetchTarget =
  "sell" | "messages" | "compare" | "settings" | "admin" | "intro";

/** Screens a student most often opens next, loaded once the current one is idle. */
export const LIKELY_NEXT: Partial<Record<View, PrefetchTarget[]>> = {
  discover: ["messages", "sell"],
  detail: ["messages"],
  messages: ["sell"],
};
