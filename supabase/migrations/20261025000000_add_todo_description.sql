-- Add a long-form description to tasks, separate from the title.
--
-- Todoist keeps a distinct description field per task (quick-add token: a
-- `//` separator). Stored as plain text with an empty-string default so
-- existing rows are untouched; length is capped to keep payloads sane.
-- Table-level RLS already governs the column; no new policies or grants.

alter table public.todos
  add column if not exists description text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_description_check'
  ) then
    alter table public.todos
      add constraint todos_description_check check (char_length(description) <= 2000);
  end if;
end
$$;
