import test from "node:test";
import assert from "node:assert/strict";
import { filterTodosByTag, validateTagName } from "../src/services/tags.js";

test("trims and validates tag names", () => {
  assert.deepEqual(validateTagName("  errands  "), { name: "errands", error: "" });
  assert.equal(validateTagName(" \t ").error, "Tag name cannot be empty.");
  assert.equal(validateTagName("x".repeat(41)).error, "Tag names must be 40 characters or fewer.");
});

test("counts Unicode tag names by code point", () => {
  assert.deepEqual(validateTagName("🧹".repeat(40)), { name: "🧹".repeat(40), error: "" });
  assert.equal(validateTagName("🧹".repeat(41)).error, "Tag names must be 40 characters or fewer.");
});

test("filters by an assigned tag while leaving untagged tasks out", () => {
  const todos = [
    { id: 1, tags: [{ id: "home", name: "Home" }, { id: "weekend", name: "Weekend" }] },
    { id: 2, tags: [{ id: "work", name: "Work" }] },
    { id: 3, tags: [] },
  ];

  assert.deepEqual(filterTodosByTag(todos, "home").map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodosByTag(todos, "weekend").map((todo) => todo.id), [1]);
  assert.deepEqual(filterTodosByTag(todos, "all"), todos);
});
