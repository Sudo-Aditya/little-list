# Test Plan — Little List

## 1. Objectives

Verify that every implemented feature behaves as specified (plan.txt + shipped behavior), that data can never be lost silently, that one user can never see another user's data, and that every input boundary is enforced consistently between UI, client validation, and database constraints.

## 2. Test strategy

| Layer | What | Tooling | Status |
|---|---|---|---|
| Unit (pure logic) | parsers, date/recurrence math, filters, validation | `node --test` (existing 65 tests) | Automated — extend per High-suitability cases |
| API (PostgREST + Auth) | RLS, inserts/updates with real tokens | REST scripts (as used in-session) | Scripted — productize |
| UI end-to-end | journeys through the real browser | Playwright on a sandbox origin + disposable account | Scripted ad hoc — productize |
| Manual/exploratory | visual, email delivery, multi-device | Human | This plan's P3 set |

Sandbox-origin rule (learned the hard way in this project): all automated browser tests must run on a **separate origin** (e.g., port 5174) so they never touch a real user's localStorage session.

## 3. Risk assessment and prioritization

Risk = probability of defect × impact if it fails.

| # | Risk area | Impact | Rationale | Priority |
|---|---|---|---|---|
| 1 | Data loss (permanent delete, trash, orphaned subtasks, recurrence spawn) | Critical | Silent loss of user tasks is unrecoverable | P0 |
| 2 | Auth/RLS breaches (cross-user reads/writes, anon access) | Critical | Private-by-design promise; single-user data exposure | P0 |
| 3 | Core task lifecycle (create/complete/edit/delete) | Critical | The app's primary loop | P0 |
| 4 | Recurrence date math (month-ends, leap years, weekday rollovers) | High | Wrong next-dates compound silently over time | P1 |
| 5 | Quick-add parser (token consumption, unmatched-token retention) | High | Silent token loss = user intent lost | P1 |
| 6 | Filters/views/count consistency (sidebar counts vs. list contents) | Medium | Trust erosion; e.g., known ambiguity: Today count includes completed tasks | P1 |
| 7 | Confirmation email + redirect allow-list | Medium | New-user onboarding can break silently | P1 |
| 8 | Modals/empty states/toolbar gating | Low | Cosmetic-adjacent UX | P2–P3 |

## 4. Entry criteria

- Dev server boots; production deployment serves current bundle on all aliases
- Supabase project reachable; migrations `due_date`, `description`, `recurrence` applied
- A disposable test account with a controllable mailbox (mail.tm pattern) exists

## 5. Exit criteria

- 100% of P0 cases pass; ≥95% of P1; no open Sev-1/Sev-2 defects
- Zero console errors across the P0/P1 journeys
- All High-suitability cases represented in the unit suite

## 6. Defect severity guide

- **Sev-1:** data loss, security breach, auth broken, crash loop
- **Sev-2:** feature broken with no workaround (e.g., recurrence spawn fails)
- **Sev-3:** feature broken with workaround, or wrong-but-recoverable state (e.g., count mismatch)
- **Sev-4:** cosmetic/copy

## 7. Environments

| Env | Purpose | Notes |
|---|---|---|
| Local sandbox (port 5174) | All automated UI/API tests | Separate origin; disposable account |
| Production (littlelist-app + aliases) | Post-deploy smoke only | P0 smoke set after each deploy |
| Supabase dashboard/API | RLS verification, config | Personal access token, read-mostly |

## 8. Known open findings at plan time (from requirement analysis)

1. Tag name length: UI allows 80 chars, DB constraint rejects >40 — see `analysis/missing-requirements.md` MR-03.
2. Today/Upcoming sidebar counts include completed tasks — MR-08.
3. Plan-required features absent (password reset/change, account deletion, sorting, manual ordering, reminders, exports, activity log, rate limiting, pagination, offline handling) — MR-01/02/06/09/11/12/14/15.
