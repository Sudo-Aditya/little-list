// Recurring tasks, Todoist-style. A recurrence is a normalized human phrase
// ("every day", "every 3 weeks", "every monday", "every month", "every year")
// stored on the task. When a recurring task is completed, the next occurrence
// is created from the phrase: no unbounded future tasks, no background job.

import { addDaysToKey, toDateFromKey, dateKeyFromDate } from "./task-due-dates.js";

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const WEEKDAY_WORD = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Matches "every [N] unit" phrases and weekdays; case-insensitive.
const RECURRENCE_PHRASE = /\bevery\s+(?:(\d{1,3})\s+)?(days?|weeks?|months?|years?|sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/gi;

// Turns a matched phrase into its normalized stored form ("every 3 days",
// "every monday"), or null when the words don't form a rule.
function normalizePhrase(matchNumber, matchUnit) {
  const count = matchNumber ? Number(matchNumber) : 1;
  if (count === 0) return null;
  const unit = matchUnit.toLowerCase();
  if (unit.startsWith("day")) return count === 1 ? "every day" : `every ${count} days`;
  if (unit.startsWith("week")) return count === 1 ? "every week" : `every ${count} weeks`;
  if (unit.startsWith("month")) return count === 1 ? "every month" : `every ${count} months`;
  if (unit.startsWith("year")) return count === 1 ? "every year" : `every ${count} years`;
  if (WEEKDAY_INDEX[unit.slice(0, 3)] !== undefined) {
    if (count !== 1) return null;
    return `every ${WEEKDAY_WORD[WEEKDAY_INDEX[unit.slice(0, 3)]]}`;
  }
  return null;
}

// Finds and normalizes the first recurrence phrase in free text, returning
// the rule plus the text around the match so callers can strip it out.
export function extractRecurrence(text) {
  RECURRENCE_PHRASE.lastIndex = 0;
  const match = RECURRENCE_PHRASE.exec(text);
  if (!match) return { recurrence: null, before: text, after: "" };
  const recurrence = normalizePhrase(match[1], match[2]);
  if (!recurrence) return { recurrence: null, before: text, after: "" };
  return {
    recurrence,
    before: text.slice(0, match.index),
    after: text.slice(match.index + match[0].length),
  };
}

export function parseRecurrence(text) {
  const found = extractRecurrence(text);
  const matchLength = found.recurrence
    ? text.length - found.before.length - found.after.length
    : 0;
  return { recurrence: found.recurrence, matchLength };
}

function addMonths(key, months) {
  const date = toDateFromKey(key);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  // Calendar-clamp: Jan 31 + 1 month lands on Feb 28/29 instead of skipping
  // into March.
  if (date.getDate() !== day) date.setDate(0);
  return dateKeyFromDate(date);
}

// The next due date strictly after baseKey for a normalized phrase.
export function nextRecurrenceDate(phrase, baseKey) {
  const match = /^every (?:(\d{1,3})\s+)?(days?|weeks?|months?|years?|sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(phrase.trim().toLowerCase());
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const unit = match[2].toLowerCase();
  if (unit.startsWith("day")) return addDaysToKey(baseKey, count);
  if (unit.startsWith("week")) return addDaysToKey(baseKey, count * 7);
  if (unit.startsWith("month")) return addMonths(baseKey, count);
  if (unit.startsWith("year")) return addMonths(baseKey, count * 12);
  const target = WEEKDAY_INDEX[unit.slice(0, 3)];
  const base = toDateFromKey(baseKey);
  const offset = ((target - base.getDay()) + 7) % 7 || 7;
  return addDaysToKey(baseKey, offset);
}
