// Tooling hygiene regressions (Family G): the baseline break (./lib imports),
// the unscoped test runner swallowing vendored tests, and vendored tooling
// leaking into the suite can never silently return.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function collectJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectJsFiles(full));
    else if (/\.(js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

test("no source file imports the deleted src/lib path (baseline break guard)", () => {
  const offenders = collectJsFiles(join(root, "src"))
    .filter((file) => readFileSync(file, "utf8").includes('from "./lib/'));
  assert.deepEqual(offenders, [], "the ./lib import break is back — imports must target ./services/");
});

test("src/lib does not exist and src/services does", () => {
  assert.equal(existsSync(join(root, "src", "lib")), false, "src/lib resurrected");
  assert.equal(existsSync(join(root, "src", "services")), true);
});

test("package.json test script is scoped to test/*.test.js", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts.test, /node --test "test\/\*\.test\.js"/, "test runner drifted from the scoped glob");
});

test("vendored tooling stays git-ignored", () => {
  const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
  for (const vendored of ["ui-ux-pro-max-skill/", ".github/skills/", "graphify-out/"]) {
    assert.ok(gitignore.includes(vendored), `${vendored} no longer ignored — vendored tooling would be committed`);
  }
});
