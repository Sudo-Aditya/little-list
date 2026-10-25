# Assumptions Requiring Clarification

Assumptions the test design currently makes. Each is safe for now (matches shipped behavior) but is not contractually specified — confirm or correct, then update the affected cases.

| # | Assumption | Why it matters | Affected cases | Ask the product owner |
|---|---|---|---|---|
| A-01 | The app is single-user-per-account; no sharing/collaboration exists, so no cross-user *interaction* cases (assignments, comments) are in scope | Plan defers collaboration; all RLS cases assume isolation only | FS-14, NEG-SEC-* | Confirm collaboration stays out of scope for this cycle |
| A-02 | Email confirmation is required (`mailer_autoconfirm = false`) and the built-in Supabase SMTP is acceptable for the friends rollout until custom SMTP is configured | FS-01's timing and reliability depend on it | FS-01, NEG-AUTH-03 | Will a custom SMTP be provided before invites? |
| A-03 | The 10-second undo window is acceptable as-is | Users may expect longer | BND-TIME-01/02, MR-02 | Formalize the window (and whether hover pauses it) |
| A-04 | Date-only due dates mean "that calendar day in the viewer's local timezone" — no server-timezone interpretation | All date math (overdue/today/week) runs browser-local | BND-TIME-03/04/05, EQV-DATE-* | Confirm until `due_at` (time-of-day) arrives with a timezone preference |
| A-05 | Recurrence is strict-from-due-date (completing late does not shift the series) | Different from Todoist's optional lazy mode | ST-12/15, AM-2 | Pick strict vs lazy; document |
| A-06 | Trash has unlimited retention; permanent delete is manual-only | Retention policy affects storage and expectations | FS-06, AM-1 | Decide retention (e.g., 30 days auto-purge) |
| A-07 | Sidebar counts exclude trashed items; Done count excludes trashed-completed | Count/list consistency expectations | POS-VIEW-01, MR-04 | Confirm the completed-in-Today ruling at the same time |
| A-08 | Tag colors are auto-assigned deterministically; user color choice is future work | Visual regression scope | POS-COL-01 | Confirm no user-picked colors this cycle |
| A-09 | Search is title-only, case-insensitive substring | Scope of "searchable" content | POS-SRCH-01/02, MR-05 | Decide whether descriptions/tags join the index |
| A-10 | Subtasks inherit project + tags at creation but do **not** stay in sync afterward (later parent tag changes don't propagate) | User expectation of inheritance | POS-SUB-02 | Confirm one-time copy is intended |
| A-11 | One-level subtask nesting is a hard product limit (not a phased constraint) | Affects structure edge cases | NEG-SEC-06, ST-08 | Confirm before building deeper nesting cases |
| A-12 | Production canonical URL is `littlelist-app.vercel.app`; the alias currently set as Supabase Site URL is a misconfiguration risk | Confirmation emails land users on the alias domain | AM-8, FS-01 | Which domain is canonical for Site URL? |
| A-13 | Quick-add tokens consume the **first** match only, and unmatched tokens intentionally remain visible in the title (no silent loss) | Defines "correct" parser behavior | NEG-QA-01…08, EQV-QA-* | Confirm this contract is the spec |
| A-14 | Completing a parent with incomplete subtasks is allowed silently (no warning) | Todoist also allows it; some apps warn | ST-09 | Confirm no confirmation desired |

## How to resolve

For each row, record the ruling in this file (append a "Decision" column entry) and promote any case whose expected result changes from assumption to specified behavior. New cases discovered during ruling get IDs in the owning category file.
