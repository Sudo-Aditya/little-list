# Historical Bug Pattern Analysis — 2026-10-25

Retropective over **every defect recorded this project**: the baseline `./lib/` import break, the Trash subtask regression, the Sev-1 `every day` white-screen, adversarial findings BF-01…BF-10, corruption findings C-01…C-12, requirement findings MR-01…MR-18, and the process incidents (JWT localStorage contamination, push-protection save, repeated harness bugs). Clusters: **7 recurring bug families**. For each: failure mode, likely-same-defect areas, regression tests (created in `test/` where unit-testable — all passing), earlier-catch tests, automation gaps, risk/priority.

---

## Family A — Guard-race: async state guards vs synchronous events (plus no server idempotency)

**Bugs:** BF-02 (quadruple-click → 4 duplicate tasks), BF-10 (delete+undo spam strands task in Trash), C-06 (complete→uncheck→complete spawns duplicate occurrences), duplicate POST accepted twice (API suite).

**1. Failure mode.** All write paths guard with React *state* (`if (busy) return`), but state updates are asynchronous — N events dispatched in one tick all observe `busy === false` and all pass. The server adds a second layer of the same weakness: no idempotency keys, so every accepted request creates effects. Guard-in-UI + guardless-server = duplicates whenever the client lies (double-click, retry, reconnect replay).

**2. Likely same-defect areas.** `addProject`/`addTag` (double-click Add in manage menus), `reorderProject` (Promise.all updates), `signOut` (double-click), `completeTodo`'s spawn insert, auth submit (double login), `toggleTodoTag`, permanent-delete confirm. Server-side: every POST path.

**3. Regression tests (created).** `test/regression-sync-guards.test.js` — proves the pattern: a state-guard function allows all N synchronous calls; a synchronous-ref guard allows exactly 1. Documents that App.jsx write paths need the ref form.

**4. Earlier-catch tests.** A Playwright rapid-fire spec: dispatch 5 synchronous clicks on every primary action and assert single server effect (would have caught BF-02 pre-ship). An API replay test asserting identical POST+Idempotency-Key (when added) returns the original row.

**5. Missing automation.** No Playwright click-storm suite; no idempotency layer to test; no contract asserting single-effect per user gesture.

**6. Risk H / Priority P1** (data duplication is silent and compounds — C-06 doubles recurring series).

---

## Family B — Unguarded derived values crash the render (no error boundary)

**Bugs:** Sev-1 `every day ` white-screen (`dueDateKey "NaN-NaN-NaN"` → `Intl.format` threw → React unmounted the root); the two "modal closed itself" mysteries that preceded it (same crash, misdiagnosed twice); `formatDueKey` had no invalid-input guard.

**1. Failure mode.** Free-text input → parser → derived value → formatter. Any grammar hole produces a sentinel (`NaN-NaN-NaN`) that the next stage does not validate; `Intl.DateTimeFormat.format` **throws** on invalid Dates; with no React error boundary, one throw unmounts the entire app. The same pipeline pattern exists everywhere a string becomes a Date/number.

**2. Likely same-defect areas.** `weekdayOffset` on unknown weekday names, `nextRecurrenceDate` on arbitrary stored phrases (C-07 garbage reaches it from the DB), due-picker `validateDueDate` (guarded ✓), the Today/Upcoming count comparisons (string compares — safe), `created_at` formatting of client-supplied values (C-11 backdated rows still Date-parseable — safe), any future `due_at` time parsing.

**3. Regression tests (created).** `test/property-fuzz.test.js` — property/fuzz tests over `parseQuickAdd`, `nextRecurrenceDate`, `formatDueDate`, `addDaysToKey` with ~40k random and adversarial inputs asserting **never throws, never emits `NaN` keys, never mutates input**. This is the test that would have caught the Sev-1 the day the recurrence branch was written.

**4. Earlier-catch tests.** The fuzz above; plus an error-boundary smoke test (once an ErrorBoundary component exists — recommended): render a throwing child, assert the shell survives.

**5. Missing automation.** No property-based testing (now introduced — zero deps, seeded PRNG); **no ErrorBoundary component at all** (highest-value structural fix in the app); no crash-page telemetry.

**6. Risk Critical / Priority P0** (only family that produced a production white-screen).

---

## Family C — Client/server validation drift (UI allows what the DB rejects, and vice versa)

**Bugs:** MR-01 (tag input maxLength 80 vs DB 40 → raw error on legit-looking input), C-01 (`todos.title` has no btrim while projects/tags do → whitespace titles via API), C-07 (client validates recurrence grammar; DB accepts any ≤100 text), C-11 (client-set `created_at`).

**1. Failure mode.** The same constraint is enforced (or not) independently in three places — JSX attributes, client validators, DB CHECKs — with no single source of truth, and nothing keeps them synchronized. Drift is invisible until a user hits the mismatch, and each surface can be bypassed (API skips UI; UI promises more than DB allows).

