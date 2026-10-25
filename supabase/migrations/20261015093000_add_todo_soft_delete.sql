alter table public.todos
  add column if not exists deleted_at timestamptz;
