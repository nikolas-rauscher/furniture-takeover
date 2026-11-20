import test from "node:test";
import assert from "node:assert/strict";
import { demoListings } from "./demoListings.ts";
import { pickupSlots, resolvePickupAt, zurichClockTime } from "./pickupTime.ts";

// Wednesday 18 November 2026, 12:00 in Zurich (UTC+1 in November).
const wednesdayNoon = new Date("2026-11-18T11:00:00.000Z");

test("weekdays in English, French and German name their next occurrence", () => {
  for (const words of [
    "Thursday at 18:00",
    "thu 18:00",
    "jeudi 18h",
    "jeu. 18h00",
    "Donnerstag 18 Uhr",
    "Do. 18.00",
  ])
    assert.equal(
      resolvePickupAt(words, wednesdayNoon),
      "2026-11-19T17:00:00.000Z",
      words,
    );
});

test("today, tomorrow and the day after are counted from Zurich's date", () => {
  assert.equal(
    resolvePickupAt("today 18:00", wednesdayNoon),
    "2026-11-18T17:00:00.000Z",
  );
  for (const words of ["tomorrow 6pm", "demain 18h", "morgen um 18 Uhr"])
    assert.equal(
      resolvePickupAt(words, wednesdayNoon),
      "2026-11-19T17:00:00.000Z",
      words,
    );
  assert.equal(
    resolvePickupAt("après-demain 18h30", wednesdayNoon),
    "2026-11-20T17:30:00.000Z",
  );
  assert.equal(
    resolvePickupAt("übermorgen 6:30 pm", wednesdayNoon),
    "2026-11-20T17:30:00.000Z",
  );
});

test("written dates resolve with or without their year", () => {
  for (const words of [
    "20.11. 18:00",
    "20/11 at 18:00",
    "20 Nov, 18:00",
    "Fri 20 Nov, 18:00",
    "vendredi 20 novembre à 18h",
    "Freitag, 20. November, 18 Uhr",
    "2026-11-20 18:00",
    "20.11.2026 18:00",
  ])
    assert.equal(
      resolvePickupAt(words, wednesdayNoon),
      "2026-11-20T17:00:00.000Z",
      words,
    );
});

test("times need a day, one clock time and no window", () => {
  for (const words of [
    "18:00",
    "Thursday",
    "Thursday evening",
    "after 17:00",
    "Thursday after 17:00",
    "ab 18 Uhr",
    "jeudi à partir de 18h",
    "Thursday 18:00 or 19:00",
    "Weekday evenings",
    "Thu 20 Nov, 18:00",
  ])
    assert.equal(resolvePickupAt(words, wednesdayNoon), null, words);
});

test("slot suggestions use the stated time when availability says after", () => {
  for (const [available, times] of [
    ["Weekday evenings after 19:30", ["20:00", "21:00", "20:00", "21:00"]],
    ["Thursday after 17:00", ["17:30", "18:30"]],
  ] as const) {
    const slots = pickupSlots(available, wednesdayNoon);
    assert.deepEqual(
      slots.map(({ pickupAt }) => zurichClockTime(pickupAt)),
      times,
    );
  }
});

test("a weekday means today only while it is at least an hour ahead", () => {
  assert.equal(
    resolvePickupAt("Wednesday 18:00", wednesdayNoon),
    "2026-11-18T17:00:00.000Z",
  );
  assert.equal(
    resolvePickupAt("Wednesday 12:30", wednesdayNoon),
    "2026-11-25T11:30:00.000Z",
  );
});

test("pickups must lie between half an hour and 60 days ahead", () => {
  assert.equal(resolvePickupAt("today 12:20", wednesdayNoon), null);
  assert.equal(
    resolvePickupAt("today 12:40", wednesdayNoon),
    "2026-11-18T11:40:00.000Z",
  );
  // A date already passed this year means next year, which is too far away.
  assert.equal(resolvePickupAt("17.11. 18:00", wednesdayNoon), null);
  assert.equal(resolvePickupAt("20.02. 18:00", wednesdayNoon), null);
  assert.equal(
    resolvePickupAt("15.01. 18:00", wednesdayNoon),
    "2027-01-15T17:00:00.000Z",
  );
});

test("clock changes: a skipped spring time has no instant, a repeated autumn time takes the earlier one", () => {
  const march = new Date("2026-03-25T11:00:00.000Z");
  assert.equal(resolvePickupAt("29.03. 02:30", march), null);
  assert.equal(
    resolvePickupAt("29.03. 03:30", march),
    "2026-03-29T01:30:00.000Z",
  );
  const october = new Date("2026-10-20T10:00:00.000Z");
  assert.equal(
    resolvePickupAt("25.10. 02:30", october),
    "2026-10-25T00:30:00.000Z",
  );
});

test("Zurich clock times follow summer and winter time", () => {
  assert.equal(zurichClockTime("2026-11-20T17:00:00.000Z"), "18:00");
  assert.equal(zurichClockTime("2026-07-01T16:05:00.000Z"), "18:05");
});

test("all demo pickup wordings stay within the advertised windows", () => {
  const weekdays = /^(Mon|Tue|Wed|Thu|Fri)/;
  const weekend = /^(Sat|Sun)/;
  const minute = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  type Check = (label: string, clock: string, instant: string) => boolean;
  const checks: Record<string, Check> = {
    "Flexible pickup": () => true,
    "Weekend pickup": (label) => weekend.test(label),
    "Weekday evenings after 18:00": (label, clock) =>
      weekdays.test(label) && clock > "18:00",
    "Weekday evenings after 17:00": (label, clock) =>
      weekdays.test(label) && clock > "17:00",
    "Lunchtime, Mon-Fri": (label, clock) =>
      weekdays.test(label) && minute(clock) >= 720 && minute(clock) <= 780,
    "Saturday 10:00-14:00": (label, clock) =>
      label.startsWith("Sat") && clock >= "10:00" && clock <= "14:00",
    "Saturday 10:00-16:00": (label, clock) =>
      label.startsWith("Sat") && clock >= "10:00" && clock <= "16:00",
    "Pickup by 30 Nov": (_, __, instant) =>
      instant < "2026-11-30T23:00:00.000Z",
    "Pickup by 6 Dec": (_, __, instant) => instant < "2026-12-06T23:00:00.000Z",
  };
  const byWording = new Map(
    demoListings.map((listing) => [listing.available, listing]),
  );
  assert.deepEqual([...byWording.keys()].sort(), Object.keys(checks).sort());
  for (const [wording, listing] of byWording) {
    const now = new Date(
      listing.pickupBy
        ? Date.parse(listing.pickupBy) - 24 * 60 * 60 * 1000
        : "2026-11-20T13:00:00.000Z",
    );
    for (const slots of [
      pickupSlots(wording, now),
      pickupSlots(wording, now, listing.pickupBy),
    ]) {
      assert.ok(slots.length, wording);
      for (const { pickupTime, pickupAt } of slots)
        assert.ok(
          checks[wording](pickupTime, zurichClockTime(pickupAt), pickupAt),
          `${wording} → ${pickupTime}`,
        );
    }
  }
  assert.deepEqual(
    pickupSlots("Weekend pickup", wednesdayNoon, "2026-11-20"),
    [],
  );
  assert.deepEqual(pickupSlots("Pickup by 16 Nov", wednesdayNoon), []);
  assert.deepEqual(pickupSlots("Call first; hours vary", wednesdayNoon), []);
});