**2. Likely same-defect areas.** Description 2000 (currently aligned — *guard it*), project description 500 vs no UI field, position ≥ 0 vs UI arithmetic, color/icon regex vs no UI, due-date range (DB accepts year 1000–9999; UI calendar may differ), email format rules.

**3. Regression tests (created).** `src/services/limits.js` (single source of truth extracted from `schema.sql`) + `test/schema-drift.test.js` that parses `schema.sql` and asserts every limit matches the module — changing either side without the other now fails the suite. The tag UI mismatch is asserted as a *documented known drift* in the same test (flips to failure the day someone aligns the UI, forcing the update).

**4. Earlier-catch tests.** The drift test itself (would have caught MR-01 at commit time); API boundary suite already exists (pytest) — its job is to keep discovering which side drifts.

**5. Missing automation.** CI job running `npm test` on every push (none exists — tests only run locally); a lint that reads `maxLength=` from JSX and diffs against `limits.js`.

**6. Risk Medium-High / Priority P1.**

---

## Family D — Related-row incoherence (parent/child states applied independently)

**Bugs:** The Trash regression (my own fix hid nested subtasks → count 2 vs list 1, user-reported); the follow-on gate bug (`getSubtaskProgress` counts only non-deleted children, so the section vanished for trashed parents); C-05 (active parent + trashed child stranded); ST-08 orphaning on parent permanent-delete; BF-07-adjacent cross-tab staleness.

**1. Failure mode.** Parent and child rows transition through states (active/completed/trashed) via independent writes with no cascade semantics, while *view* code assumes families are coherent (progress counts non-deleted children; grouping renders children only when the parent is visible; Trash suppresses progress lines). Every new filter or state dimension multiplies the combinations nobody enumerated.

**2. Likely same-defect areas.** Project archive/delete vs its tasks (view resets handled; archived project's tasks in search — ST-18 ✓ but tags/project filter combinations untested), tag delete vs assignments (handled), recurrence spawn copying project/tags (single-shot copy — later parent tag changes don't propagate, A-10), subtask inheritance on project move.

**3. Regression tests (created).** `test/family-state-matrix.test.js` — enumerates the **full 3×3 parent×child status matrix × views** (Inbox/Active/Done/Trash/Today) through `filterTodos` + `groupVisibleTodos` and asserts per-view invariants: no orphan rendering, no vanishing children of visible parents, counts consistent with rendered rows. The matrix is exactly what the Trash bug slipped through.

**4. Earlier-catch tests.** The matrix (a superset of ST-08…ST-11); plus a Playwright assertion that sidebar counts equal rendered row counts per view (would have caught the user-reported count mismatch instantly).

**5. Missing automation.** Count-vs-render invariant test at UI level; cross-tab realtime once built (BF-07).

**6. Risk High / Priority P1** (presents to users as "my task disappeared").

---

## Family E — Raw errors surfaced verbatim (no error taxonomy)

**Bugs:** BF-06 (`TypeError: Failed to fetch` shown offline), MR-03 (Postgres/PostgREST messages verbatim — duplicate project, tag length, RLS 403s), NEG suite confirmed multiple surfaces.

**1. Failure mode.** ~20 call sites do `setListError(error.message)`; transport and database exceptions share one display channel with zero mapping. Violates plan §32 (understandable errors; never expose internals) and leaks schema detail.

**2. Likely same-defect areas.** Every `catch`/`if (error)` in `App.jsx` (auth, CRUD, reorder, tags, sign-out), the modal's inline error, the recurrence spawn error path.

**3. Regression tests (created).** `test/error-mapping.test.js` — a pure `friendlyError(error)` mapper (network TypeErrors, PostgREST codes 42703/23505/23514, 401/403, timeout) asserting no raw `TypeError`/`PGRST`/SQL text survives; **ships with the mapper implementation** so App.jsx call sites can adopt it one line at a time.

**4. Earlier-catch tests.** The mapper suite + a Playwright fault-injection pass asserting the notice never matches `/TypeError|PGRST|error:/`.

**5. Missing automation.** The mapper is new — unwired; wire-up is the fix. UI-level fault injection harness absent.

**6. Risk Medium / Priority P2** (trust + information disclosure, no data loss).

---

## Family F — Session/auth lifecycle gaps

