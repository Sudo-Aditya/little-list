import test from "node:test";
import assert from "node:assert/strict";
import { chipColor, chipVars, projectColor } from "../src/services/colors.js";

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

test("every chip pair meets WCAG AA (4.5:1) in light and dark schemes", () => {
  const lin = (channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (fg, bg) => {
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  };

  for (let i = 0; i < 12; i++) {
    const colors = chipColor(`seed-${i}`);
    for (const [scheme, text, tint] of [
      ["light", colors.text, colors.tint],
      ["dark", colors.textDark, colors.tintDark],
    ]) {
      const ratio = contrast(text, tint);
      assert.ok(ratio >= 4.5, `${colors.name} ${scheme}: ${text} on ${tint} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test("chipVars exposes the custom properties the stylesheet consumes", () => {
  const vars = chipVars("seed-3");
  assert.deepEqual(Object.keys(vars).sort(), ["--chip-text", "--chip-text-dark", "--chip-tint", "--chip-tint-dark"]);
  const colors = chipColor("seed-3");
  assert.equal(vars["--chip-text"], colors.text);
  assert.equal(vars["--chip-tint"], colors.tint);
  assert.equal(vars["--chip-text-dark"], colors.textDark);
  assert.equal(vars["--chip-tint-dark"], colors.tintDark);
});
