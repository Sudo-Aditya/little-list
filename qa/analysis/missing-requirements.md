# Missing / Ambiguous Requirements

Findings from Principal-QA requirement analysis. Each is grounded in the shipped product or in `docs/project-notes/plan.txt` (the master requirements doc). Severity uses the test plan's guide.

## Defect-level findings (behavior contradicts itself)

### MR-01 — Tag name length: UI allows 80, database rejects >40 (Sev-3)
`supabase/schema.sql` constrains `tags.name` to 1–40 characters; the tag create/rename inputs set `maxLength="80"`. Typing a 41–80-character name passes the UI and fails at the DB with a raw error. **Fix:** align the UI to 40 (or widen the constraint deliberately).
*Covered by:* NEG-VAL-04, BND-LEN-07/08.

### MR-02 — Undo window duration is unspecified (Sev-4)
The undo notice disappears after 10 seconds (hardcoded). No requirement defines the window, whether it should pause on hover, or whether the task should be restorable elsewhere (it is — via Trash). Needs a product decision.

### MR-03 — Raw database errors surface to users (Sev-3)
Several failure paths (duplicate project name, tag length, RLS violations) display the Postgres/PostgREST message verbatim in the error notice. The plan (§32) requires understandable, actionable messages and forbids exposing internal errors. A mapping layer is missing.

### MR-04 — Today/Upcoming counts and lists include completed tasks (Sev-3)
`todayCount` counts all non-deleted tasks with `due_date <= today` — including completed ones — and the Today view lists them too. Todoist's Today shows only incomplete tasks plus a collapsed "completed" group. Product decision needed: exclude completed, or group them.

### MR-05 — Search scope is titles only (Sev-4 vs plan §11)
Plan requires search over title **and description** at minimum ("where practical: tags, project names"). Current implementation filters titles only. Descriptions, tags, and project names are unsearchable.

## Plan-required but not implemented (gap register)

| ID | Plan ref | Requirement | Status | Sev |
|---|---|---|---|---|
| MR-06 | §1 | Password reset / password change / account deletion | Not built | Sev-2 (users locked out of recovery paths) |
| MR-07 | §2/§3 | Task archive state, duplicate action | Not built (only soft delete exists) | Sev-4 |
| MR-08 | §5 | Project description / user-chosen color / icon (schema has columns; UI never sets them — colors are auto-assigned) | Partial | Sev-4 |
| MR-09 | §13 | Sorting (due/priority/created/updated/alpha) and persistent manual ordering | Not built — lists are `created_at desc` | Sev-3 |
| MR-10 | §10 | Reminders (separate from due dates; background jobs) | Not built | Sev-3 |
| MR-11 | §18 | Activity history | Not built | Sev-4 |
| MR-12 | §20/§39 | Offline handling, optimistic updates with revert, conflict resolution | Not built (failure paths keep drafts, but no sync model) | Sev-3 |
| MR-13 | §23 | Keyboard shortcuts (N, /, Escape is partially there) | Partial | Sev-4 |
| MR-14 | §24 | Settings: account/appearance (dark mode)/defaults/timezone | Not built | Sev-3 |
| MR-15 | §25 | Data export (JSON/CSV) | Not built | Sev-3 |
| MR-16 | §31 | Pagination/virtualization for large lists | Not built — full list loads | Sev-3 (scales poorly) |
| MR-17 | §41 | Rate limiting on auth endpoints | Supabase platform defaults only | Sev-3 |
| MR-18 | §8/§24 | Timezone preference — date-only due dates sidestep it today, but `due_at` (time-of-day) support will require it | Deferred by design (documented decision) | Sev-4 |

## Ambiguities needing a ruling

1. **AM-1 — Trash retention:** no retention policy; trashed items persist forever until manually purged. Intended?
2. **AM-2 — Recurrence anchor:** next occurrence derives from the *task's due date* (or today when null). If a user completes a weekly task 3 days late, the next instance is still due 7 days after the original due date — Todoist calls this "lazy recurrence" and offers both modes. Which does Little List want? (Current: strict-from-due-date.)
3. **AM-3 — Editing a recurrence rule:** no UI edits `recurrence` after creation (quick add only). Clearing a recurrence is impossible without deleting the task.
4. **AM-4 — Due-date editing on subtasks:** the due picker renders on every row; subtask due dates don't roll up to parent display (progress is completion-only). Intended?
5. **AM-5 — Quick add inside a project view:** adding from the modal while a project is selected files the task into that project unless `#` overrides. Mirrors Todoist, but should Today/Upcoming bucket views also inherit (they currently do — a task quick-added from Today goes to no-project but the view is due-filtered, so the new task may be invisible there)?
6. **AM-6 — Empty-state Add button scope:** the actionable "Add task" button renders only for the Inbox empty state; Active/Done/Today/Upcoming empty states have no action. Inconsistent.
7. **AM-7 — Search + subtasks:** search filters titles flat; a matched subtask renders as a standalone row (grouping applies, but a matched child of an unmatched parent shows alone). Confirm intended.
8. **AM-8 — Sign-up redirect for non-allow-listed origins:** documented fallback sends users to the Site URL, which is currently an *alias* domain (`little-list-anaiks-projects.vercel.app`), not the canonical `littlelist-app.vercel.app`. Confirm which domain should be Site URL.
