import test from "node:test";
import assert from "node:assert/strict";
import { validateTaskTitle } from "../src/lib/task-validation.js";

test("trims whitespace around a task title", () => {
  assert.deepEqual(validateTaskTitle("  Buy milk  "), {
    title: "Buy milk",
    error: "",
  });
});

test("rejects titles containing only whitespace", () => {
  assert.equal(validateTaskTitle(" \t\n").error, "Task title cannot be empty.");
});

test("accepts a title at the 200-character database limit", () => {
  assert.equal(validateTaskTitle("a".repeat(200)).error, "");
});

test("rejects a title longer than the database limit", () => {
  assert.equal(
    validateTaskTitle("a".repeat(201)).error,
    "Task titles must be 200 characters or fewer.",
  );
});

test("counts supplementary Unicode characters consistently with PostgreSQL char_length", () => {
  assert.equal(validateTaskTitle("😊".repeat(200)).error, "");
  assert.equal(
    validateTaskTitle("😊".repeat(201)).error,
    "Task titles must be 200 characters or fewer.",
  );
});
