import test from "node:test";
import assert from "node:assert/strict";
import { getSubtaskProgress, groupVisibleTodos } from "../src/lib/subtasks.js";

const todos = [
  { id: 1, parent_task_id: null, completed: false, deleted_at: null },
  { id: 2, parent_task_id: 1, completed: true, deleted_at: null },
  { id: 3, parent_task_id: 1, completed: false, deleted_at: null },
  { id: 4, parent_task_id: 1, completed: false, deleted_at: "2026-10-15T00:00:00Z" },
  { id: 5, parent_task_id: null, completed: false, deleted_at: null },
];

test("groups visible subtasks under visible parents", () => {
  assert.deepEqual(groupVisibleTodos(todos).map(({ todo, children }) => [
    todo.id,
    children.map((child) => child.id),
  ]), [[1, [2, 3, 4]], [5, []]]);
});

test("shows a matching subtask as a root when its parent is filtered out", () => {
  assert.deepEqual(groupVisibleTodos([todos[1]]), [{ todo: todos[1], children: [] }]);
});

test("reports completion progress for undeleted subtasks only", () => {
  assert.deepEqual(getSubtaskProgress(todos, 1), { completed: 1, total: 2 });
  assert.deepEqual(getSubtaskProgress(todos, 5), { completed: 0, total: 0 });
});
