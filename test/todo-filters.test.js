import test from "node:test";
import assert from "node:assert/strict";
import { filterTodos } from "../src/services/task-priorities.js";

const todos = [
  { id: 1, completed: false, deleted_at: null, priority: "none" },
  { id: 2, completed: true, deleted_at: null, priority: "none" },
  { id: 3, completed: false, deleted_at: "2026-10-15T00:00:00Z", priority: "none" },
];

test("All excludes deleted tasks", () => {
  assert.deepEqual(filterTodos(todos, "All").map((todo) => todo.id), [1, 2]);
});

test("Active and Done only contain matching non-deleted tasks", () => {
  assert.deepEqual(filterTodos(todos, "Active").map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodos(todos, "Done").map((todo) => todo.id), [2]);
});

test("Trash only contains soft-deleted tasks", () => {
  assert.deepEqual(filterTodos(todos, "Trash").map((todo) => todo.id), [3]);
});

test("unknown filters safely show active tasks", () => {
  assert.deepEqual(filterTodos(todos, "Unknown").map((todo) => todo.id), [1, 2]);
});

test("completed subtasks remain visible under an active parent in Active view", () => {
  const nested = [
    { id: 1, parent_task_id: null, completed: false, deleted_at: null, priority: "none" },
    { id: 2, parent_task_id: 1, completed: true, deleted_at: null, priority: "none" },
  ];
  assert.deepEqual(filterTodos(nested, "Active").map((todo) => todo.id).sort((a, b) => a - b), [1, 2]);
});

test("active subtasks remain visible under a completed parent in Done view", () => {
  const nested = [
    { id: 1, parent_task_id: null, completed: true, deleted_at: null, priority: "none" },
    { id: 2, parent_task_id: 1, completed: false, deleted_at: null, priority: "none" },
  ];
  assert.deepEqual(filterTodos(nested, "Done").map((todo) => todo.id).sort((a, b) => a - b), [1, 2]);
});

test("subtasks of selected parents survive priority filtering", () => {
  const nested = [
    { id: 1, parent_task_id: null, completed: false, deleted_at: null, priority: "urgent" },
    { id: 2, parent_task_id: 1, completed: false, deleted_at: null, priority: "low" },
    { id: 3, parent_task_id: null, completed: false, deleted_at: null, priority: "low" },
  ];
  assert.deepEqual(filterTodos(nested, "All", "urgent").map((todo) => todo.id).sort((a, b) => a - b), [1, 2]);
});

test("deleted subtasks are never re-attached outside Trash", () => {
  const nested = [
    { id: 1, parent_task_id: null, completed: false, deleted_at: null, priority: "none" },
    { id: 2, parent_task_id: 1, completed: false, deleted_at: "2026-10-24T00:00:00Z", priority: "none" },
  ];
  assert.deepEqual(filterTodos(nested, "All").map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodos(nested, "Trash").map((todo) => todo.id), [2]);
});

test("completed parents stay out of Active view together with their subtasks", () => {
  const nested = [
    { id: 1, parent_task_id: null, completed: true, deleted_at: null, priority: "none" },
    { id: 2, parent_task_id: 1, completed: true, deleted_at: null, priority: "none" },
  ];
  assert.deepEqual(filterTodos(nested, "Active"), []);
});
