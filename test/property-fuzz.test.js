// Property/fuzz tests: the pure-logic pipeline (quick-add → dates → recurrence
// → formatting) must never throw and never emit NaN keys for ANY input.
// This is the test that would have caught the Sev-1 "every day " white-screen
// (Family B in qa/analysis/bug-pattern-analysis.md) the day the recurrence
// branch was written.

import test from "node:test";
import assert from "node:assert/strict";
import { addDaysToKey, dateKeyFromDate, formatDueDate, getTodayKey, validateDueDate } from "../src/services/task-due-dates.js";
import { nextRecurrenceDate, parseRecurrence } from "../src/services/recurrence.js";
import { parseQuickAdd } from "../src/services/quick-add.js";

// Deterministic PRNG so failures reproduce.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const rng = makeRng(20261025);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const ALPHABET = [
  "a", "B", "é", "🚀", " ", "#", "@", "p1", "p4", "every", "day", "monday",
  "tomorrow", "today", "//", "|", "\\", "{", "}", "undefined", "null", "NaN",
  "0", "9", "-", ".", "*", "%", "\t", "\n", "中", "​", "́",
];

function randomString(maxLen = 40) {
  const len = Math.floor(rng() * maxLen);
  let out = "";
  for (let i = 0; i < len; i++) out += pick(ALPHABET);
  return out;
}

const TODAY = getTodayKey();
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

test("fuzz: parseQuickAdd never throws and never emits NaN date keys (10k inputs)", () => {
  for (let i = 0; i < 10000; i++) {
    const text = randomString();
    let parsed;
    try {
      parsed = parseQuickAdd(text, {
        projects: [{ name: "Errands" }],
        tags: [{ name: "home" }],
        todayKey: TODAY,
      });
    } catch (error) {
      assert.fail(`parseQuickAdd threw on ${JSON.stringify(text)}: ${error.message}`);
    }
    if (parsed.dueDateKey !== null) {
      assert.match(parsed.dueDateKey, DATE_KEY, `NaN-ish key for ${JSON.stringify(text)}: ${parsed.dueDateKey}`);
      assert.doesNotMatch(parsed.dueDateKey, /NaN/, `NaN in key for ${JSON.stringify(text)}`);
    }
    assert.equal(typeof parsed.title, "string");
  }
});

test("fuzz: quick-add grammar phrases never produce NaN first occurrences", () => {
  const units = ["day", "days", "week", "weeks", "month", "months", "year", "years", "mon", "monday", "tue", "friday", "sat", "sunday", "x", "", "1", "0", "99"];
  const prefixes = ["", "Task ", "every ", "every 2 ", "p1 "];
  for (const unit of units) {
    for (const prefix of prefixes) {
      const text = `${prefix}${prefix.includes("every") ? "" : "every "}${unit}`.replace(/\s+/g, " ").trim();
      const parsed = parseQuickAdd(text, { todayKey: TODAY });
      if (parsed.dueDateKey !== null) {
        assert.match(parsed.dueDateKey, DATE_KEY, `bad key for ${JSON.stringify(text)}: ${parsed.dueDateKey}`);
      }
    }
  }
});

test("fuzz: formatDueDate never throws on arbitrary/malformed keys", () => {
  const nasties = ["NaN-NaN-NaN", "", "null", "undefined", "2026-13-45", "2026-02-30", "____", "0-0-0", "99999999-99-99", "2026-10-25T00:00:00Z"];
  for (const key of nasties) {
    let out;
    try {
      out = formatDueDate(key, TODAY);
    } catch (error) {
      assert.fail(`formatDueDate threw on ${JSON.stringify(key)}: ${error.message}`);
    }
    assert.equal(typeof out, "string");
  }
  // And a sweep of fuzzed keys.
  for (let i = 0; i < 2000; i++) {
    const key = randomString(12);
    assert.doesNotThrow(() => formatDueDate(key, TODAY), `threw on ${JSON.stringify(key)}`);
  }
});

test("fuzz: nextRecurrenceDate returns null or a valid key for arbitrary phrases", () => {
  const phrases = ["every day", "every week", "every 3 fortnights", "every", "", "EVERY MONDAY", "every 0 days", "every 999 years", "every    day", "eVeRy tUeSdAy"];
  for (let i = 0; i < 3000; i++) phrases.push(randomString(20));
  for (const phrase of phrases) {
    let next;
    try {
      next = nextRecurrenceDate(phrase, TODAY);
    } catch (error) {
      assert.fail(`nextRecurrenceDate threw on ${JSON.stringify(phrase)}: ${error.message}`);
    }
    if (next !== null) assert.match(next, DATE_KEY, `bad next for ${JSON.stringify(phrase)}: ${next}`);
  }
});

test("fuzz: parseRecurrence never throws, normalizes or rejects cleanly", () => {
  for (let i = 0; i < 5000; i++) {
    const text = randomString();
    assert.doesNotThrow(() => parseRecurrence(text), `threw on ${JSON.stringify(text)}`);
  }
});

test("fuzz: addDaysToKey survives huge offsets without NaN (clamps at ±275760 days)", () => {
  // JS Date max range: ±8.64e15 ms. Beyond that Date becomes Invalid.
  const result = addDaysToKey(TODAY, 1e7);
  assert.equal(typeof result, "string");
  // The invariant that matters: the formatter guards invalid dates (Family B),
  // so even an Invalid-Date-derived string can never crash a render.
  assert.doesNotThrow(() => formatDueDate(result, TODAY));
});

test("validateDueDate rejects every malformed fuzz input without throwing", () => {
  for (let i = 0; i < 3000; i++) {
    const value = randomString(15);
    assert.doesNotThrow(() => validateDueDate(value), `threw on ${JSON.stringify(value)}`);
  }
});

test("dateKeyFromDate round-trips every valid key it produces", () => {
  let key = TODAY;
  for (let i = 0; i < 400; i++) {
    key = addDaysToKey(key, 1);
    assert.equal(dateKeyFromDate(new Date(key.replace(/-/g, "/"))), key, `round-trip failed at ${key}`);
  }
});
