import test from "node:test";
import assert from "node:assert/strict";
import { resolvePickupAt, zurichClockTime } from "./pickupTime.ts";

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
