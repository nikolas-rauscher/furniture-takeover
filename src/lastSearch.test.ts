import test from "node:test";
import assert from "node:assert/strict";
import { defaults } from "../shared/marketplace.ts";
import { emptyAgentRunState } from "./hooks/useAgentRun.ts";
import {
  keepLastSearch,
  readLastSearch,
  type LastSearch,
} from "./lastSearch.ts";

function useSessionStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", {
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    },
    configurable: true,
    writable: true,
  });
  return values;
}

const finished: LastSearch = {
  search: {
    text: "white desk",
    originalRequest: "white desk",
    criteria: { ...defaults, query: "white desk" },
    location: "EPFL",
  },
  run: {
    ...emptyAgentRunState(),
    id: "run-1",
    request: "white desk",
    status: "complete",
    text: "I found two desks.",
  },
};

test("a finished search comes back after a reload in the same tab and goes with a new one", () => {
  const values = useSessionStorage();
  assert.equal(readLastSearch(), null);
  keepLastSearch(finished);
  assert.deepEqual(readLastSearch(), finished);
  keepLastSearch(null);
  assert.equal(readLastSearch(), null);
  assert.equal(values.size, 0);
});

test("a running or damaged search is not restored", () => {
  const values = useSessionStorage();
  keepLastSearch({ ...finished, run: { ...finished.run, status: "running" } });
  assert.equal(readLastSearch(), null);
  values.set([...values.keys()][0], "{oops");
  assert.equal(readLastSearch(), null);
});
