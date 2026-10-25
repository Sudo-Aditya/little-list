do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.todos'::regclass
      and conname = 'todos_user_id_id_unique'
  ) then
    alter table public.todos
      add constraint todos_user_id_id_unique unique (user_id, id);
  end if;
end
$$;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index if not exists tags_user_name_unique
  on public.tags (user_id, lower(name));

create table if not exists public.todo_tags (
  user_id uuid not null references auth.users (id) on delete cascade,
  todo_id bigint not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, todo_id, tag_id),
  constraint todo_tags_user_todo_fkey
    foreign key (user_id, todo_id)
    references public.todos (user_id, id)
    on delete cascade,
  constraint todo_tags_user_tag_fkey
    foreign key (user_id, tag_id)
    references public.tags (user_id, id)
    on delete cascade
);

create index if not exists todo_tags_user_tag_idx
  on public.todo_tags (user_id, tag_id);

alter table public.tags enable row level security;
alter table public.todo_tags enable row level security;

revoke all on public.tags, public.todo_tags from public, anon, authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, delete on public.todo_tags to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tags' and policyname = 'Users can read their own tags') then
    create policy "Users can read their own tags" on public.tags for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tags' and policyname = 'Users can add their own tags') then
    create policy "Users can add their own tags" on public.tags for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tags' and policyname = 'Users can update their own tags') then
    create policy "Users can update their own tags" on public.tags for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tags' and policyname = 'Users can delete their own tags') then
    create policy "Users can delete their own tags" on public.tags for delete using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'todo_tags' and policyname = 'Users can read their own task tags') then
    create policy "Users can read their own task tags" on public.todo_tags for select using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'todo_tags' and policyname = 'Users can add their own task tags') then
    create policy "Users can add their own task tags" on public.todo_tags for insert with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'todo_tags' and policyname = 'Users can remove their own task tags') then
    create policy "Users can remove their own task tags" on public.todo_tags for delete using ((select auth.uid()) = user_id);
  end if;
end
$$;
