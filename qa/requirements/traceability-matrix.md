# Traceability Matrix

Requirement IDs → shipped behavior → covering test cases → automation status. Requirement IDs are QA-local identifiers for behavior specified in `docs/project-notes/plan.txt` and the shipped product; they are referenced by every case file.

## Authentication & session

| Req ID | Requirement (summary) | Cases | Automation |
|---|---|---|---|
| R-AUTH-01 | Sign up with email confirmation; confirmation link returns to the signup origin (allow-listed) | FS-01, POS-AUTH-04, NEG-AUTH-02/03, EQV-AUTH-04 | Unit: — · UI: Med |
| R-AUTH-02 | Log in with valid credentials; reject invalid | POS-AUTH-01, NEG-AUTH-01, EQV-AUTH-01/02/03, BND-LEN-11 | Med |
| R-AUTH-03 | Sign out affects current device only | POS-AUTH-03, FS-02 | Med |
| R-AUTH-04 | Session persists across reloads | POS-AUTH-02, FS-02 | Med |

## Tasks

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-TASK-01 | Create task via quick-add modal from any view | POS-TASK-01, POS-PROJ-02, FS-03, NEG-NET-01 | Med |
| R-TASK-02 | Title 1–200 code points, trimmed, non-empty | NEG-VAL-01/02, BND-LEN-01…04 | High (`task-validation` suite) |
| R-TASK-03 | Inline edit with Enter/Escape; pending-state guards | POS-TASK-02/03, NEG-CONC-01 | Med |
| R-TASK-04 | Complete / reopen | POS-TASK-04/05, ST-01/02, ST-13 | High (filters) / Med (UI) |
| R-TASK-05 | Soft delete + 10 s undo notice | POS-TASK-06, ST-03/04/06, BND-TIME-01/02 | Med |
| R-TASK-06 | Trash view + restore | POS-TASK-07, ST-05, ST-11, FS-06 | Med |
| R-TASK-07 | Permanent delete only from Trash, confirm-gated | ST-07, NEG-GUARD-01, FS-06 | Med |

## Priorities / projects / tags / subtasks

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-PRI-01 | Priority set per task (5 DB levels) | POS-PRI-01, EQV-PRI-05/06 | High |
| R-PRI-02 | P1–P4 flag display everywhere | POS-PRI-01/02, EQV-PRI-01…04 | High |
| R-PRI-03 | Priority filter composes with all filters | POS-PRI-03, EQV-VIEW-02, FS-11 | High (`filterTodos` suite) |
| R-PROJ-01 | Project CRUD; tasks land in selected project | POS-PROJ-01/02, FS-08 | Med |
| R-PROJ-02 | Name 1–60 chars; case-insensitive unique per user | POS-PROJ-03, NEG-VAL-03, BND-LEN-05/06 | High |
| R-PROJ-03 | Manual reorder persists | POS-PROJ-04, ST-16 | Med |
| R-PROJ-04 | Archive/unarchive; selected-view reset | POS-PROJ-05, ST-16/18 | Med |
| R-PROJ-05 | Delete keeps tasks (no-project) | POS-PROJ-06, ST-17/19 | Med |
| R-TAG-01 | Tag CRUD + assign/unassign + rename propagation + delete cascade | POS-TAG-01…04, NEG-GUARD-03, FS-09 | Med |
| R-TAG-02 | Tag filter view; name 1–40 (DB) | POS-TAG-03, NEG-VAL-04, BND-LEN-07/08 | High |
| R-SUB-01 | Subtasks limited to one level | NEG-SEC-06, FS-10 | Med |
| R-SUB-02 | Inherit project + tags at creation; recurrence spawn copies tags | POS-SUB-02, FS-04 | Med |
| R-SUB-03 | Progress line (non-deleted children); done subtask visible under active parent; hidden line in Trash | POS-SUB-03, ST-09/10/11 | High |
| R-SUB-04 | Parent permanent-delete orphans children safely | ST-08, FS-07 | Med |

