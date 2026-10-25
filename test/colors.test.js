import test from "node:test";
import assert from "node:assert/strict";
import { chipColor, projectColor } from "../src/services/colors.js";

test("colors are deterministic per id", () => {
  assert.equal(projectColor("abc123"), projectColor("abc123"));
  assert.deepEqual(chipColor("tag-1"), chipColor("tag-1"));
});

test("different ids spread across the palette", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `id-${i}`);
  const mains = new Set(ids.map(projectColor));
  assert.ok(mains.size >= 6, `expected variety, got ${mains.size}`);
});

test("every chip pair carries text, tint, and a main", () => {
  for (let i = 0; i < 12; i++) {
    const colors = chipColor(`seed-${i}`);
    assert.match(colors.main, /^#[0-9a-f]{6}$/);
    assert.match(colors.tint, /^#[0-9a-f]{6}$/);
    assert.match(colors.text, /^#[0-9a-f]{6}$/);
  }
});
