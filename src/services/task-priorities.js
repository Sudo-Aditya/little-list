import { filterTodosByTag } from "./tags.js";
import { filterTodosByDueDate, getTodayKey } from "./task-due-dates.js";

export const taskPriorities = ["none", "low", "medium", "high", "urgent"];

// Todoist-style display mapping: P1 is the most urgent (red flag), P4 is the
// everyday default, and "none" shows no flag at all.
export const priorityFlags = { urgent: "P1", high: "P2", medium: "P3", low: "P4", none: null };

export function priorityFlag(priority) {
  return priorityFlags[priority] ?? null;
}

export function priorityFlagLabel(priority) {
  const flag = priorityFlag(priority);
  if (!flag) return "No priority";
  const names = { P1: "Urgent", P2: "High", P3: "Medium", P4: "Low" };
  return `${flag} · ${names[flag]}`;
}

export function isTaskPriority(value) {
  return taskPriorities.includes(value);
}

export function filterTodos(
  todos,
  filter,
  priorityFilter = "all",
  projectFilter = "all",
  tagFilter = "all",
  dueFilter = "all",
  todayKey = getTodayKey(),
) {
  const statusTodos = filter === "Trash"
    ? todos.filter((todo) => todo.deleted_at !== null)
    : todos.filter((todo) => todo.deleted_at === null);

  const filteredTodos = filter === "Active"
    ? statusTodos.filter((todo) => !todo.completed)
    : filter === "Done"
      ? statusTodos.filter((todo) => todo.completed)
      : statusTodos;

  const priorityTodos = priorityFilter === "all"
    ? filteredTodos
    : filteredTodos.filter((todo) => todo.priority === priorityFilter);

  const projectTodos = projectFilter === "all"
    ? priorityTodos
    : projectFilter === "unassigned"
      ? priorityTodos.filter((todo) => todo.project_id === null)
      : priorityTodos.filter((todo) => todo.project_id === projectFilter);

  const tagTodos = filterTodosByTag(projectTodos, tagFilter);
  const selected = filterTodosByDueDate(tagTodos, dueFilter, todayKey);

  if (filter === "Trash") return selected;

  // Subtasks always render with their parent: a completed subtask stays
  // visible (struck through) under its active parent in Active view, and an
  // active subtask shows under a completed parent in Done view. Without
  // this, filtered-out children vanish while the parent's "x / y completed"
  // progress (computed from all tasks) still counts them.
  const selectedIds = new Set(selected.map((todo) => todo.id));
  const hiddenChildren = todos.filter((todo) =>
    todo.parent_task_id != null &&
    todo.deleted_at === null &&
    selectedIds.has(todo.parent_task_id) &&
    !selectedIds.has(todo.id),
  );
  return [...selected, ...hiddenChildren];
}
