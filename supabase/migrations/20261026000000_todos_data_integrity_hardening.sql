-- Data-integrity hardening from the corruption analysis (C-01, C-07, C-08, C-10,
-- C-11 in qa/analysis/data-corruption-analysis.md). All constraints are added
-- against the current dataset, which was verified clean of violations.

-- C-01: todos.title lacked the btrim check that projects/tags have.
alter table public.todos
  add constraint todos_title_btrim_check check (title = btrim(title));

-- C-07: recurrence is a validated phrase, not free text.
alter table public.todos
  add constraint todos_recurrence_format_check
  check (recurrence is null or recurrence ~ '^every (\d+ )?(days?|weeks?|months?|years?|(sun|mon|tue|wed|thu|fri|sat)(urday|nesday|rsday|day)?)$');

-- C-08: a recurrence rule without a due date has undefined spawn semantics.
alter table public.todos
  add constraint todos_recurrence_needs_due_date
  check (recurrence is null or due_date is not null);

-- C-10: completion timestamp (plan §3).
alter table public.todos
  add column if not exists completed_at timestamptz;

update public.todos set completed_at = now() where completed and completed_at is null;

-- The timestamp then tracks the completed boolean (set on complete, cleared on
-- reopen) — mirrors the trigger in schema.sql so fresh installs behave alike.
create or replace function public.todos_maintain_completion_timestamp()
returns trigger language plpgsql as $$
begin
  if new.completed and not coalesce(old.completed, false) then
    new.completed_at = now();
  elsif not new.completed then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger todos_maintain_completion_timestamp
  before update on public.todos
  for each row execute function public.todos_maintain_completion_timestamp();

-- C-11: created_at is server-assigned truth, not client-supplied.
create or replace function public.todos_force_created_at()
returns trigger language plpgsql as $$
begin
  new.created_at = now();
  return new;
end;
$$;

create trigger todos_force_created_at
  before insert on public.todos
  for each row execute function public.todos_force_created_at();

-- C-09 (foundation): updated_at makes concurrent overwrites detectable; the
-- optimistic-concurrency client change builds on this.
alter table public.todos
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.todos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.todos_set_updated_at();