**Bugs:** BF-03 (expired stored session → signed-in error wall), redirect allow-list fallback (users land on the alias-domain Site URL), the JWT-contamination process incident (my sandbox session clobbered the user's real localStorage), no 401 handler.

**1. Failure mode.** The client trusts whatever session blob storage holds; there is no single authority re-validating it per boot; origin/allow-list coupling is invisible until an email link lands somewhere unexpected.

**2. Likely same-defect areas.** Refresh-token failure mid-session (expires during use), sign-out racing in-flight queries, multi-tab sign-out (BF-07), future "remember me"/token refresh UI.

**3. Regression tests.** Partially exist as manual/Playwright cases (corrupt JSON → auth screen ✓ verified live; expired token). Unit layer has nothing to hold — this family is integration-shaped.

**4. Earlier-catch tests.** A Playwright `storageState` suite: expired/corrupt/foreign session → assert login screen (not error wall). Would have caught BF-03 pre-ship.

**5. Missing automation.** The storageState suite (specified in qa/api/playwright README, not yet run); an `onAuthStateChange(SIGNED_OUT)` global handler in app code.

**6. Risk Medium-High / Priority P1.**

---

## Family G — Environment/tooling hygiene (process bugs, several bit me directly)

**Bugs:** unscoped `node --test` swallowing a vendored failing test; `./lib/` import break surviving (no CI build); vendored skill folders nearly committed (151 files); hardcoded token blocked only by GitHub Push Protection; my own harness bugs — `URL` shadowing (twice, JS and Python), heredoc quoting mangling emoji (surrogate crash), stale-tab reads; JWT contamination again.

**1. Failure mode.** Unscoped globs, shared mutable state (ports, localStorage, tabs), credential shortcuts, and no pre-push verification gate. Every one of these failed *loudly but late*.

**2. Likely same-defect areas.** Any future CI, lint configs, additional vendored tooling, generated artifacts (`graphify-out`, screenshots), README deploy docs drift.

**3. Regression tests (created).** `test/test-runner-hygiene.test.js` — asserts the suite's own scope excludes vendored directories and that no tracked source imports `src/lib` (the baseline break can never silently return).

**4. Earlier-catch tests.** A CI workflow (`.github/workflows/ci.yml` — **recommended, not yet created**) running `npm test && npm run build` on push; a pre-push secret scan (`gitleaks`); an eslint no-restricted-globals rule for `URL` shadowing in test/tooling files.

**5. Missing automation.** CI entirely (biggest single gap in the project); secret scanning hook; dependency audit.

**6. Risk Medium / Priority P1 for CI (it would have caught the baseline break, the lookbehind-adjacent build issues, and every test regression before deploy).**

---

## Family H — Platform-compatibility assumptions

**Bugs:** BF-01 (regex lookbehind = blank page on Safari <16.4 / Firefox <78 — still open), BF-09 (320px overflow), no history routing (BF-05).

**1. Failure mode.** Modern syntax/platform features adopted without a compatibility budget; esbuild transpiles *syntax operators* in code but **not** regex constructs, so parse-time regex features ship raw. CSS/JS assumptions untested below 390px.

**2. Likely same-defect areas.** Other regexes in `quick-add.js` (the weekday/phrase patterns — all currently ES2018-safe but one edit away), `Intl` usage (fine), `structuredClone` (unused — keep it that way), any future `Array.at`, `:has()`, CSS nesting.

**3. Regression tests (created).** `test/regex-compatibility.test.js` — scans all `src/**.js` source for lookbehind/lookahead/`\p{...}`-with-`u` and fails on constructs beyond the project's ES2018 regex budget, with BF-01 whitelisted as the known offender until fixed.

**4. Earlier-catch tests.** This scanner (would have flagged the lookbehind at commit); a cross-browser CI matrix once Playwright lands.

**5. Missing automation.** browserslist/caniuse budget enforcement; webkit/firefox CI runs.

**6. Risk High / Priority P0 for BF-01 itself (blank page on a mainstream browser), P2 for the rest.

---

## Priority summary

| Family | Risk | Priority | New tests (all passing) |
|---|---|---|---|
| B — render-crash pipeline | Critical | **P0** | `property-fuzz.test.js` (fuzz: parser, recurrence, dates) |
| H — platform compat | High | **P0** (BF-01) | `regex-compatibility.test.js` |
| A — guard races / idempotency | High | P1 | `regression-sync-guards.test.js` |
| D — family incoherence | High | P1 | `family-state-matrix.test.js` (3×3×views matrix) |
| C — validation drift | Med-High | P1 | `schema-drift.test.js` + `src/services/limits.js` |
| F — session lifecycle | Med-High | P1 | (Playwright storageState suite — specified, pending) |
| G — tooling hygiene | Medium | P1 (CI) | `test-runner-hygiene.test.js` |
| E — raw errors | Medium | P2 | `error-mapping.test.js` + `friendlyError()` mapper |

**Top three automation opportunities, ranked:** ① CI workflow (test+build on push) — catches families B, C, G, H before any deploy; ② React ErrorBoundary — converts any future Family B bug from white-screen to contained failure; ③ Playwright rapid-fire + storageState suites — automates families A and F end-to-end.
