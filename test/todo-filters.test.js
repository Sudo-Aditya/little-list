import test from "node:test";
import assert from "node:assert/strict";
import { filterTodos } from "../src/lib/task-priorities.js";

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
