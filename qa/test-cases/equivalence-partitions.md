# Equivalence-Partition Test Cases

Input domains partitioned into classes; one representative per class. "Invalid" classes assert the documented rejection/no-op behavior, never invented messages.

## Priority values (task `priority`)

| Partition | Valid? | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| P1 = `urgent` | valid | EQV-PRI-01 | R-QA-03 | Quick add `X p1` | Stored urgent; red P1 flag | P1 | M | High |
| P2 = `high` | valid | EQV-PRI-02 | R-QA-03 | Quick add `X p2` | Stored high; P2 | P1 | M | High |
| P3 = `medium` | valid | EQV-PRI-03 | R-QA-03 | Quick add `X p3` | Stored medium; P3 | P1 | M | High |
| P4 = `low` | valid | EQV-PRI-04 | R-QA-03 | Quick add `X p4` | Stored low; P4 | P1 | M | High |
| `none` (default) | valid | EQV-PRI-05 | R-PRI-01 | Create task with no token | Priority none; "No priority" shown, no flag | P1 | M | High |
| Any other string | invalid | EQV-PRI-06 | R-PRI-01 | API insert priority=`critical` | DB check-constraint reject | P1 | M | High |

## Quick-add token targets

| Partition | Valid? | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| `#Name` matches existing project (case-insensitive) | consume | EQV-QA-01 | R-QA-01 | `X #ERRANDS` | Project applied, token removed | P0 | H | High |
| `#Name` no such project | keep | EQV-QA-02 | R-QA-07 | `X #ghost` | Token stays in title | P0 | H | High |
| `@Name` matches existing tag | consume | EQV-QA-03 | R-QA-02 | `X @home` | Tag applied | P0 | H | High |
| `@Name` no such tag | keep | EQV-QA-04 | R-QA-07 | `X @ghost` | Stays in title | P0 | H | High |
| Second `#`/`@` token in one string | keep | EQV-QA-05 | R-QA-08 | `X #Errands #Home` | Only first consumed; second stays | P1 | M | High |
| Token preceded by `#`/`@` (e.g. `@p1`) | not a priority | EQV-QA-06 | R-QA-03 | `X @p1` (tag `p1` exists) | Treated as tag | P1 | M | High |

## Date phrases

| Partition | Valid? | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| `today` / `tod` | valid | EQV-DATE-01 | R-QA-04 | Parse | Due = caller's today | P1 | M | High |
| `tomorrow` / `tom` | valid | EQV-DATE-02 | R-QA-04 | Parse | Due = today+1 | P1 | M | High |
| `next week` | valid | EQV-DATE-03 | R-QA-04 | Parse | Due = today+7 | P1 | M | High |
| Weekday name (before/at/after today) | valid | EQV-DATE-04 | R-QA-04 | `monday` on a Saturday | Due = next Monday (or same day when it is that day) | P1 | M | High |
| `next <weekday>` | valid | EQV-DATE-05 | R-QA-04 | `next saturday` on Saturday | Due = +7 | P1 | M | High |
| Any other word | invalid | EQV-DATE-06 | R-QA-07 | `fortnightly` | No date; word untouched | P2 | L | High |
| Date parsing disabled (no column) | n/a | EQV-DATE-07 | R-PORT-01 | `X tomorrow` on old schema | Phrase stays in title | P1 | M | High |

## Recurrence phrases

| Partition | Valid? | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| `every day` (singular, no count) | valid | EQV-REC-01 | R-QA-05 | Parse | `every day`; first due today | P1 | M | High |
| `every N days/weeks/months/years` | valid | EQV-REC-02 | R-QA-05 | `every 3 weeks` | Rule stored; first due today | P1 | M | High |
| `every <weekday>` (full or abbreviated) | valid | EQV-REC-03 | R-QA-05 | `every tue` | Normalized `every tuesday`; first due that weekday | P1 | M | High |
| Pluralized units (`every 3 days`) | valid | EQV-REC-04 | R-QA-05 | Parse | Accepted and normalized | P1 | M | High |
| Non-rule English ("every word") | invalid | EQV-REC-05 | R-QA-07 | `read every word` | No recurrence; title intact | P1 | M | High |
| Weekday + count (`every 2 mondays`) | invalid | EQV-REC-06 | R-QA-05 | Parse | Rejected; stays in title | P2 | L | High |

## View filters

| Partition | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| Status: Inbox/Active/Done/Trash | EQV-VIEW-01 | R-VIEW-01 | Switch each | Correct subset per status | P0 | H | High |
| Priority filter: all / specific / none | EQV-VIEW-02 | R-PRI-03 | Set each | `none` returns only no-priority tasks | P1 | M | High |
| Project filter: all / specific / unassigned | EQV-VIEW-03 | R-PROJ-01 | Set each | `unassigned` = project_id null only | P1 | M | High |
| Due filter: all/no-date/overdue/today/week | EQV-VIEW-04 | R-DATE-03 | Set each | Buckets as defined (week = today…+6) | P1 | M | High |
| Unknown filter value (robustness) | EQV-VIEW-05 | R-VIEW-01 | Call `filterTodos` with `filter="Bogus"` | Falls back to non-deleted (all) — never crashes | P1 | M | High |

## Auth inputs

| Partition | Valid? | Rep. case | Requirement | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| RFC-format email + password ≥6, correct | valid | EQV-AUTH-01 | R-AUTH-02 | Log in | Session established | P0 | H | Med |
| Correct email, wrong password | invalid | EQV-AUTH-02 | R-AUTH-02 | Log in | Error, no session | P0 | H | Med |
| Malformed email (no @) | invalid | EQV-AUTH-03 | R-AUTH-02 | Submit | HTML5 email validation blocks | P2 | L | Med |
| Unconfirmed account | invalid | EQV-AUTH-04 | R-AUTH-01 | Log in | Credential error path (confirmation pending) | P1 | M | Med |
