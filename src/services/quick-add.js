// Todoist-style quick-add parsing: structured tokens pulled out of plain text.
//
// Supported tokens: "#ProjectName" (matches an existing project),
// "@tagName" (matches an existing tag), "p1"–"p4" (p1 = most urgent), and
// date phrases ("today"/"tod", "tomorrow"/"tom", "next week", weekday
// names). Date phrases only produce a due date when the caller asks for them
// (the backend must support the due_date column); otherwise they stay in the
// title so no information is silently dropped.

import { addDaysToKey } from "./task-due-dates.js";
import { extractRecurrence } from "./recurrence.js";

const PRIORITY_TOKENS = { p1: "urgent", p2: "high", p3: "medium", p4: "low" };
const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const WEEKDAY_PHRASE = /\b(next\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/gi;

function collapseSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Days ahead of todayKey for a weekday: 0 = today; "next <day>" pushes a
// same-day match into next week.
function weekdayOffset(dayToken, todayKey, next) {
  const target = WEEKDAY_INDEX[dayToken.toLowerCase().slice(0, 3)];
  const today = new Date(todayKey.replace(/-/g, "/")).getDay();
  const offset = (target - today + 7) % 7;
  return offset === 0 && next ? 7 : offset;
}

export function parseQuickAdd(text, { projects = [], tags = [], parseDates = true, parseDescriptions = true, parseRecurrences = true, todayKey } = {}) {
  let working = text;
  let description = null;

  // Everything after a `//` separator is the task description (Todoist's
  // token). Only consumed when the caller supports descriptions; otherwise
  // the separator and text stay in the title.
  if (parseDescriptions) {
    const separator = working.indexOf("//");
    if (separator !== -1) {
      description = collapseSpaces(working.slice(separator + 2));
      working = working.slice(0, separator);
    }
  }

  const parsed = { title: "", description, projectName: null, tagName: null, priority: null, dueDateKey: null, recurrence: null };

  // Project: #Name matched against existing projects (case-insensitive).
  working = working.replace(/#([\p{L}\p{N}_-]+)/gu, (match, name) => {
    if (parsed.projectName !== null) return match;
    const project = projects.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (project) {
      parsed.projectName = project.name;
      return " ";
    }
    return match;
  });

  // Tag: @Name matched against existing tags (case-insensitive).
  working = working.replace(/@([\p{L}\p{N}_-]+)/gu, (match, name) => {
    if (parsed.tagName !== null) return match;
    const tag = tags.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (tag) {
      parsed.tagName = tag.name;
      return " ";
    }
    return match;
  });

  // Priority: standalone p1–p4 tokens (case-insensitive), but never a
  // project/tag token such as "#P1" or "@p2".
  working = working.replace(/(?<![#@\w])p([1-4])\b/gi, (match, level) => {
    parsed.priority = PRIORITY_TOKENS["p" + level.toLowerCase()];
    return " ";
  });

  // Date phrases. Only the first date token is consumed; later ones stay in
  // the title rather than being silently dropped.
  if (parseDates && todayKey) {
    // Recurrence first: "every monday" contains a weekday that the date
    // regexes would otherwise eat. The rule sets the due date to the first
    // occurrence (the weekday itself for weekday rules, today otherwise)
    // unless an explicit date was already parsed.
    if (parseRecurrences) {
      const found = extractRecurrence(working);
      if (found.recurrence) {
        working = collapseSpaces(`${found.before} ${found.after}`);
        parsed.recurrence = found.recurrence;
        if (parsed.dueDateKey === null) {
          const weekdayMatch = /^every (sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(found.recurrence);
          parsed.dueDateKey = weekdayMatch
            ? addDaysToKey(todayKey, weekdayOffset(weekdayMatch[1], todayKey, false))
            : todayKey;
        }
      }
    }
    const takeDate = (key, match) => {
      if (parsed.dueDateKey === null) {
        parsed.dueDateKey = key;
        return " ";
      }
      return match;
    };
    working = working.replace(/\btoday\b|\btod\b/gi, (match) => takeDate(todayKey, match));
    working = working.replace(/\btomorrow\b|\btom\b/gi, (match) => takeDate(addDaysToKey(todayKey, 1), match));
    working = working.replace(/\bnext week\b/gi, (match) => takeDate(addDaysToKey(todayKey, 7), match));
    working = working.replace(WEEKDAY_PHRASE, (match, next, day) =>
      takeDate(addDaysToKey(todayKey, weekdayOffset(day, todayKey, Boolean(next))), match),
    );
  }

  parsed.title = collapseSpaces(working);
  return parsed;
}
