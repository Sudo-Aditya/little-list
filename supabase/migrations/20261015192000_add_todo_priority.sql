alter table public.todos
  add column if not exists priority text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_priority_check'
  ) then
    alter table public.todos
      add constraint todos_priority_check
      check (priority in ('none', 'low', 'medium', 'high', 'urgent'));
  end if;
end
$$;
