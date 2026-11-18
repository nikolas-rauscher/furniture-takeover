import test from "node:test";
import assert from "node:assert/strict";
import {
  firstVisitMode,
  readOnboarding,
  rememberOnboarding,
} from "./onboardingStorage.ts";

const KEY = "takeover-onboarding";

function useStorage(storage: Pick<Storage, "getItem" | "setItem">) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

test("first visits open the intro on phones and offer it on larger screens", () => {
  assert.equal(firstVisitMode(null, true, true), "open");
  assert.equal(firstVisitMode(null, true, false), "invite");
});

test("the intro stays closed once seen or when a link leads elsewhere", () => {
  assert.equal(firstVisitMode({}, true, true), "closed");
  assert.equal(
    firstVisitMode({ location: "UNIL, Dorigny" }, true, false),
    "closed",
  );
  assert.equal(firstVisitMode(null, false, true), "closed");
});

test("dismissing the intro later keeps the search area picked earlier", () => {
  useStorage(memoryStorage());
  assert.equal(readOnboarding(), null);
  rememberOnboarding({ location: "FMEL Vortex, Chavannes-près-Renens" });
  rememberOnboarding({});
  assert.deepEqual(readOnboarding(), {
    location: "FMEL Vortex, Chavannes-près-Renens",
  });
  rememberOnboarding({ location: "UNIL, Dorigny" });
  assert.deepEqual(readOnboarding(), { location: "UNIL, Dorigny" });
});

test("damaged records count as a first visit", () => {
  const storage = memoryStorage();
  useStorage(storage);
  storage.setItem(KEY, "{oops");
  assert.equal(readOnboarding(), null);
  storage.setItem(KEY, JSON.stringify({ location: 42 }));
  assert.equal(readOnboarding(), null);
  storage.setItem(KEY, JSON.stringify(["seen"]));
  assert.equal(readOnboarding(), null);
});

test("blocked storage behaves like a first visit", () => {
  Object.defineProperty(globalThis, "localStorage", {
    get() {
      throw new Error("SecurityError");
    },
    configurable: true,
  });
  assert.equal(readOnboarding(), null);
});

test("a failed write is reported like every other storage failure", (t) => {
  useStorage({
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  const events: string[] = [];
  Object.defineProperty(globalThis, "window", {
    value: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
    configurable: true,
  });
  t.after(() => Reflect.deleteProperty(globalThis, "window"));
  rememberOnboarding({});
  assert.deepEqual(events, ["storage-failure"]);
});
