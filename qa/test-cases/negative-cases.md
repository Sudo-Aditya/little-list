# Negative Test Cases

Invalid inputs, error paths, and abuse attempts. Expected results reflect actual implemented behavior — including cases where the DB (not the UI) rejects the input, which is a valid but noteworthy behavior.

## Validation

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-VAL-01 | R-TASK-02 | Modal open | `` (empty) / `"   "` | Attempt submit | Add button disabled for empty; whitespace-only shows "Title cannot be empty." style error; no request sent | P0 | H | High |
| NEG-VAL-02 | R-TASK-02 | Edit form open | 201+ chars (paste, bypassing maxLength) | Programmatic submit | Client validation rejects (>200); no DB call | P0 | H | High |
| NEG-VAL-03 | R-PROJ-02 | `Errands` exists | `errands` (different case) | Create project | Rejected by case-insensitive unique constraint; error notice shown; no duplicate created | P1 | M | High |
| NEG-VAL-04 | R-TAG-02 | — | 41–80-char tag name (UI maxLength is 80) | Create tag | **DB rejects >40** (`char_length` 1–40) with raw error surfaced — known UI/DB mismatch (MR-03) | P1 | M | High |
| NEG-VAL-05 | R-DATE-01 | Due picker open | `2026-02-30` | Programmatic set | `validateDueDate` rejects impossible calendar date; error shown; due_date unchanged | P1 | M | High |
| NEG-VAL-06 | R-DATE-01 | Due picker open | `24/10/2026` | Programmatic set | Malformed format rejected ("must be a valid date") | P2 | L | High |
| NEG-AUTH-01 | R-AUTH-02 | Signed out | wrong password | Log in | Supabase error shown inline; no session | P0 | H | Med |
| NEG-AUTH-02 | R-AUTH-02 | Signed out | 5-char password | Sign up | HTML `minLength=6` blocks; no request | P1 | M | Med |
| NEG-AUTH-03 | R-AUTH-01 | Signed out | unconfirmed account | Log in | Auth error surfaced (confirmation still pending); flows through the same error notice | P1 | M | Med |

## Quick-add parser

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-QA-01 | R-QA-07 | No project named `nowhere` | `Task #nowhere` | Quick add | Token NOT consumed; title keeps `#nowhere` verbatim | P0 | H | High |
| NEG-QA-02 | R-QA-07 | No matching tag | `Task @nobody` | Quick add | Title keeps `@nobody`; no tag assigned | P1 | M | High |
| NEG-QA-03 | R-QA-03 | — | `Fix p0` / `Fix p5` | Quick add | Not a priority token; stays in title | P1 | M | High |
| NEG-QA-04 | R-QA-03 | Tag `p2` exists | `Check @p2` | Quick add | Treated as tag reference, NOT priority | P1 | M | High |
| NEG-QA-05 | R-QA-08 | — | `A today today` | Quick add | Only first date token consumed; second `today` remains in title (nothing silently dropped) | P1 | M | High |
| NEG-QA-06 | R-QA-05 | — | `Party every fortnight` | Quick add | Phrase not recognized as recurrence; stays in title; no recurrence stored | P1 | M | High |
| NEG-QA-07 | R-QA-05 | — | `Xmas every 0 days` | Quick add | Count 0 rejected; phrase stays in title | P2 | L | High |
| NEG-QA-08 | R-QA-06 | Description column missing | `Milk // oat` | Quick add | `//` and text stay in the title (graceful degradation) | P1 | M | High |

## Recurrence math

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-REC-01 | R-REC-01 | — | `every 2 mondays` (weekday + count) | Parse | Rejected (weekday rules must be count 1); not stored | P2 | L | High |
| NEG-REC-02 | R-REC-01 | Task due Saturday | `every saturday` | Complete | Next = next Saturday (+7), never same day | P1 | M | High |
| NEG-REC-03 | R-REC-01 | — | unknown phrase passed to next-date calc | Compute | Returns null (no guess); spawn skipped | P1 | M | High |

## Destructive-action guards

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-GUARD-01 | R-TASK-07 | Trash has item | — | × → Cancel dialog | Item remains in Trash | P0 | H | Med |
| NEG-GUARD-02 | R-PROJ-05 | Project has tasks | — | Delete → Cancel | Project intact, tasks intact | P0 | H | Med |
| NEG-GUARD-03 | R-TAG-01 | Tag assigned to tasks | — | Delete → Cancel | Tag and assignments intact | P1 | M | Med |
| NEG-GUARD-04 | R-TASK-05 | Undo notice visible | — | Wait >10 s without clicking | Notice disappears; task stays in Trash (undo opportunity lapsed) | P2 | L | Med |

## Security

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-SEC-01 | R-SEC-01 | Two accounts A/B | A's task ID | As B, REST GET that ID | Empty result set (RLS) — never A's data | P0 | H | High |
| NEG-SEC-02 | R-SEC-01 | Signed out | any | REST GET /todos with anon key | 401/42501 — denied | P0 | H | High |
| NEG-SEC-03 | R-SEC-01 | Account B | A's project ID | As B, INSERT task into A's project | Rejected — composite (user_id, project_id) FK prevents cross-user assignment | P0 | H | High |
| NEG-SEC-04 | R-SEC-02 | Deployed site | — | Fetch `/.env.local` | 404 — no secrets served | P1 | H | High |
| NEG-SEC-05 | R-SEC-02 | Repo + bundle | — | Scan built JS for `service_role`, DB password | Absent — publishable key only | P1 | H | High |
| NEG-SEC-06 | R-SUB-01 | Subtask row | — | Inspect subtask row actions | No "+ Subtask" control — one-level nesting enforced | P1 | M | Med |

## Concurrency & failure

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| NEG-CONC-01 | R-TASK-03 | Slow network (throttled) | — | Double-click checkbox / Save | Second action ignored while first pending (controls disabled) — no duplicate writes | P1 | M | Med |
| NEG-CONC-02 | R-REC-02 | Offline simulation on spawn | recurring task | Complete while spawn request fails | Completion persisted; explicit error "next occurrence couldn't be created"; no partial spawn | P1 | H | Med |
| NEG-NET-01 | R-TASK-01 | Network disabled | valid task | Submit modal | Modal stays open with connection error; nothing lost | P2 | M | Med |
| NEG-XSS-01 | R-SEC-01 | — | `<img src=x onerror=alert(1)>` as title | Create + view list | Rendered as inert text (React escaping); no execution | P1 | H | Med |
