-- Add a recurrence rule to tasks.
--
-- Todoist stores recurrence as a human phrase inside the due object ("every
-- day", "every monday"). Little List stores the normalized phrase on the task
-- and spawns the next occurrence when the current one is completed — no
-- unbounded future tasks, no background job (plan.txt sections 9 and 40).
-- The phrase is produced by the quick-add parser; table-level RLS already
-- governs the column.

alter table public.todos
  add column if not exists recurrence text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_recurrence_check'
  ) then
    alter table public.todos
      add constraint todos_recurrence_check check (char_length(recurrence) <= 100);
  end if;
end
$$;
