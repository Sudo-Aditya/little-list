-- Add an optional calendar due date to tasks.
--
-- A plain `date` column stores the calendar day the user picked with no time
-- or timezone attached, so "due 2026-10-24" means that day in the viewer's
-- local calendar. Overdue/today comparisons happen in the browser against the
-- user's local day, which is timezone-correct for date-only due dates.
--
-- Existing rows keep due_date as null (no due date). No new policies or grants
-- are needed: table-level RLS already governs the new column.

alter table public.todos
  add column if not exists due_date date;

-- Supports per-user due-date lookups (overdue, today, upcoming views and
-- filters). Partial: tasks without a due date stay out of the index.
create index if not exists todos_user_due_date_idx
  on public.todos (user_id, due_date)
  where due_date is not null;
