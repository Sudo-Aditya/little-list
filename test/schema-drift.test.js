// Schema-drift regression: supabase/schema.sql is the contract; src/services/limits.js
// is the app's single source of truth. If either changes without the other,
// this fails (Family C — the tag 80-vs-40 mismatch reached production because
// nothing linked the two).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { limits, knownUiDrift } from "../src/services/limits.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = readFileSync(join(root, "supabase", "schema.sql"), "utf8");
const appSource = readFileSync(join(root, "src", "App.jsx"), "utf8");

function constraint(table, column) {
  const re = new RegExp(
    `create table (?:if not exists )?public\\.${table} \\([\\s\\S]*?\\n\\);`,
  );
  const tableSql = schema.match(re)?.[0] ?? "";
  const col = tableSql
    .split("\n")
    .find((line) => line.trim().startsWith(`${column} `));
  return col ?? "";
}

test("task title limits match schema", () => {
  const col = constraint("todos", "title");
  assert.match(col, /char_length\(title\) between 1 and 200/);
  assert.equal(limits.taskTitle.min, 1);
  assert.equal(limits.taskTitle.max, 200);
});

test("task description limit matches schema", () => {
  const col = constraint("todos", "description");
  assert.match(col, /char_length\(description\) <= 2000/);
  assert.equal(limits.taskDescription.max, 2000);
});

test("recurrence limit matches schema", () => {
  const col = constraint("todos", "recurrence");
  assert.match(col, /char_length\(recurrence\) <= 100/);
  assert.equal(limits.taskRecurrence.max, 100);
});

test("project name limits match schema", () => {
  const col = constraint("projects", "name");
  assert.match(col, /char_length\(name\) between 1 and 60/);
  assert.equal(limits.projectName.max, 60);
});

test("tag name limits match schema", () => {
  const col = constraint("tags", "name");
  assert.match(col, /char_length\(name\) between 1 and 40/);
  assert.equal(limits.tagName.max, 40);
});

test("documented UI drift is exactly the known list (MR-01)", () => {
  // The tag inputs hardcode maxLength="80" against a schema max of 40.
  // This test pins the mismatch so aligning either side forces an update here.
  const tagInputs = appSource.match(/maxLength="80"/g) ?? [];
  assert.equal(
    tagInputs.length,
    knownUiDrift.filter((d) => d.field === "tagName").length * 2, // create + rename inputs
    `Expected exactly the documented MR-01 tag-input drift (maxLength="80"); found ${tagInputs.length}. ` +
      "If you fixed the UI, update limits.js knownUiDrift and this count.",
  );
});

test("task title inputs enforce the schema max", () => {
  // The three title inputs (modal, inline edit, subtask) must not exceed 200.
  const titles = appSource.match(/maxLength="200"/g) ?? [];
  assert.ok(titles.length >= 3, `title inputs missing maxLength=200 (found ${titles.length})`);
});
