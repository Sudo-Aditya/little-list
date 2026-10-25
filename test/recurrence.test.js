import test from "node:test";
import assert from "node:assert/strict";
import { nextRecurrenceDate, parseRecurrence } from "../src/services/recurrence.js";

test("parseRecurrence normalizes unit phrases", () => {
  assert.deepEqual(parseRecurrence("Water the plants every day"), { recurrence: "every day", matchLength: 9 });
  assert.deepEqual(parseRecurrence("Check email every 3 days"), { recurrence: "every 3 days", matchLength: 12 });
  assert.deepEqual(parseRecurrence("Review budget every week"), { recurrence: "every week", matchLength: 10 });
  assert.deepEqual(parseRecurrence("Pay rent every month"), { recurrence: "every month", matchLength: 11 });
  assert.deepEqual(parseRecurrence("Renew passport every year"), { recurrence: "every year", matchLength: 10 });
  assert.deepEqual(parseRecurrence("Clean house every 2 weeks"), { recurrence: "every 2 weeks", matchLength: 13 });
});

test("parseRecurrence normalizes weekday phrases", () => {
  assert.equal(parseRecurrence("Submit report every monday").recurrence, "every monday");
  assert.equal(parseRecurrence("Standup every tue").recurrence, "every tuesday");
  assert.equal(parseRecurrence("Chores every SATURDAY").recurrence, "every saturday");
  assert.equal(parseRecurrence("Water every Wednesday").recurrence, "every wednesday");
});

test("parseRecurrence ignores non-phrases", () => {
  assert.equal(parseRecurrence("Buy oat milk").recurrence, null);
  assert.equal(parseRecurrence("Read every word carefully").recurrence, null);
  assert.equal(parseRecurrence("The every man problem").recurrence, null);
});

test("daily and weekly intervals advance in days", () => {
  assert.equal(nextRecurrenceDate("every day", "2026-10-24"), "2026-10-25");
  assert.equal(nextRecurrenceDate("every 3 days", "2026-10-24"), "2026-10-27");
  assert.equal(nextRecurrenceDate("every week", "2026-10-24"), "2026-10-31");
  assert.equal(nextRecurrenceDate("every 2 weeks", "2026-10-24"), "2026-11-07");
});

test("monthly intervals clamp to the end of short months", () => {
  assert.equal(nextRecurrenceDate("every month", "2026-01-31"), "2026-02-28");
  assert.equal(nextRecurrenceDate("every month", "2026-10-24"), "2026-11-24");
  assert.equal(nextRecurrenceDate("every 2 months", "2026-11-30"), "2027-01-30");
});

test("yearly intervals keep the calendar day", () => {
  assert.equal(nextRecurrenceDate("every year", "2026-10-24"), "2027-10-24");
  // Feb 29 on a leap year lands on Feb 28 the following year.
  assert.equal(nextRecurrenceDate("every year", "2028-02-29"), "2029-02-28");
});

test("weekday phrases are strictly after the base day", () => {
  // 2026-10-24 is a Saturday: every saturday moves a week ahead.
  assert.equal(nextRecurrenceDate("every saturday", "2026-10-24"), "2026-10-31");
  assert.equal(nextRecurrenceDate("every monday", "2026-10-24"), "2026-10-26");
  assert.equal(nextRecurrenceDate("every friday", "2026-10-24"), "2026-10-30");
});

test("unknown phrases return null instead of guessing", () => {
  assert.equal(nextRecurrenceDate("every fortnight", "2026-10-24"), null);
  assert.equal(nextRecurrenceDate("", "2026-10-24"), null);
});
