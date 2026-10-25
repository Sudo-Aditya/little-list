import test from "node:test";
import assert from "node:assert/strict";
import { moveProject, validateProjectName } from "../src/services/projects.js";

const projects = [
  { id: "one", name: "One" },
  { id: "two", name: "Two" },
  { id: "three", name: "Three" },
];

test("trims valid project names", () => {
  assert.deepEqual(validateProjectName("  Work  "), { name: "Work", error: "" });
});

test("rejects blank and overlong project names", () => {
  assert.equal(validateProjectName(" \t ").error, "Project name cannot be empty.");
  assert.equal(validateProjectName("x".repeat(61)).error, "Project names must be 60 characters or fewer.");
});

test("counts supplementary Unicode characters consistently with PostgreSQL char_length", () => {
  assert.equal(validateProjectName("😊".repeat(60)).error, "");
  assert.equal(validateProjectName("😊".repeat(61)).error, "Project names must be 60 characters or fewer.");
});

test("moves a project up or down while preserving the other project order", () => {
  assert.deepEqual(moveProject(projects, "two", -1).map(({ id }) => id), ["two", "one", "three"]);
  assert.deepEqual(moveProject(projects, "two", 1).map(({ id }) => id), ["one", "three", "two"]);
});

test("keeps project order unchanged at either boundary or for an unknown project", () => {
  assert.equal(moveProject(projects, "one", -1), projects);
  assert.equal(moveProject(projects, "three", 1), projects);
  assert.equal(moveProject(projects, "missing", 1), projects);
});
