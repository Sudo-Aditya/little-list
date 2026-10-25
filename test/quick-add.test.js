import test from "node:test";
import assert from "node:assert/strict";
import { parseQuickAdd } from "../src/services/quick-add.js";

const projects = [{ name: "Errands" }, { name: "Home Renovation" }];
const tags = [{ name: "home" }, { name: "errands" }];
const TODAY = "2026-10-24"; // a Saturday

test("plain text passes through as the title", () => {
  assert.deepEqual(parseQuickAdd("Buy oat milk", { todayKey: TODAY }).title, "Buy oat milk");
});

test("p1–p4 map to Little List priorities, case-insensitively", () => {
  assert.equal(parseQuickAdd("Pay rent p1", { todayKey: TODAY }).priority, "urgent");
  assert.equal(parseQuickAdd("Pay rent P2", { todayKey: TODAY }).priority, "high");
  assert.equal(parseQuickAdd("Pay rent p3", { todayKey: TODAY }).priority, "medium");
  assert.equal(parseQuickAdd("Pay rent p4", { todayKey: TODAY }).priority, "low");
  const parsed = parseQuickAdd("Pay rent p2", { todayKey: TODAY });
  assert.equal(parsed.title, "Pay rent");
});

test("#Name applies only when the project exists, otherwise stays in the title", () => {
  const matched = parseQuickAdd("Buy oat milk #errands", { projects, todayKey: TODAY });
  assert.equal(matched.projectName, "Errands");
  assert.equal(matched.title, "Buy oat milk");
  const unmatched = parseQuickAdd("Buy oat milk #nowhere", { projects, todayKey: TODAY });
  assert.equal(unmatched.projectName, null);
  assert.equal(unmatched.title, "Buy oat milk #nowhere");
});

test("@Name applies only when the tag exists", () => {
  const matched = parseQuickAdd("Water the plants @HOME", { tags, todayKey: TODAY });
  assert.equal(matched.tagName, "home");
  assert.equal(matched.title, "Water the plants");
  const unmatched = parseQuickAdd("Water the plants @urgent-ish", { tags, todayKey: TODAY });
  assert.equal(unmatched.tagName, null);
  assert.equal(unmatched.title, "Water the plants @urgent-ish");
});

test("date phrases resolve against the caller's today", () => {
  assert.equal(parseQuickAdd("File taxes today", { todayKey: TODAY }).dueDateKey, "2026-10-24");
  assert.equal(parseQuickAdd("File taxes tod", { todayKey: TODAY }).dueDateKey, "2026-10-24");
  assert.equal(parseQuickAdd("File taxes tomorrow", { todayKey: TODAY }).dueDateKey, "2026-10-25");
  assert.equal(parseQuickAdd("File taxes tom", { todayKey: TODAY }).dueDateKey, "2026-10-25");
  assert.equal(parseQuickAdd("Plan sprint next week", { todayKey: TODAY }).dueDateKey, "2026-10-31");
});

test("weekday names pick the next occurrence, including today", () => {
  // Today is Saturday: "sat" is today, "mon" is in two days.
  assert.equal(parseQuickAdd("Relax sat", { todayKey: TODAY }).dueDateKey, "2026-10-24");
  assert.equal(parseQuickAdd("Plan sprint monday", { todayKey: TODAY }).dueDateKey, "2026-10-26");
  assert.equal(parseQuickAdd("Plan sprint wed", { todayKey: TODAY }).dueDateKey, "2026-10-28");
  // "next monday" on a Saturday is still the coming Monday (not +7 extra).
  assert.equal(parseQuickAdd("Plan sprint next monday", { todayKey: TODAY }).dueDateKey, "2026-10-26");
  // "next sat" pushes the same-day match into next week.
  assert.equal(parseQuickAdd("Relax next saturday", { todayKey: TODAY }).dueDateKey, "2026-10-31");
});

test("combined tokens all parse out of one string", () => {
  const parsed = parseQuickAdd("Buy oat milk p1 #Errands @home tomorrow", {
    projects,
    tags,
    todayKey: TODAY,
  });
  assert.equal(parsed.title, "Buy oat milk");
  assert.equal(parsed.priority, "urgent");
  assert.equal(parsed.projectName, "Errands");
  assert.equal(parsed.tagName, "home");
  assert.equal(parsed.dueDateKey, "2026-10-25");
});

test("@p2 stays a tag reference, not a priority token", () => {
  const parsed = parseQuickAdd("Check dosage @p2", { tags: [{ name: "p2" }], todayKey: TODAY });
  assert.equal(parsed.tagName, "p2");
  assert.equal(parsed.priority, null);
});

test("date phrases stay in the title when date parsing is off", () => {
  const parsed = parseQuickAdd("File taxes tomorrow", { todayKey: TODAY, parseDates: false });
  assert.equal(parsed.dueDateKey, null);
  assert.equal(parsed.title, "File taxes tomorrow");
});

test("only the first project, tag, and date token apply", () => {
  const parsed = parseQuickAdd("Sort out #Errands #Home @home @errands today tomorrow", {
    projects,
    tags,
    todayKey: TODAY,
  });
  assert.equal(parsed.projectName, "Errands");
  assert.equal(parsed.tagName, "home");
  assert.equal(parsed.dueDateKey, "2026-10-24");
  assert.match(parsed.title, /#Home @errands tomorrow/);
});

test("weekday-like words are not eaten", () => {
  const parsed = parseQuickAdd("Attend wedding rehearsal", { todayKey: TODAY });
  assert.equal(parsed.title, "Attend wedding rehearsal");
  assert.equal(parsed.dueDateKey, null);
});

test("// separates the description and is untouched by other tokens", () => {
  const parsed = parseQuickAdd("Pay rent p1 // see the lease @home", { tags, todayKey: TODAY });
  assert.equal(parsed.title, "Pay rent");
  assert.equal(parsed.description, "see the lease @home");
  assert.equal(parsed.priority, "urgent");
  assert.equal(parsed.tagName, null);
});

test("description parsing can be disabled", () => {
  const parsed = parseQuickAdd("Pay rent // see the lease", { todayKey: TODAY, parseDescriptions: false });
  assert.equal(parsed.description, null);
  assert.equal(parsed.title, "Pay rent // see the lease");
});

test("empty description content leaves an empty title for validation", () => {
  const parsed = parseQuickAdd("// forgot the title", { todayKey: TODAY });
  assert.equal(parsed.title, "");
  assert.equal(parsed.description, "forgot the title");
});
