// Regex-compatibility scanner (Family H / BF-01): flags regex constructs that
// break older browsers at parse time (blank page on Safari < 16.4 / Firefox
// < 78). esbuild transpiles code syntax but NOT regex grammar, so these ship raw.

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function collectJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectJsFiles(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// BF-01 (quick-add.js lookbehind) was fixed: the priority token now uses a
// prefix-capture group instead. The whitelist is empty and kept as the
// escape hatch for any future finding; the guard below asserts src/ stays clean.
const WHITELIST = [];

const FORBIDDEN = [
  { pattern: /\(\?<[=!]/, name: "lookbehind assertion ((?<= / (?<!)" },
  { pattern: /\(\?>/, name: "atomic group ((?>)" },
];

test("no regex constructs beyond the ES2018-compat budget ship in src/ (BF-01 guard)", () => {
  const files = collectJsFiles(srcDir);
  assert.ok(files.length > 0, "src files not found");
  const violations = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const { pattern, name } of FORBIDDEN) {
      const matches = source.match(new RegExp(pattern, "g")) ?? [];
      const allowed = matches.filter((m) => {
        const whitelisted = WHITELIST.some(
          (w) => w.file.test(file.replace(/\\/g, "/")) && source.includes(m) && w.pattern.test(m),
        );
        return !whitelisted;
      });
      if (allowed.length > 0) violations.push(`${file}: ${name} ×${allowed.length}`);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Compat-breaking regex constructs found (BF-01 family). Fix or whitelist with a finding ID: ${violations.join("; ")}`,
  );
});

test("BF-01 stays fixed: quick-add.js keeps its lookbehind-free priority regex", () => {
  const source = readFileSync(join(srcDir, "services", "quick-add.js"), "utf8");
  assert.doesNotMatch(source, /\(\?<!/, "BF-01 regressed: a lookbehind is back in quick-add.js — restore the prefix-capture form or re-whitelist with a finding ID");
  assert.match(source, /\(\^\|\[\^#@\\w\]\)p\(\[1-4\]\)\\b/, "the prefix-capture priority regex that replaced the lookbehind is missing");
});
