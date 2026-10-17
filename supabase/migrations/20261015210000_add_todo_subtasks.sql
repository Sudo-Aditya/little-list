alter table public.todos
  add column if not exists parent_task_id bigint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_user_parent_task_fkey'
  ) then
    alter table public.todos
      add constraint todos_user_parent_task_fkey
      foreign key (user_id, parent_task_id)
      references public.todos (user_id, id)
      on delete set null (parent_task_id);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_parent_task_not_self_check'
  ) then
    alter table public.todos
      add constraint todos_parent_task_not_self_check
      check (parent_task_id is null or parent_task_id <> id);
  end if;
end
$$;

create index if not exists todos_user_parent_task_idx
  on public.todos (user_id, parent_task_id)
  where parent_task_id is not null;

create or replace function public.validate_todo_parent_task()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_task_id is null then
    return new;
  end if;

  if new.parent_task_id = new.id then
    raise exception 'A task cannot be its own parent.';
  end if;

  if new.deleted_at is not null then
    raise exception 'A deleted task cannot be a subtask.';
  end if;

  if exists (
    select 1 from public.todos parent
    where parent.user_id = new.user_id
      and parent.id = new.parent_task_id
      and parent.parent_task_id is not null
  ) then
    raise exception 'Subtasks can only be added to top-level tasks.';
  end if;

  if exists (
    select 1 from public.todos child
    where child.user_id = new.user_id
      and child.parent_task_id = new.id
  ) then
    raise exception 'A task with subtasks cannot become a subtask.';
  end if;

  if exists (
    select 1 from public.todos parent
    where parent.user_id = new.user_id
      and parent.id = new.parent_task_id
      and parent.deleted_at is not null
  ) then
    raise exception 'A deleted task cannot contain subtasks.';
  end if;

  return new;
end;
$$;

create trigger todos_validate_parent_task
  before insert or update of user_id, parent_task_id
  on public.todos
  for each row execute function public.validate_todo_parent_task();
