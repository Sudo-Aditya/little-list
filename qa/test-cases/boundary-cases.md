# Boundary-Value Test Cases

Edges of every documented limit. Where UI and DB limits differ, the DB limit is the source of truth.

## Text lengths

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| BND-LEN-01 | R-TASK-02 | Modal open | title of exactly 1 char `A` | Submit | Accepted; task `A` created | P1 | M | High |
| BND-LEN-02 | R-TASK-02 | Modal open | exactly 200 chars | Submit | Accepted (limit is inclusive) | P1 | M | High |
| BND-LEN-03 | R-TASK-02 | Edit form (bypass maxLength) | 201 chars | Submit | Rejected by client validation ("200 characters or fewer") | P1 | M | High |
| BND-LEN-04 | R-TASK-02 | Modal open | 200 emoji (400 UTF-16 units, 200 code points) | Submit | Accepted — limit counts code points, matching Postgres `char_length` | P1 | M | High |
| BND-LEN-05 | R-PROJ-02 | Manage menu | project name of exactly 60 chars | Create | Accepted | P2 | L | Med |
| BND-LEN-06 | R-PROJ-02 | Manage menu | 61 chars | Create | Rejected by validation | P2 | L | Med |
| BND-LEN-07 | R-TAG-02 | Manage menu | tag name exactly 40 chars | Create | Accepted (DB limit inclusive) | P1 | M | High |
| BND-LEN-08 | R-TAG-02 | Manage menu | 41 chars | Create | Rejected by DB constraint; error surfaced (UI allows up to 80 — MR-03) | P1 | M | High |
| BND-LEN-09 | R-DESC-01 | Edit form | description exactly 2000 chars | Save | Accepted; renders fully | P2 | L | Med |
| BND-LEN-10 | R-DESC-01 | Edit form | 2001 chars | Save | Blocked/rejected (UI maxLength 2000 + DB check) | P2 | L | Med |
| BND-LEN-11 | R-AUTH-02 | Sign-up form | 6-char password / 7-char | Sign up | Both accepted (6 is the documented minimum) | P2 | L | Med |

## Time windows

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| BND-TIME-01 | R-TASK-05 | Just deleted a task | — | Click Undo at t≈9 s | Restore still works (inside 10-s window) | P2 | L | Med |
| BND-TIME-02 | R-TASK-05 | Just deleted a task | — | Click Undo at t≈11 s | Notice gone; task remains in Trash (restore still possible manually) | P2 | L | Med |
| BND-TIME-03 | R-DATE-02 | Task due today / tomorrow / yesterday | — | Inspect chips | Labels exactly: `Due today`, `Due tomorrow`, `Overdue · <date>` | P1 | M | High |
| BND-TIME-04 | R-DATE-03 | Tasks due today+6 and today+7 | — | Filter Due this week | today+6 included; today+7 excluded (window = today…today+6 inclusive) | P1 | M | High |
| BND-TIME-05 | R-VIEW-02/03 | Tasks due yesterday/today/tomorrow | — | Open Today / Upcoming | Yesterday+today in Today; tomorrow in Upcoming only | P1 | M | High |

## Calendar math

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| BND-CAL-01 | R-REC-01 | Recurring monthly | due 2026-01-31 | Complete | Next = 2026-02-28 (clamped, not Mar 3) | P0 | H | High |
| BND-CAL-02 | R-REC-01 | Recurring yearly | due 2028-02-29 (leap) | Complete | Next = 2029-02-28 | P0 | H | High |
| BND-CAL-03 | R-REC-01 | Recurring yearly | due 2027-02-28 (non-leap) | Complete | Next = 2028-02-28 | P2 | L | High |
| BND-CAL-04 | R-REC-01 | `every 2 months` | due 2026-11-30 | Complete | Next = 2027-01-30 | P2 | L | High |
| BND-CAL-05 | R-QA-04 | Today = Saturday | `next monday` / `next saturday` | Parse both | `next monday` = the coming Monday (no +7); `next saturday` = +7 (same-day pushes to next week) | P1 | M | High |
| BND-CAL-06 | R-DATE-01 | Due picker | 2026-02-29 / 2027-02-29 | Programmatic set | 2026 accepted (leap); 2027 rejected (non-leap impossible date) | P1 | M | High |

## Numeric tokens

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| BND-NUM-01 | R-QA-03 | — | `p1` … `p4` | Parse each | All valid; p1=urgent … p4=low | P1 | M | High |
| BND-NUM-02 | R-QA-03 | — | `p0`, `p5`, `p12` | Parse | None match the standalone-token rule; stay in title | P1 | M | High |
| BND-NUM-03 | R-QA-05 | — | `every 1 day`, `every 99 days`, `every 100 days` | Parse | All valid (1–3-digit counts); normalized `every day` / `every 99 days` / `every 100 days` | P2 | L | High |
| BND-NUM-04 | R-QA-05 | — | `every 1000 days` (4 digits) | Parse | Count regex is 1–3 digits; not consumed as recurrence | P3 | L | High |

## UI thresholds

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| BND-UI-01 | R-VIEW-05 | View with 1 pre-filter task | — | Open view | Toolbar visible (any non-empty view keeps filters reachable) | P3 | L | Med |
| BND-UI-02 | R-SRCH-01 | Any state | 1-char query `o` | Type | Live results update (no minimum query length) | P3 | L | Med |
| BND-UI-03 | R-RESP-01 | Mobile viewport 390 px | — | Walk sidebar → rows → modal | 48 px touch targets; no horizontal overflow; modal fits width | P1 | M | Low |
| BND-UI-04 | R-RESP-01 | Narrow viewport 320 px | long title | Render | Title wraps (`overflow-wrap: anywhere`); no layout break | P2 | L | Low |
