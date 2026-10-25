// Contract for friendlyError (Family E): raw transport/DB errors must never
// reach users verbatim. Every case here is a real error observed in production
// testing (BF-06 TypeError, MR-03 Postgres messages, auth errors).

import test from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "../src/services/error-mapping.js";

const RAW_LEAKS = [/TypeError/, /PGRST/, /42703/, /23505/, /error:/i, /relation/i, /schema/i];

function assertNoLeak(message, label) {
  for (const leak of RAW_LEAKS) {
    assert.doesNotMatch(message, leak, `${label} leaked internals: "${message}"`);
  }
  assert.ok(message.length > 10 && message.length < 200, `${label} message length unreasonable`);
}

test("offline TypeError becomes actionable copy (BF-06)", () => {
  const out = friendlyError(new TypeError("Failed to fetch"));
  assert.equal(out, "You're offline. Check your connection and try again.");
});

test("undefined-column Postgres error maps to feature-pending copy (the migration window)", () => {
  const out = friendlyError({ message: 'column todos.due_date does not exist', code: "42703" });
  assertNoLeak(out, "42703");
  assert.match(out, /update/i);
});

test("duplicate project name maps to friendly copy (POS-PROJ-03 surface)", () => {
  const out = friendlyError({ message: "duplicate key value violates unique constraint \"projects_user_name_unique\"", code: "23505" });
  assertNoLeak(out, "23505");
  assert.match(out, /already taken/i);
});

test("check-constraint violations map without SQL text", () => {
  const out = friendlyError({ message: "new row for relation \"todos\" violates check constraint \"todos_recurrence_check\"", code: "23514" });
  assertNoLeak(out, "23514");
});

test("RLS permission errors map to access copy", () => {
  const out = friendlyError({ message: "permission denied for table todos", code: "42501" });
  assert.match(out, /don't have access/i);
});

test("timeout/abort maps to timeout copy", () => {
  assert.match(friendlyError(new Error("The operation was aborted due to timeout")), /took too long/i);
});

test("auth errors keep their meaning without codes", () => {
  assert.match(friendlyError(new Error("Invalid login credentials")), /Wrong email or password/i);
  assert.match(friendlyError(new Error("Email not confirmed")), /confirmation link/i);
});

test("expired-session JWT errors route to sign-in copy (BF-03 support)", () => {
  assert.match(friendlyError(new Error("JWT expired")), /Sign in again/i);
});

test("unknown errors degrade honestly with no internals", () => {
  const out = friendlyError(new Error("some novel internal stack trace PGRST102"));
  assertNoLeak(out, "unknown");
});

test("non-error inputs are handled (null, undefined, strings)", () => {
  for (const input of [null, undefined, "weird string", 42]) {
    assert.doesNotThrow(() => friendlyError(input));
    assert.equal(typeof friendlyError(input), "string");
  }
});
