import test from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToKey,
  classifyDueDate,
  filterTodosByDueDate,
  formatDueDate,
  isMissingDueDateColumn,
  validateDueDate,
} from "../src/services/task-due-dates.js";

test("isMissingDueDateColumn recognizes undefined-column errors for the retry path", () => {
  assert.equal(isMissingDueDateColumn({ code: "42703", message: "column todos.due_date does not exist" }), true);
  assert.equal(isMissingDueDateColumn({ code: "PGRST204", message: "Could not find the 'due_date' column of 'todos' in the schema cache" }), true);
  assert.equal(isMissingDueDateColumn({ message: "column todos.due_date does not exist" }), true);
  assert.equal(isMissingDueDateColumn({ code: "42501", message: "permission denied for table todos" }), false);
  assert.equal(isMissingDueDateColumn({ code: "42P01", message: "relation todos does not exist" }), false);
  assert.equal(isMissingDueDateColumn(null), false);
});

test("validateDueDate accepts an empty value as no due date", () => {
  assert.deepEqual(validateDueDate(""), { value: null, error: "" });
  assert.deepEqual(validateDueDate(null), { value: null, error: "" });
  assert.deepEqual(validateDueDate(undefined), { value: null, error: "" });
});

test("validateDueDate accepts well-formed calendar dates", () => {
  assert.deepEqual(validateDueDate("2026-10-24"), { value: "2026-10-24", error: "" });
  assert.deepEqual(validateDueDate(" 2026-10-24 "), { value: "2026-10-24", error: "" });
  assert.deepEqual(validateDueDate("2028-02-29"), { value: "2028-02-29", error: "" });
});

test("validateDueDate rejects malformed and impossible dates", () => {
  assert.equal(validateDueDate("24/10/2026").error, "Due date must be a valid date.");
  assert.equal(validateDueDate("2026-10").error, "Due date must be a valid date.");
  assert.equal(validateDueDate("2026-13-01").error, "Due date must be a real calendar date.");
  assert.equal(validateDueDate("2026-02-31").error, "Due date must be a real calendar date.");
  assert.equal(validateDueDate("2027-02-29").error, "Due date must be a real calendar date.");
});

test("addDaysToKey rolls over months, years, and leap days", () => {
  assert.equal(addDaysToKey("2026-10-31", 1), "2026-11-01");
  assert.equal(addDaysToKey("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysToKey("2028-02-28", 1), "2028-02-29");
  assert.equal(addDaysToKey("2026-03-01", -1), "2026-02-28");
});

test("classifyDueDate sorts tasks into none, overdue, today, and upcoming", () => {
  assert.equal(classifyDueDate(null, "2026-10-24"), "none");
  assert.equal(classifyDueDate("2026-10-23", "2026-10-24"), "overdue");
  assert.equal(classifyDueDate("2026-10-24", "2026-10-24"), "today");
  assert.equal(classifyDueDate("2026-10-25", "2026-10-24"), "upcoming");
});

test("formatDueDate labels relative days and older dates", () => {
  assert.equal(formatDueDate(null, "2026-10-24"), "");
  assert.equal(formatDueDate("2026-10-24", "2026-10-24"), "Due today");
  assert.equal(formatDueDate("2026-10-25", "2026-10-24"), "Due tomorrow");
  assert.equal(formatDueDate("2026-10-23", "2026-10-24"), "Overdue · Fri, Oct 23");
  assert.equal(formatDueDate("2026-11-02", "2026-10-24"), "Mon, Nov 2");
});

test("formatDueDate keeps the picked calendar day regardless of timezone offset", () => {
  // 2026-01-01 must format as Jan 1, not Dec 31/Jan 2 as would happen if the
  // key were parsed as a UTC instant and formatted in a shifted zone.
  assert.equal(formatDueDate("2026-01-01", "2026-01-01"), "Due today");
  assert.match(formatDueDate("2026-01-03", "2026-01-01"), /Jan 3/);
});

test("filterTodosByDueDate matches overdue, today, week, and no-date buckets", () => {
  const today = "2026-10-24";
  const todos = [
    { id: 1, due_date: null },
    { id: 2, due_date: "2026-10-20" },
    { id: 3, due_date: "2026-10-24" },
    { id: 4, due_date: "2026-10-26" },
    { id: 5, due_date: "2026-10-30" },
    { id: 6, due_date: "2026-11-02" },
  ];

  assert.deepEqual(filterTodosByDueDate(todos, "all", today).map((todo) => todo.id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(filterTodosByDueDate(todos, "no-date", today).map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodosByDueDate(todos, "overdue", today).map((todo) => todo.id), [2]);
  assert.deepEqual(filterTodosByDueDate(todos, "today", today).map((todo) => todo.id), [3]);
  // The week window is today through today+6 inclusive: Oct 24-30.
  assert.deepEqual(filterTodosByDueDate(todos, "week", today).map((todo) => todo.id), [3, 4, 5]);
  assert.deepEqual(filterTodosByDueDate(todos, "unknown", today).map((todo) => todo.id), [1, 2, 3, 4, 5, 6]);
});

test("sidebar view buckets: Today includes overdue, Upcoming is strictly later", () => {
  const today = "2026-10-24";
  const todos = [
    { id: 1, due_date: null },
    { id: 2, due_date: "2026-10-20" },
    { id: 3, due_date: "2026-10-24" },
    { id: 4, due_date: "2026-10-25" },
    { id: 5, due_date: "2026-11-02" },
  ];
  assert.deepEqual(filterTodosByDueDate(todos, "due-today", today).map((todo) => todo.id), [2, 3]);
  assert.deepEqual(filterTodosByDueDate(todos, "upcoming", today).map((todo) => todo.id), [4, 5]);
});
