# Todoist feature study — what to clone into Little List

Sources: Todoist API v1 (`https://api.todoist.com/api/v1`, queried live with a user token on 2026-10-24), the official developer reference (`developer.todoist.com/api/v1`), and Todoist's documented quick-add behavior. The API token cannot log into the web UI, so the web app itself was not browsed; the API exposes the full data model the UI is built on.

## 1. Todoist data model (from the live API)

Project: `id`, `name`, `description`, `parent_id` (sub-projects), `child_order` + `order_key` (fractional manual ordering), `color` (named color), `is_favorite`, `is_archived`, `is_deleted`, `view_style` (list/board), `inbox_project` flag, `is_shared` (collaboration), `role`.

Task: `content` (title), `description` (separate long-form field), `project_id`, `section_id`, `parent_id` (arbitrary-depth subtasks), `child_order` + `order_key` (fractional ordering within parent), `day_order` (Today-view ordering), `labels[]`, `priority` (1–4, API: 1 = lowest; UI shows P1 = most urgent red flag down to P4 = default, no flag), `due` object, `deadline` object (separate from due!), `duration` (amount + unit), `checked`, `is_deleted`, `completed_at`, `added_at`, `note_count` (comments), `postponed_count`.

`due` object: `{ date: "YYYY-MM-DD" | "YYYY-MM-DDTHH:MM:SS", is_recurring: bool, string: "every day" | "tomorrow at 9", lang, timezone }` — recurrence lives inside `due.is_recurring` + `string`, not a separate table. `deadline` is a hard date without time (different from due).

Section: `id`, `project_id`, `name`, `child_order`. Label: `id`, `name`, `color`, `is_favorite`, `order`.

Comment: per task or project. Filters: user-defined query strings (sync API). Activity: full event log via sync API.

## 2. Todoist quick add syntax (the signature UX)

Typing into the quick-add bar parses structured tokens out of plain text:

| Token | Example | Meaning |
|---|---|---|
| `#Name` | `#Errands` | Move task to project (autocomplete after `#`) |
| `#/Name` | `#Errands/Groceries` | Project section |
| `@Name` | `@home` | Apply label |
| `p1`–`p4` | `p1` | Priority (p1 = most urgent / red, p4 = default) |
| Dates | `today`, `tomorrow`, `next week`, `mon`, `24 oct`, `in 3 days` | Due date |
| Time | `today 9am`, `tom 14:00` | Due date + time |
| Recurrence | `every day`, `every monday`, `ev week`, `every !month` (lazy) | Recurring due date |
| `+Name` | `+Anna` | Assignee (shared projects) |
| `//` | `Buy milk // low fat` | Everything after `//` is the task description |

## 3. Todoist views and UX patterns

- Sidebar: Inbox (always), Favorites, Projects (collapsible, favorites pinned, counts), Labels, Filters.
- Top-level views: **Today** (overdue + due today, ordered by `day_order`), **Upcoming** (grouped by day), plus project views.
- Task row: checkbox, title, (description preview), flags for P1–P3, labels as colored chips, due date ("Today" in green, "Overdue" in red, "tomorrow", full dates), project name (when viewing outside the project), subtask progress (n/m).
- Quick add at top of every list; Enter saves, Escape cancels; natural-language parsing with token highlighting/autocomplete.
- Manual ordering everywhere via drag-and-drop with fractional `order_key` (no full-list renumbering); mobile has move-to-top/bottom actions.
- Completed tasks: move to a project-scoped completed history; recurring tasks spawn the next instance on completion.
- Karma/streaks, activity log, comments, reminders (push/email; separate from due), themes, filters (saved queries like `today & p1`), join-a-project sharing.

## 4. Little List today vs Todoist (gap analysis)

| Area | Todoist | Little List | Gap |
|---|---|---|---|
| Projects | Sub-projects, sections, colors, favorites, board view | Flat projects, no sections, single accent color, list only | Big |
| Priorities | 4 flags, p1 red … p4 default, quick-add `p1` | none/low/medium/high/urgent as select list | Cosmetic + parser |
| Due dates | Date+time, timezones, recurring, deadlines | `date`-only column exists in schema but migration NOT yet applied to production | **Migration pending** |
| Views | Today, Upcoming (day-grouped) | Inbox/Active/Done/Trash only | Today/Upcoming missing |
| Quick add | Full NL parsing | Plain title only | Parser missing |
| Ordering | Manual fractional order, drag | created_at desc | Big |
| Subtasks | Unlimited depth | One level | Medium |
| Labels | Colored, favorites | Single-color tags | Cosmetic |
| Task description | Separate long field | Missing | Medium |
| Comments / activity / karma / collaboration / reminders | Yes | No | Later phases |

## 5. What was implemented now (milestone 1, no schema change)

1. **Todoist-style priority flags**: Little List's five DB levels now render as Todoist flags — `urgent` = P1 (red), `high` = P2 (orange), `medium` = P3 (yellow), `low` = P4 (gray flag), `none` = no flag — in rows, filters, and the row select ("P1 · Urgent", …). Priority semantics (P1 most urgent) match Todoist's UI, not its API's inverted numbers.
2. **Quick-add natural-language parsing** (`src/services/quick-add.js`, unit-tested): `#Project`, `@tag`, `p1`–`p4`, and date phrases (`today`, `tomorrow`, `next week`, weekday names) are parsed out of the quick-add input; parsed project/tag/priority apply on creation. Date phrases apply only when the backend supports due dates; otherwise the date words stay in the title so nothing is silently lost.
3. **Today and Upcoming views**: sidebar entries with live counts, shown only when due dates are supported by the backend (i.e., after the due-date migration is applied). Today = overdue + due today; Upcoming = later dates, ordered by date.

## 6. Roadmap for the rest (in order)

1. **Apply the due-date migration** (already in `supabase/migrations/20261024000000_add_todo_due_date.sql`) — unblocks dates everywhere in production.
2. Date+time due dates with a user timezone preference (plan.txt section 8) and a small date picker styled like Todoist's.
3. Recurring due dates: store `recurrence` text on the task (needs a column), spawn the next instance on completion (idempotent, no unbounded future tasks — plan.txt sections 9/40).
4. Sections inside projects (needs a `sections` table + migration) and sub-projects (parent_id on projects).
5. Task description field (needs a column) with `//` quick-add support.
6. Manual ordering with fractional `order_key` (needs a column) and drag-and-drop.
7. Colored labels, filter queries, activity log, comments — later.
