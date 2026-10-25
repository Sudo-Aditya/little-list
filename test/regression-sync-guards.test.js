// Regression guard for the guard-race family (A in qa/analysis/bug-pattern-analysis.md):
// React-state guards only take effect after a re-render, so N handlers dispatched
// in one tick all read the same stale `false`. A synchronous (ref-style) guard
// takes effect immediately. This file is executable documentation of both.

import test from "node:test";
import assert from "node:assert/strict";

// Models `const [busy, setBusy] = useState(false)` + `if (busy) return`:
// the guard reads the value from the current render's closure, which is only
// replaced after React flushes (here: after the macrotask boundary).
function makeReactStateGuard() {
  let state = false;
  const setState = (value) => setTimeout(() => { state = value; }, 0); // async flush
  return (fn) => {
    if (state) return false;
    setState(true); // scheduled — the flag is NOT set for same-tick callers
    fn();
    setState(false);
    return true;
  };
}

// Models `const busyRef = useRef(false)` + `if (busyRef.current) return`:
// the flag is a mutable box every call reads and writes synchronously.
function makeSyncRefGuard() {
  let busy = false;
  return (fn) => {
    if (busy) return false;
    busy = true;
    try {
      fn();
    } finally {
      setTimeout(() => { busy = false; }, 0); // release after the operation
    }
    return true;
  };
}

test("BF-02 bug pattern: React-state guard admits a full synchronous burst", () => {
  let writes = 0;
  const guarded = makeReactStateGuard();
  // Four click handlers in one tick (exactly how the quadruple-click
  // produced four duplicate tasks on the live app).
  const admitted = [1, 2, 3, 4].map(() => guarded(() => { writes += 1; }));
  assert.equal(admitted.filter(Boolean).length, 4, "state guard let the whole burst through");
  assert.equal(writes, 4, "four writes happened — this is the production BF-02 behavior");
});

test("fix pattern: synchronous ref guard admits exactly one per burst", () => {
  let writes = 0;
  const guarded = makeSyncRefGuard();
  const admitted = [1, 2, 3, 4].map(() => guarded(() => { writes += 1; }));
  assert.equal(admitted.filter(Boolean).length, 1);
  assert.equal(writes, 1);
});

test("fix pattern: guard releases after the operation settles", async () => {
  const guarded = makeSyncRefGuard();
  assert.equal(guarded(() => {}), true);
  assert.equal(guarded(() => {}), false, "still held during the operation");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(guarded(() => {}), true, "released after settle");
});
