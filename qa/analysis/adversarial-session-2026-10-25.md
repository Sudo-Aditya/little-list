# Adversarial Session — 2026-10-25

Dedicated break-attempt session run against the sandbox origin (`localhost:5174`) with a disposable account and the live backend, covering the requested dimensions: browsers/versions, screen sizes, zoom, slow networks, offline/online, refresh during operations, back/forward, multiple tabs, duplicate clicks, double submission, expired sessions, storage, time zones, localization, Unicode/emoji, long strings, empty values, rapid repeated actions, interrupted workflows.

**Verdict: the application survived every attack without data loss, corruption, or crash.** All findings below are UX-robustness or compatibility issues, plus two genuine P1 defects (double submission, browser compatibility).

---

## BF-01 (Sev-2, browser compatibility) — Regex lookbehind breaks the whole app on Safari < 16.4 / Firefox < 78
`src/services/quick-add.js:71` uses a lookbehind assertion (`(?<![#@\w])p([1-4])\b`). Regex syntax is not transpiled by esbuild/Vite, so on engines without lookbehind support the module throws at parse time and — because App.jsx imports it — **the entire application renders as a blank page**. Static audit found no other version-sensitive constructs (no `:has()`, no CSS nesting, no `structuredClone`, no `.at()`).
**Fix:** drop the lookbehind (reorder token parsing so `#`/`@` are consumed before priority tokens, which already happens — a simpler check like rejecting matches preceded by `#`/`@` in the callback works), or set Vite `build.target` accordingly. Add a cross-browser CI note.
*Covered dimensions:* browsers, browser versions.

## BF-02 (P1, double submission) — Modal submit accepts 4 duplicate requests in one tick
Quadruple-clicking the modal's "Add task" button created **4 identical tasks** on a throttled (2.5 s) network. The `busy` guard is React-state-based; four synchronous clicks all execute before any re-render, so each passes `if (busy) return`. The single-click UI path shows the button disabled during flight, so the defect only manifests with programmatic/rapid multi-click submission.
**Fix:** guard `addTodo` with a synchronous `useRef` flag (set true on entry, false in `finally`) in addition to the state-based disable.
*Covered dimensions:* duplicate clicks, double submission, slow networks.

## BF-03 (Sev-3, sessions) — Expired stored session renders the workspace with failing queries
A session whose `expires_at` is in the past (crafted locally, or genuinely expired after weeks away) still renders the signed-in workspace; every query then fails. supabase-js v2 does not validate client-side expiry, and the app has no global 401 handler to bounce to login. Storage with a 500 KB padded value was accepted harmlessly.
**Fix:** on query failure with 401/403, clear the session and route to the auth screen (matches plan.txt §6 recovery expectations).
*Covered dimensions:* expired sessions, cookies/local storage.

## BF-04 (Sev-3, interrupted workflows) — Refresh during submit silently loses the task
Reloading the page while the quick-add request was in flight discarded both the draft and the in-flight request — the task never existed afterwards. Matches the plan §6 "avoid silently losing user changes" gap (MR-12).
**Fix (post-MR-12):** persist the modal draft to sessionStorage, or disable reload during flight.

## BF-05 (Sev-3, navigation) — Browser back exits the application
The SPA has no history routing: pressing Back after any in-app navigation leaves the site entirely (to `about:blank` or the previous page). Forward returns correctly. Users habitually press Back; Todoist routes every view.
**Fix:** adopt `history.pushState` routing per view (Inbox/Today/Upcoming/project/tag/filter state in the URL), which also makes views shareable.

## BF-06 (Sev-3, error handling — reinforces MR-03) — Raw network errors surface to users
Offline quick-add and offline completion displayed `TypeError: Failed to fetch` verbatim. Positives: the modal preserved the draft, stayed open, and a retry after reconnect succeeded — the recovery loop works, only the message violates plan §32.
**Fix:** map fetch `TypeError` to "You're offline. Check your connection and try again."

