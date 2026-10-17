create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  color text not null default '#426c55' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'folder' check (char_length(icon) between 1 and 32),
  position integer not null default 0 check (position >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index if not exists projects_user_name_unique
  on public.projects (user_id, lower(name));

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.projects'::regclass
      and tgname = 'projects_set_updated_at'
      and not tgisinternal
  ) then
    create trigger projects_set_updated_at
      before update on public.projects
      for each row execute function public.set_project_updated_at();
  end if;
end
$$;

alter table public.projects enable row level security;
revoke all on public.projects from public, anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Users can read their own projects') then
    create policy "Users can read their own projects" on public.projects for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Users can add their own projects') then
    create policy "Users can add their own projects" on public.projects for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Users can update their own projects') then
    create policy "Users can update their own projects" on public.projects for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname = 'Users can delete their own projects') then
    create policy "Users can delete their own projects" on public.projects for delete using ((select auth.uid()) = user_id);
  end if;
end
$$;

alter table public.todos
  add column if not exists project_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_user_project_fkey'
  ) then
    alter table public.todos
      add constraint todos_user_project_fkey
      foreign key (user_id, project_id)
      references public.projects (user_id, id)
      on delete set null (project_id);
  end if;
end
$$;

create index if not exists todos_user_project_idx
  on public.todos (user_id, project_id)
  where deleted_at is null;
