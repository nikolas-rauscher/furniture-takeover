import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { STUDY_ROUTES } from "../shared/study.ts";
import { AgentError } from "./errors.ts";
import { createAgentServer } from "./http.ts";
import { STUDY_BODY_LIMIT, STUDY_WRITES_PER_MINUTE } from "./routes/study.ts";
import type { StudyAccess } from "./routes/types.ts";
import { createAgentService } from "./service.ts";
import { createSqliteStudyStore } from "./study-store.ts";
import { fakeConfig } from "./testing/provider.ts";

const config = {
  open: true,
  contact: "study@takeover.example",
  deleteBy: "2099-01-31",
} as const;

async function startServer(
  t: TestContext,
  options: Parameters<typeof createAgentServer>[1],
) {
  const server = createAgentServer(
    createAgentService({ ...fakeConfig, apiKey: "" }),
    options,
  );
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function openStudy(t: TestContext, overrides: Partial<StudyAccess> = {}) {
  const store = createSqliteStudyStore(":memory:");
  t.after(() => store.close?.());
  return { config, store, ...overrides } satisfies StudyAccess;
}

const post = (
  url: string,
  route: string,
  body: unknown,
  headers: Record<string, string> = { "Content-Type": "application/json" },
) =>
  fetch(url + route, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const startBody = (session: string) => ({
  session,
  version: "p1",
  source: "moodle",
  device: "phone",
  adult: true,
  consent: true,
});
const answerBody = (session: string, step = "student", chosen = ["epfl"]) => ({
  session,
  step,
  chosen,
  shown: [],
  text: "",
  elapsedMs: 900,
});
const errorCode = async (response: Response) =>
  (await response.json()).error.code;

test("a deployment without contact and deletion date reports the study as closed and refuses writes", async (t) => {
  const url = await startServer(t, {});
  const response = await fetch(url + STUDY_ROUTES.config);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { open: false });
  for (const route of [
    STUDY_ROUTES.sessions,
    STUDY_ROUTES.answers,
    STUDY_ROUTES.contacts,
  ]) {
    const refused = await post(url, route, {});
    assert.equal(refused.status, 403);
    assert.equal(await errorCode(refused), "STUDY_CLOSED");
  }
});

test("an open study reports its contact and deletion date", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  assert.deepEqual(
    await (await fetch(url + STUDY_ROUTES.config)).json(),
    config,
  );
});

test("a study closes on its deletion date without a restart", async (t) => {
  const url = await startServer(t, {
    study: openStudy(t, { now: () => new Date("2099-01-31T08:00:00Z") }),
  });
  assert.deepEqual(await (await fetch(url + STUDY_ROUTES.config)).json(), {
    open: false,
  });
  const refused = await post(
    url,
    STUDY_ROUTES.sessions,
    startBody(randomUUID()),
  );
  assert.equal(await errorCode(refused), "STUDY_CLOSED");
});

test("a session needs the adult and consent confirmations", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  for (const missing of [
    { adult: false },
    { consent: false },
    { adult: undefined },
  ]) {
    const refused = await post(url, STUDY_ROUTES.sessions, {
      ...startBody(randomUUID()),
      ...missing,
    });
    assert.equal(refused.status, 400);
    assert.equal(await errorCode(refused), "STUDY_CONSENT_REQUIRED");
  }
  const invalid = await post(url, STUDY_ROUTES.sessions, {
    ...startBody(randomUUID()),
    device: "tablet",
  });
  assert.equal(invalid.status, 400);
  assert.equal(await errorCode(invalid), "INVALID_STUDY_REQUEST");
  const started = await post(
    url,
    STUDY_ROUTES.sessions,
    startBody(randomUUID()),
  );
  assert.equal(started.status, 200);
  assert.deepEqual(await started.json(), { saved: true });
});

test("an answer for a session that was never started is refused", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  const refused = await post(
    url,
    STUDY_ROUTES.answers,
    answerBody(randomUUID()),
  );
  assert.equal(refused.status, 404);
  assert.equal(await errorCode(refused), "STUDY_SESSION_UNKNOWN");
});

test("answering a step again replaces the earlier answer", async (t) => {
  const saved: unknown[] = [];
  const store = {
    start: () => undefined,
    saveAnswer: (answer: unknown) => void saved.push(answer),
    saveContact: () => undefined,
  };
  const url = await startServer(t, { study: openStudy(t, { store }) });
  const session = randomUUID();
  for (const chosen of [["epfl"], ["unil"]])
    assert.equal(
      (
        await post(
          url,
          STUDY_ROUTES.answers,
          answerBody(session, "student", chosen),
        )
      ).status,
      200,
    );
  assert.deepEqual(saved, [
    answerBody(session, "student", ["epfl"]),
    answerBody(session, "student", ["unil"]),
  ]);
});