## Quick add & parser

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-QA-01 | `#Project` consumes known project | POS-QA-01, EQV-QA-01/02/05 | High (`quick-add` suite) |
| R-QA-02 | `@tag` consumes known tag | POS-QA-02, EQV-QA-03/04 | High |
| R-QA-03 | `p1`–`p4` standalone token; `@p1`/`#p1` are not priorities | POS-QA-03, NEG-QA-03/04, BND-NUM-01/02, EQV-QA-06 | High |
| R-QA-04 | Date phrases set due date | POS-QA-04, EQV-DATE-01…06, BND-CAL-05/06 | High |
| R-QA-05 | `every …` sets recurrence + first due | POS-QA-05, EQV-REC-01…06, NEG-QA-06/07, BND-NUM-03/04 | High |
| R-QA-06 | `//` description separator | POS-QA-06, NEG-QA-08 | High |
| R-QA-07 | Unknown tokens never consumed — remain visible | NEG-QA-01/02/05, EQV-QA-02/04, EQV-DATE-06 | High |
| R-QA-08 | Only first project/tag/date consumed; later ones kept | NEG-QA-05, EQV-QA-05 | High |

## Dates / recurrence / descriptions

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-DATE-01 | Set/clear calendar due date; real-calendar validation | POS-DATE-01/02, NEG-VAL-05/06, BND-CAL-06 | High |
| R-DATE-02 | Chip labels incl. Overdue text | POS-DATE-03, BND-TIME-03 | High |
| R-DATE-03 | Due filter buckets (no-date/overdue/today/week) | FS-11, EQV-VIEW-04, BND-TIME-04 | High |
| R-REC-01 | Phrase normalization + strictly-after next-date math with clamps | POS-REC-01/03, NEG-REC-01…03, BND-CAL-01…04 | High (`recurrence` suite) |
| R-REC-02 | Spawn on completion; failure keeps completion | FS-04, POS-REC-02, ST-12/14/15, NEG-CONC-02 | Med |
| R-DESC-01 | Description field: set, display, edit; ≤2000 | POS-TASK-08, BND-LEN-09/10 | Med |

## Views / search / modal / colors / responsiveness

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-VIEW-01 | Inbox/Active/Done/Trash correct subsets; safe fallback | POS-VIEW-01, EQV-VIEW-01/05 | High |
| R-VIEW-02 | Today = overdue + today (see MR-04 ambiguity) | FS-12, BND-TIME-05 | High/Med |
| R-VIEW-03 | Upcoming = strictly later | FS-12, BND-TIME-05 | High/Med |
| R-VIEW-05 | Toolbar hidden only on genuinely empty views | POS-VIEW-02, BND-UI-01 | Med |
| R-SRCH-01 | Live title search; excludes trashed; empty state | POS-SRCH-01/02, FS-13, BND-UI-02 | Med |
| R-MOD-01 | Modal lifecycle (open/submit/cancel/backdrop/escape; failure keeps open) | POS-QA-07, ST-20/21/22, NEG-NET-01 | Med |
| R-COL-01 | Deterministic project/tag colors | POS-COL-01 | High (`colors` suite) |
| R-RESP-01 | Mobile ≥48 px targets; no overflow at 390/320 px | BND-UI-03/04 | Low |
| R-PORT-01 | Column-fallback chain when migrations missing | FS-15, EQV-DATE-07, NEG-QA-08 | Med |

## Security

| Req ID | Requirement | Cases | Automation |
|---|---|---|---|
| R-SEC-01 | Per-user RLS on all tables; composite FKs block cross-user writes; XSS-safe rendering | FS-14, NEG-SEC-01/03/06, NEG-XSS-01 | High (API) |
| R-SEC-02 | Publishable key only; no secrets served or bundled | NEG-SEC-02/04/05 | High |

## Coverage summary (audited 2026-10-25)

- **182 unique test case IDs** across 6 case files (15 FS, 46 POS, 34 NEG, 30 BND, 34 EQV partitions, 23 ST)
- **High-automation candidates: 78** — the pure-logic subset already maps 1:1 onto the existing `npm test` suites (`task-validation`, `task-priorities`, `task-due-dates`, `quick-add`, `recurrence`, `colors`, `todo-filters`)
- Open items feeding the backlog: 18 missing-requirement findings + 8 ambiguities + 14 assumptions (`analysis/`)
