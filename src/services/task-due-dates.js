// Due-date helpers. A due date is a calendar day ("YYYY-MM-DD") with no time
// or timezone attached: Postgres stores it as a plain `date`, the API returns
// the same string, and comparisons use local calendar days. Passing an
// explicit `todayKey` keeps classification, formatting, and filtering pure so
// callers and tests control the clock.

const dueDateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const dueDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Turns a date input value into a due-date key or null. Rejects malformed
// strings and impossible calendar dates such as 2026-02-31, which JavaScript
// would otherwise silently roll over to March.
export function validateDueDate(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (key === "") return { value: null, error: "" };
  if (!dueDateKeyPattern.test(key)) {
    return { value: null, error: "Due date must be a valid date." };
  }
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { value: null, error: "Due date must be a real calendar date." };
  }
  return { value: key, error: "" };
}

export function toDateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateKeyFromDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getTodayKey() {
  return dateKeyFromDate(new Date());
}

export function addDaysToKey(key, days) {
  const date = toDateFromKey(key);
  date.setDate(date.getDate() + days);
  return dateKeyFromDate(date);
}

export function classifyDueDate(dueDate, todayKey) {
  if (!dueDate) return "none";
  if (dueDate < todayKey) return "overdue";
  if (dueDate === todayKey) return "today";
  return "upcoming";
}

function formatDueKey(key) {
  const date = toDateFromKey(key);
  // Defense in depth: an invalid key must never crash a render (a NaN date
  // makes Intl.format throw "Invalid time value", unmounting the app).
  if (Number.isNaN(date.getTime())) return "";
  return dueDateFormatter.format(date);
}

// Human label for a task's due date. Overdue tasks lead with "Overdue" so the
// urgency is readable as text, not just color.
export function formatDueDate(dueDate, todayKey) {
  const classification = classifyDueDate(dueDate, todayKey);
  if (classification === "none") return "";
  if (classification === "overdue") {
    return `Overdue · ${formatDueKey(dueDate)}`;
  }
  if (classification === "today") return "Due today";
  if (dueDate === addDaysToKey(todayKey, 1)) return "Due tomorrow";
  return formatDueKey(dueDate);
}

export const dueDateFilters = ["all", "no-date", "overdue", "today", "week"];

// Sidebar view buckets (not part of the toolbar dropdown): Today mirrors
// Todoist's overdue-plus-today list; Upcoming is everything later.
export const dueDateViewBuckets = ["due-today", "upcoming"];

// Detects the PostgREST error raised when the todos schema predates the
// due-date migration, so callers can retry without the column and keep the
// rest of the app working.
export function isMissingDueDateColumn(error) {
  if (error?.code === "42703") return true;
  const message = typeof error?.message === "string" ? error.message : "";
  return message.includes("due_date") && (message.includes("does not exist") || message.includes("Could not find"));
}

export function filterTodosByDueDate(todos, dueFilter, todayKey) {
  if (dueFilter === "all" || (!dueDateFilters.includes(dueFilter) && !dueDateViewBuckets.includes(dueFilter))) return todos;
  if (dueFilter === "no-date") return todos.filter((todo) => !todo.due_date);
  const weekEndKey = addDaysToKey(todayKey, 6);
  return todos.filter((todo) => {
    if (!todo.due_date) return false;
    if (dueFilter === "overdue") return todo.due_date < todayKey;
    if (dueFilter === "due-today") return todo.due_date <= todayKey;
    if (dueFilter === "today") return todo.due_date === todayKey;
    if (dueFilter === "upcoming") return todo.due_date > todayKey;
    if (dueFilter === "week") return todo.due_date >= todayKey && todo.due_date <= weekEndKey;
    return true;
  });
}