test("a contact is accepted with and without a session, and an unknown session is refused", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  const session = randomUUID();
  await post(url, STUDY_ROUTES.sessions, startBody(session));
  const contact = { email: "ada@epfl.ch", pilot: true };
  assert.equal(
    (await post(url, STUDY_ROUTES.contacts, { ...contact, session: null }))
      .status,
    200,
  );
  assert.equal(
    (await post(url, STUDY_ROUTES.contacts, { ...contact, session })).status,
    200,
  );
  const unknown = await post(url, STUDY_ROUTES.contacts, {
    ...contact,
    session: randomUUID(),
  });
  assert.equal(unknown.status, 404);
  const invalid = await post(url, STUDY_ROUTES.contacts, {
    email: "not-an-address",
    pilot: false,
    session: null,
  });
  assert.equal(invalid.status, 400);
});

test("study writes are limited to 8 KB and must be declared as JSON", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  const oversized = await post(
    url,
    STUDY_ROUTES.answers,
    JSON.stringify({
      ...answerBody(randomUUID()),
      text: "x".repeat(STUDY_BODY_LIMIT),
    }),
  );
  assert.equal(oversized.status, 413);
  assert.equal(await errorCode(oversized), "BODY_TOO_LARGE");
  const plain = await post(
    url,
    STUDY_ROUTES.sessions,
    JSON.stringify(startBody(randomUUID())),
    { "Content-Type": "text/plain" },
  );
  assert.equal(plain.status, 415);
  const malformed = await post(url, STUDY_ROUTES.sessions, "{not json");
  assert.equal(malformed.status, 400);
  assert.equal(await errorCode(malformed), "INVALID_JSON");
});

test("study writes come from allowed origins only", async (t) => {
  const url = await startServer(t, { study: openStudy(t) });
  const refused = await post(
    url,
    STUDY_ROUTES.sessions,
    startBody(randomUUID()),
    { "Content-Type": "application/json", Origin: "https://untrusted.example" },
  );
  assert.equal(refused.status, 403);
  assert.equal(await errorCode(refused), "ORIGIN_NOT_ALLOWED");
});

test("one global cap limits study writes per minute and then recovers", async (t) => {
  let time = Date.parse("2026-11-21T10:00:00Z");
  const url = await startServer(t, {
    study: openStudy(t, { now: () => new Date(time) }),
  });
  const write = () => post(url, STUDY_ROUTES.sessions, startBody(randomUUID()));
  for (let n = 0; n < STUDY_WRITES_PER_MINUTE; n++)
    assert.equal((await write()).status, 200);
  const busy = await write();
  assert.equal(busy.status, 429);
  assert.equal(await errorCode(busy), "STUDY_BUSY");
  assert.equal(busy.headers.get("retry-after"), "60");
  assert.equal(
    (await fetch(url + STUDY_ROUTES.config)).status,
    200,
    "reading the config is not capped",
  );
  time += 60_000;
  assert.equal((await write()).status, 200);
});

test("study routes need no sign-in in account mode while every other protection stays", async (t) => {
  let authorizations = 0;
  const unused = async () => {
    throw new Error("No allowance should be read");
  };
  const url = await startServer(t, {
    study: openStudy(t),
    cloud: {
      config: {
        supabaseUrl: "https://example.supabase.co",
        supabaseKey: "public-test-key",
      },
      authorize: async () => {
        authorizations++;
        throw new AgentError(401, "AUTH_REQUIRED", "Sign in.");
      },
      quota: unused,
      spendReplyReading: unused,
    },
  });
  const session = randomUUID();
  assert.equal((await fetch(url + STUDY_ROUTES.config)).status, 200);
  assert.equal(
    (await post(url, STUDY_ROUTES.sessions, startBody(session))).status,
    200,
  );
  assert.equal(
    (await post(url, STUDY_ROUTES.answers, answerBody(session))).status,
    200,
  );
  assert.equal(
    (
      await post(url, STUDY_ROUTES.contacts, {
        email: "ada@epfl.ch",
        pilot: false,
        session: null,
      })
    ).status,
    200,
  );
  assert.equal(authorizations, 0);
  assert.equal((await post(url, "/api/agent/assist", {})).status, 401);
  assert.equal((await fetch(url + "/api/account/keys")).status, 401);
  assert.equal((await fetch(url + "/api/listings")).status, 410);
  assert.equal((await fetch(url + "/api/messages")).status, 410);
  assert.equal(authorizations, 2);
});

test("study failures are logged without the request body or an address", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const url = await startServer(t, { study: openStudy(t) });
  await post(url, STUDY_ROUTES.contacts, {
    email: "secret.person@epfl.ch",
    pilot: false,
    session: randomUUID(),
  });
  assert.equal(log.mock.callCount(), 1);
  const line = String(log.mock.calls[0].arguments[1]);
  assert.match(line, /STUDY_SESSION_UNKNOWN/);
  assert.doesNotMatch(line, /secret\.person|127\.0\.0\.1|::1/);
});
