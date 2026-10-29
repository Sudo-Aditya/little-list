import test from "node:test";
import assert from "node:assert/strict";
import { parseView, serializeView } from "../src/services/view-route.js";

const PROJECT_ID = "1a2b3c4d-0000-1111-2222-333344445555";
const TAG_ID = "9f8e7d6c-0000-1111-2222-333344445555";
const IDS = { projectIds: [PROJECT_ID], tagIds: [TAG_ID] };

test("every sidebar view round-trips through the hash", () => {
  const views = [
    { filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "all" },
    { filter: "Active", projectFilter: "all", tagFilter: "all", dueFilter: "all" },
    { filter: "Done", projectFilter: "all", tagFilter: "all", dueFilter: "all" },
    { filter: "Trash", projectFilter: "all", tagFilter: "all", dueFilter: "all" },
    { filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "due-today" },
    { filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "upcoming" },
    { filter: "All", projectFilter: PROJECT_ID, tagFilter: "all", dueFilter: "all" },
    { filter: "All", projectFilter: "all", tagFilter: TAG_ID, dueFilter: "all" },
  ];
  for (const view of views) {
    assert.deepEqual(parseView(serializeView(view), IDS), view);
  }
});

test("hashes use the sidebar's names", () => {
  const at = (view) => serializeView(view);
  assert.equal(at({ filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "all" }), "#/inbox");
  assert.equal(at({ filter: "Active", projectFilter: "all", tagFilter: "all", dueFilter: "all" }), "#/active");
  assert.equal(at({ filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "due-today" }), "#/today");
  assert.equal(at({ filter: "All", projectFilter: PROJECT_ID, tagFilter: "all", dueFilter: "all" }), `#/project/${PROJECT_ID}`);
  assert.equal(at({ filter: "All", projectFilter: "all", tagFilter: TAG_ID, dueFilter: "all" }), `#/tag/${TAG_ID}`);
});

test("unknown, empty, and stale hashes parse to null", () => {
  assert.equal(parseView("", IDS), null);
  assert.equal(parseView("#/nonsense", IDS), null);
  assert.equal(parseView(`#/project/${PROJECT_ID}`, { projectIds: [], tagIds: [] }), null);
  assert.equal(parseView(`#/tag/${TAG_ID}`, { projectIds: [], tagIds: [] }), null);
  assert.equal(parseView(undefined, IDS), null);
});