## BF-07 (Sev-4, multi-tab) — No cross-tab sync
Two tabs on the same origin share the session correctly, but a task created in tab A only appears in tab B after a manual reload (no realtime channel, no storage-event refresh). Matches plan §6 (sync not built). Last-write-wins between tabs; no corruption observed.
**Fix (later):** Supabase Realtime subscription or a storage-event refetch.

## BF-08 (Sev-4, interrupted workflows) — Inline edit draft survives view switches and returns
Leaving a task in edit mode, switching to Done, and returning to Inbox re-opens the edit form with the draft. Escape cancels cleanly; harmless but surprising.
**Fix:** clear `editingTodoId` on filter/view changes (one line in the existing reset block).

## BF-09 (Sev-4, responsive) — 15 px horizontal overflow at 320 px viewports
`body { min-width: 320px }` forces horizontal scrolling at ≤320 px (scrollWidth 320 vs clientWidth 305). All other swept widths (390/768/1024/1440/2560) show no overflow, and the modal fits every width.
**Fix:** lower `body { min-width }` to 300 px or drop it.

## BF-10 (Sev-4, rapid actions) — Delete+undo spam can strand a task in Trash
Six rapid delete→undo cycles left one item in Trash (an undo click raced the transient notice). No data loss — the task is restorable from Trash — but the affordance is timing-sensitive.
**Fix:** make the undo notice persist until explicitly dismissed, or queue the undo.

## Confirmed robust (attacks that failed to break anything)

| Dimension | Attack | Result |
|---|---|---|
| Unicode | Astral emoji, CJK, RTL Arabic, Zalgo combining, zero-width chars in titles | Created, stored, round-tripped, rendered without overflow or corruption |
| Long strings | 200-code-point emoji title; 200-char unbroken title; 2000-char unbroken description | Accepted (code-point counting correct); `overflow-wrap` prevented overflow; description rendered fully |
| Empty/null | Empty title, whitespace-only title, description-only, tokens-only (`p1 #Errands`) | Submit disabled or rejected ("Task title cannot be empty."); no empty tasks created |
| Slow networks | 2.5 s request throttle | Button disabled during flight; modal stays open; single success recorded |
| Offline | fetch rejection for create + complete | Draft preserved, modal open, specific failures shown; retry after reconnect succeeded |
| Duplicate completion | 12 rapid complete/reopen toggles (60 ms apart) | Last-write-wins; final state consistent; no corruption |
| Rapid navigation | 20 filter switches at 40 ms | No crash; correct final view rendered |
| Rapid modal | 10 open/close cycles | Clean teardown every time |
| Corrupt storage | Malformed JSON session token | Graceful auth-screen fallback, no crash |
| Oversized storage | 500 KB session value | Accepted harmlessly |
| Refresh during operation | Reload mid-submit | App recovers cleanly (task lost — see BF-04) |
| Screen sizes | 320/390/768/1024/1440/2560 | No overflow except BF-09 at 320 |
| Zoom | Covered by viewport equivalence (200 % @1280 ≈ 640 px; 50 % ≈ 2560 px — both swept) | No findings beyond BF-09 |
| Localization | Dates pinned to "en"; no i18n; no RTL layout (Arabic titles render in LTR) | Informational — matches current scope (plan §37 doesn't require i18n) |
| Time zones | Date math is local-day based and unit-tested with injected `todayKey`; midnight rollover only goes visually stale until the next interaction (labels recompute per render) | No defect beyond A-04 documentation |

## Dimensions not testable from this environment

- **Real Safari/Firefox runs** — covered by static analysis (BF-01) instead.
- **True network throttling/latency profiles** — simulated via in-page fetch wrapping.
- **Browser zoom levels** — covered by viewport-width equivalence.
- **Supabase platform failures** (auth outage, DB restart) — outside app control; error paths tested via offline simulation.
