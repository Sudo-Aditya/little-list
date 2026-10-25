// Family-state matrix: parent × child status combinations across every view.
// Guards the Trash-nesting bug family (D in qa/analysis/bug-pattern-analysis.md).
// The expected sets are COMPUTED from the documented product semantics:
//   - a PARENT renders in a view iff its status matches the view's status set
//     (re-attachment only ever pulls children in, never parents);
//   - outside Trash, a CHILD renders iff its status matches, OR its parent
//     rendered and the child is non-trashed (rides along, nested);
//   - in Trash, a trashed child of a non-trashed parent renders as a ROOT
//     (documented C-05 state — Trash lists what was deleted, regardless of parent).
// Any deviation from these invariants is a Family-D regression.

import test from "node:test";
import assert from "node:assert/strict";
import { filterTodos } from "../src/services/task-priorities.js";
import { groupVisibleTodos } from "../src/services/subtasks.js";

const TODAY = "2026-10-25";
const STATUSES = ["active", "completed", "trashed"];
const VIEWS = ["All", "Active", "Done", "Trash"];

const viewStatuses = {
  All: new Set(["active", "completed"]),
  Active: new Set(["active"]),
  Done: new Set(["completed"]),
  Trash: new Set(["trashed"]),
};

function task(status, id, parentId) {
  return {
    id, title: `t${id}`, parent_task_id: parentId,
    completed: status === "completed",
    deleted_at: status === "trashed" ? "2026-10-24T00:00:00Z" : null,
    priority: "none", due_date: null,
  };
}

function renderedIds(todos, view) {
  const visible = filterTodos(todos, view, "all", "all", "all", "all", TODAY);
  const groups = groupVisibleTodos(visible);
  const ids = new Set();
  for (const g of groups) {
    ids.add(g.todo.id);
    for (const c of g.children) ids.add(c.id);
  }
  return { ids, roots: groups.map((g) => g.todo.id) };
}

function expectedIds(parent, child, view) {
  const statuses = viewStatuses[view];
  const parentIn = statuses.has(parent);
  const childIn = view === "Trash"
    ? statuses.has(child) // trashed children render even without their parent
    : (statuses.has(child) || (parentIn && child !== "trashed"));
  return { parentIn, childIn };
}

for (const parent of STATUSES) {
  for (const child of STATUSES) {
    for (const view of VIEWS) {
      test(`matrix ${view}: parent=${parent} child=${child}`, () => {
        const todos = [task(parent, 1, null), task(child, 2, 1)];
        const { ids, roots } = renderedIds(todos, view);
        const { parentIn, childIn } = expectedIds(parent, child, view);

        assert.equal(ids.has(1), parentIn, `parent render wrong`);
        assert.equal(ids.has(2), childIn, `child render wrong`);

        // A rendered child is nested when its parent is rendered, root otherwise.
        if (ids.has(2)) {
          assert.equal(
            roots.includes(2),
            !ids.has(1),
            `child nesting wrong: parent ${parentIn ? "rendered (child must nest)" : "absent (child may root)"}`,
          );
        }
      });
    }
  }
}

test("three-level malformed chain degrades safely (product allows one level)", () => {
  const todos = [task("active", 1, null), task("active", 2, 1), task("active", 3, 2)];
  assert.doesNotThrow(() => renderedIds(todos, "All"));
});

test("trashed child under active parent is reachable in Trash as a root (C-05)", () => {
  const todos = [task("active", 1, null), task("trashed", 2, 1)];
  const trash = renderedIds(todos, "Trash");
  assert.ok(trash.ids.has(2) && trash.roots.includes(2));
});
