import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { StudyStart } from "../shared/study.ts";
import { createSupabaseStudyStore } from "./study-supabase.ts";

const start = (session: string = randomUUID()): StudyStart => ({
  session,
  survey: "v3",
  version: "v3-1",
  language: "de",
  source: "moodle-peer",
  device: "phone",
  consent: true,
});

function fakeSupabase(t: TestContext, respond: () => Response | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const result = respond();
    if (result instanceof Error) throw result;
    return result;
  });
  return calls;
}
const failure = (message: string) =>
  Response.json({ code: "P0001", message }, { status: 400 });
const store = () =>
  createSupabaseStudyStore("https://db.example", "sb_secret_x");
const bodyOf = (call: { init: RequestInit }) =>
  JSON.parse(String(call.init.body));

test("the Supabase transport calls the study functions with the service key", async (t) => {
  const calls = fakeSupabase(t, () => new Response(null, { status: 204 }));
  const study = store();
  const session = randomUUID();
  const event = {
    seq: 0,
    kind: "shown" as const,
    step: "who",
    detail: null,
    at: "2026-11-30T10:00:00.000Z",
  };
  await study.start(start(session));
  await study.saveAnswer({
    session,
    step: "who",
    chosen: ["epfl"],
    firstChosen: ["unil"],
    shown: [],
    text: "",
    elapsedMs: 1200,
  });
  await study.saveEvents({ session, events: [event] });
  await study.saveContact({
    email: "ada@epfl.ch",
    pilot: false,
    session: null,
  });
  await study.savePilot({
    email: "ada@epfl.ch",
    role: "buyer",
    house: "not-fmel",
    weeks: ["2026-12-14"],
    items: ["books"],
    joinPilot: false,
    laterEmail: true,
  });
  await study.withdraw({ session });
  assert.deepEqual(
    calls.map(({ url }) => url.replace("https://db.example/rest/v1/rpc/", "")),
    [
      "study_start",
      "study_save_answer",
      "study_save_events",
      "study_save_contact",
      "study_save_pilot",
      "study_withdraw",
    ],
  );
  assert.equal(
    (calls[0].init.headers as Record<string, string>).apikey,
    "sb_secret_x",
  );
  assert.deepEqual(bodyOf(calls[0]), {
    p_session: session,
    p_survey: "v3",
    p_version: "v3-1",
    p_language: "de",
    p_source: "moodle-peer",
    p_device: "phone",
  });
  assert.deepEqual(bodyOf(calls[1]), {
    p_session: session,
    p_step: "who",
    p_chosen: ["epfl"],
    p_first_chosen: ["unil"],
    p_shown: [],
    p_text: "",
    p_elapsed_ms: 1200,
  });
  assert.deepEqual(bodyOf(calls[2]), { p_session: session, p_events: [event] });
  assert.deepEqual(bodyOf(calls[4]), {
    p_email: "ada@epfl.ch",
    p_role: "buyer",
    p_house: "not-fmel",
    p_weeks: ["2026-12-14"],
    p_items: ["books"],
    p_join_pilot: false,
    p_later_email: true,
  });
  assert.deepEqual(bodyOf(calls[5]), { p_session: session });
});

test("a v1 start request without survey or language reaches the database as v1", async (t) => {
  const calls = fakeSupabase(t, () => new Response(null, { status: 204 }));
  const session = randomUUID();
  await store().start({
    session,
    version: "pilot-1",
    source: "moodle",
    device: "desktop",
    consent: true,
  });
  await store().saveAnswer({
    session,
    step: "student",
    chosen: ["yes-epfl"],
    shown: [],
    text: "",
    elapsedMs: 10,
  });
  assert.equal(bodyOf(calls[0]).p_survey, "v1");
  assert.equal(bodyOf(calls[0]).p_language, null);
  assert.equal(bodyOf(calls[1]).p_first_chosen, null);
});

test("the Supabase transport reads the shared results and checks their shape", async (t) => {
  let body: unknown = {
    ready: true,
    desk: { answered: 20, options: [{ option: "nearer", count: 20 }] },
    trouble: { answered: 0, options: [] },
  };
  const calls = fakeSupabase(t, () => Response.json(body));
  assert.deepEqual(await store().results("v3-3"), body);
  assert.match(calls[0].url, /\/rpc\/study_results$/);
  assert.deepEqual(bodyOf(calls[0]), { p_version: "v3-3" });
  body = { ready: true };
  await assert.rejects(async () => store().results("v3-3"), {
    code: "STUDY_UNAVAILABLE",
    status: 503,
  });
});

test("the Supabase transport turns named database errors into API errors", async (t) => {
  let message = "study_session_unknown";
  fakeSupabase(t, () => failure(message));
  for (const [name, code, status] of [
    ["study_session_unknown", "STUDY_SESSION_UNKNOWN", 404],
    ["study_answer_limit", "STUDY_ANSWER_LIMIT", 429],
    ["study_event_limit", "STUDY_EVENT_LIMIT", 429],
    ["study_session_limit", "STUDY_SESSION_LIMIT", 429],
    ["study_contact_limit", "STUDY_CONTACT_LIMIT", 429],
    ["study_pilot_limit", "STUDY_PILOT_LIMIT", 429],
    ["study_survey_mismatch", "STUDY_SURVEY_MISMATCH", 400],
  ] as const) {
    message = name;
    await assert.rejects(async () => store().start(start()), {
      code,
      status,
    });
  }
});

test("an unexpected Supabase failure is reported as unavailable without quoting stored values", async (t) => {
  fakeSupabase(t, () =>
    Response.json(
      { code: "23505", message: "duplicate key (email)=(ada@epfl.ch)" },
      { status: 409 },
    ),
  );
  await assert.rejects(
    async () =>
      store().saveContact({ email: "ada@epfl.ch", pilot: true, session: null }),
    (error) => {
      assert.equal((error as { code: string }).code, "STUDY_UNAVAILABLE");
      assert.doesNotMatch(String((error as Error).cause), /ada@epfl\.ch/);
      return true;
    },
  );
});

test("an unreachable Supabase project is reported as unavailable", async (t) => {
  fakeSupabase(t, () => new Error("connect ECONNREFUSED"));
  await assert.rejects(async () => store().start(start()), {
    code: "STUDY_UNAVAILABLE",
    status: 503,
  });
});
