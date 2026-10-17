revoke all on public.todos from public, anon, authenticated;
revoke all on sequence public.todos_id_seq from public, anon, authenticated;

grant select, insert, update, delete on public.todos to authenticated;
grant usage, select on sequence public.todos_id_seq to authenticated;
