import test from "node:test";
import assert from "node:assert/strict";
import { filterTodos, isTaskPriority, taskPriorities } from "../src/lib/task-priorities.js";

const todos = [
  { id: 1, completed: false, deleted_at: null, priority: "none", project_id: null },
  { id: 2, completed: false, deleted_at: null, priority: "high", project_id: "work" },
  { id: 3, completed: true, deleted_at: null, priority: "urgent", project_id: "personal" },
  { id: 4, completed: false, deleted_at: "2026-10-15T00:00:00Z", priority: "high", project_id: "work" },
];

test("supports the structured priority levels including none", () => {
  assert.deepEqual(taskPriorities, ["none", "low", "medium", "high", "urgent"]);
  for (const priority of taskPriorities) assert.equal(isTaskPriority(priority), true);
  assert.equal(isTaskPriority("critical"), false);
});

test("filters tasks by priority without including deleted rows", () => {
  assert.deepEqual(filterTodos(todos, "All", "high").map((todo) => todo.id), [2]);
  assert.deepEqual(filterTodos(todos, "Active", "high").map((todo) => todo.id), [2]);
  assert.deepEqual(filterTodos(todos, "Done", "urgent").map((todo) => todo.id), [3]);
});

test("priority filtering composes with Trash", () => {
  assert.deepEqual(filterTodos(todos, "Trash", "high").map((todo) => todo.id), [4]);
  assert.deepEqual(filterTodos(todos, "Trash", "low"), []);
});

test("project filtering composes with status, priority, and Trash", () => {
  assert.deepEqual(filterTodos(todos, "All", "all", "work").map((todo) => todo.id), [2]);
  assert.deepEqual(filterTodos(todos, "Done", "urgent", "personal").map((todo) => todo.id), [3]);
  assert.deepEqual(filterTodos(todos, "All", "all", "unassigned").map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodos(todos, "Trash", "high", "work").map((todo) => todo.id), [4]);
  assert.deepEqual(filterTodos(todos, "Active", "all", "personal"), []);
});

test("tag filtering composes with status, priority, and project filters", () => {
  const taggedTodos = [
    { ...todos[0], tags: [{ id: "home", name: "Home" }] },
    { ...todos[1], tags: [{ id: "work", name: "Work" }] },
    { ...todos[2], tags: [{ id: "work", name: "Work" }] },
    { ...todos[3], tags: [{ id: "work", name: "Work" }] },
  ];

  assert.deepEqual(filterTodos(taggedTodos, "Active", "high", "work", "work").map((todo) => todo.id), [2]);
  assert.deepEqual(filterTodos(taggedTodos, "Done", "urgent", "personal", "work").map((todo) => todo.id), [3]);
  assert.deepEqual(filterTodos(taggedTodos, "Trash", "high", "work", "work").map((todo) => todo.id), [4]);
  assert.deepEqual(filterTodos(taggedTodos, "All", "all", "all", "unknown"), []);
});
