# Data-Corruption Analysis — 2026-10-25

Principal-QA corruption study: every realistic sequence of operations that could leave the `todos`/`projects`/`tags` data in an invalid or contradictory state. All scenarios marked **EXECUTED** were run live against the production database using the disposable account (`qa/analysis/corruption-campaign.mjs` — rerunnable; cleans up after itself, 0 leftover rows). "Accepted" means the database permitted the state — i.e., a real integrity gap. "Rejected" means a constraint defended the data.

Schema facts the analysis depends on (verified live):
- `todos.title`: 1–200 chars, **no `btrim` check** (projects and tags have one — inconsistency)
- `todos` has **no `updated_at`** and **no `completed_at`**
- `projects.position`: `>= 0` only — **duplicates allowed**
- `todos.parent_task_id`: self-FK, self-reference blocked; **2-cycles are also blocked by the database** (Postgres rejects the second edge with 400)
- `todos.recurrence`: free text ≤100 — **no rule validation**
- Tag/project name uniqueness: `lower(name)` — **no Unicode normalization (NFC/NFD) collapse**

---

## C-01 — Whitespace-only task title (EXECUTED — ACCEPTED)
**Scenario:** any client that skips client-side trimming (or a direct API call) stores a task titled `"   "`. It renders as an invisible row that owns a slot in every count.
**Test data:** `{ "title": "   ", "user_id": "<uid>" }`
**Setup SQL (as postgres):**
```sql
insert into public.todos (user_id, title) values ('<uid>', '   ');
```
**Expected DB state if guarded:** rejected by a `title = btrim(title)` check (projects/tags have it; todos does not).
**Validation query:**
```sql
select id, char_length(title) as len, (title = btrim(title)) as trimmed
from public.todos where user_id = '<uid>' and title <> btrim(title);
```
**Live result:** ACCEPTED — stored with `len=3`, `trimmed=false`. | Sev-3
**Fix:** add `check (title = btrim(title))` to `todos` (matches projects/tags), plus trim in the API path.

## C-02 — Visually identical duplicate tags (NFC vs NFD) (EXECUTED — ACCEPTED)
**Scenario:** macOS/iOS input often produces NFD (decomposed) forms. `unique (user_id, lower(name))` compares raw code points, so `café` (NFC) and `cafe+◌́` (NFD) are "different" — the user sees two identical tags.
**Test data:** `{"name": "café"}` and `{"name": "cafe\u0301"}` (both normalize to the same NFC string — verified `normalize-equal=true`)
**Setup SQL:**
```sql
insert into public.tags (user_id, name) values ('<uid>', 'café'), ('<uid>', 'cafe' || chr(0x0301));
```
**Expected DB state if guarded:** second insert rejected via `lower(name) = lower(btrim(name))` with a normalization function, or a `normalize`-based unique index (Postgres 13+: `unique (user_id, normalize(name, NFC))`).
**Validation query:**
```sql
select a.id, b.id from public.tags a join public.tags b
  on a.user_id = b.user_id and a.id < b.id
 where normalize(a.name, NFC) = normalize(b.name, NFC);
```
**Live result:** ACCEPTED — both stored (201). Same hole applies to project names. | Sev-3
**Fix:** normalization-aware unique index + normalize on write.

## C-03 — Parent-task cycle (EXECUTED — REJECTED, schema holds)
**Scenario:** A's parent set to B, then B's parent set to A. If stored, the client grouping (`groupVisibleTodos`) sees each task's parent as visible, so **neither renders as a root and both vanish from every view**.
**Test data:** tasks A, B; `PATCH A {parent_task_id: B}` → 204; `PATCH B {parent_task_id: A}` → **400**
**Setup SQL:**
```sql
update public.todos set parent_task_id = <B> where id = <A>;
update public.todos set parent_task_id = <A> where id = <B>;  -- expect rejection
```
**Expected DB state:** second statement rejected — the database actively refuses the cycle.
**Validation query:**
```sql
with recursive chain as (
  select id, parent_task_id, id as origin, 1 as depth from public.todos where parent_task_id is not null
  union all
  select t.id, t.parent_task_id, c.origin, c.depth + 1
  from public.todos t join chain c on t.id = c.parent_task_id
  where c.depth < 100
)
select origin, count(*) from chain group by origin having count(*) > depth;
```
**Live result:** REJECTED (400 on the cycle edge). The composite-FK + check design holds beyond self-reference — stronger than the analysis assumed. | —
**Note:** the defensive `recursive chain` query above remains the standing integrity monitor for any future schema relaxation.

## C-04 — Duplicate project positions (EXECUTED — ACCEPTED)
**Scenario:** direct API insert (or a client reorder bug) sets two projects to the same `position`; ordering becomes ambiguous and reorder operations produce unstable results.
**Test data:** two projects, both `position: 7`
**Setup SQL:**
```sql
update public.projects set position = 7 where id in (<p1>, <p2>);
```
**Expected DB state if guarded:** unique index on `(user_id, position)` among non-archived projects (partial index), or a reorder transaction with fractional keys.
**Validation query:**
```sql
select user_id, position, count(*) from public.projects
where not is_archived group by user_id, position having count(*) > 1;
```
**Live result:** ACCEPTED — both stored at position 7. | Sev-4 (UI reorder self-heals on next drag)
**Fix:** partial unique index or fractional ordering keys (roadmap item: manual ordering).

## C-05 — Mixed trash family (EXECUTED — INCOHERENCE ACCEPTED)
**Scenario:** trash a parent, trash its child, then restore **only the parent**. Result: an active parent whose child is stranded in Trash — the child is invisible in Inbox, un-findable in the parent's view, and easy to permanently delete by accident during Trash cleanup.
**Test data:** parent + child (child.parent_task_id = parent); trash both; restore parent only
**Setup SQL:**
```sql
update public.todos set deleted_at = now() where id in (<parent>, <child>);
update public.todos set deleted_at = null where id = <parent>;
```
**Expected DB state if guarded:** restore cascades to children (or a warning lists trashed children).
**Validation query:**
```sql
select p.id as parent, c.id as child from public.todos p
join public.todos c on c.parent_task_id = p.id
where p.deleted_at is null and c.deleted_at is not null;
```
**Live result:** ACCEPTED — exactly that state. | Sev-3
**Fix:** restoring a parent offers/applies child restore; or restore always cascades to non-permanently-deleted children.

## C-06 — Duplicate future occurrences from complete→uncheck→complete (EXECUTED — ACCEPTED)
**Scenario:** completing a recurring task spawns the next occurrence (client-side). Unchecking the original and completing it again spawns **another** identical occurrence — the user now has two identical future tasks, and each future completion doubles again.
**Test data:** recurring task due 2026-11-06 `every week`; two spawned copies due 2026-11-13
**Setup SQL (emulating two spawns):**
```sql
insert into public.todos (user_id, title, recurrence, due_date)
values ('<uid>', 'C-06 recurring dup', 'every week', '2026-11-13'),  -- x2
       ('<uid>', 'C-06 recurring dup', 'every week', '2026-11-13');
```
**Expected DB state if guarded:** a uniqueness rule per (origin task, occurrence date) — e.g., a `recurrence_origin_id` column with `unique (id, due_date)` on the family, or a generation counter.
**Validation query:**
```sql
select user_id, title, due_date, count(*) from public.todos
where recurrence is not null and deleted_at is null
group by user_id, title, due_date having count(*) > 1;
```
**Live result:** ACCEPTED — 2 identical rows. | Sev-2 (compounds over time)
**Fix:** idempotency key on spawn (see also plan §40).

## C-07 — Garbage recurrence phrase via API (EXECUTED — ACCEPTED)
**Scenario:** the client parser validates `every …` phrases, but the column is free text — a direct API write stores `whenever the moon is full`. The chip renders it; on completion the spawn calculation returns null and **the series silently ends**.
**Test data:** `recurrence: "whenever the moon is full"`
**Setup SQL:**
```sql
update public.todos set recurrence = 'whenever the moon is full' where id = <id>;
```
**Expected DB state if guarded:** rejected by a pattern check (e.g., `recurrence ~ '^every (\d+ )?(day|week|month|year)(s)?( (sun|mon|tue|wed|thu|fri|sat)(day)?)?$'`) or a recurrence-rule table.
**Validation query:**
```sql
select id, recurrence from public.todos
where recurrence is not null
  and recurrence !~ '^every (\d+ )?(days?|weeks?|months?|years?|(sun|mon|tue|wed|thu|fri|sat)(urday|nesday|rsday|day)?)$';
```
**Live result:** ACCEPTED. | Sev-3
**Fix:** CHECK constraint mirroring the parser's grammar.

## C-08 — Recurrence without a due date (EXECUTED — ACCEPTED, undefined state)
**Scenario:** `recurrence: 'every day'`, `due_date: null`. Display shows a recurrence chip with no date; on completion the spawn falls back to "today" — an implicit rule that is nowhere specified.
**Test data:** `recurrence: 'every day'`, `due_date: null`
**Setup SQL:**
```sql
update public.todos set recurrence = 'every day', due_date = null where id = <id>;
```
**Expected DB state if guarded:** `check (recurrence is null or due_date is not null)`.
**Validation query:**
```sql
select id from public.todos where recurrence is not null and due_date is null;
```
**Live result:** ACCEPTED. | Sev-4
**Fix:** constraint above, or spawn/due-date backfill on creation.

## C-09 — Silent lost update between devices (EXECUTED — CONFIRMED)
**Scenario:** two devices read the same task, both edit the description, both PATCH. Last write wins; the first edit vanishes with no warning, no merge, no audit trail. `todos` has no `updated_at` and no version column, so optimistic concurrency (plan §39) is impossible.
**Test data:** task description `original`; concurrent PATCHes `device A edit` / `device B edit`
**Setup SQL (demonstrating the write):**
```sql
update public.todos set description = 'device A edit' where id = <id>;
update public.todos set description = 'device B edit' where id = <id>;  -- silently overwrites
```
**Expected DB state if guarded:** either an `updated_at` bump + client `If-Match`-style precondition (PostgREST supports `If-Match` with a version column), or per-field writes.
**Validation query:**
```sql
-- No updated_at exists, so the loss is undetectable after the fact. Prove the column gap:
select column_name from information_schema.columns
where table_name = 'todos' and column_name in ('updated_at', 'version');
```
**Live result:** CONFIRMED — final value `device B edit`; A's edit vanished silently; the gap query returns zero rows. | Sev-2 (plan §39 explicitly requires version fields)
**Fix:** `updated_at trigger` + conditional update (`and updated_at = <seen>`) returning 409 on conflict.

## C-10 — No completion timestamp (EXECUTED — GAP CONFIRMED)
**Scenario:** `completed = true` is the only record of completion. "When was this done?", "what did I finish this week?", and Todoist-style completed-history views are unanswerable, and plan §3 requires a completion timestamp.
**Test data:** any task completed via API/UI
**Setup SQL:**
```sql
update public.todos set completed = true where id = <id>;
```
**Expected DB state if guarded:** `completed_at timestamptz` set by trigger or API on completion, cleared on reopen.
**Validation query:**
```sql
select column_name from information_schema.columns
where table_name = 'todos' and column_name ilike '%completed%';
```
**Live result:** GAP CONFIRMED — only `completed` exists. | Sev-3
**Fix:** add `completed_at` (set/cleared alongside `completed`).

## C-11 — Backdated or far-future `created_at` via API (ANALYTICAL — not executed)
**Scenario:** PostgREST allows the client to set `created_at` on insert. A client bug (or clock skew) can file a task in the year 2000 or 3000; ordering and any future activity-log trust break.
**Setup SQL:**
```sql
insert into public.todos (user_id, title, created_at) values ('<uid>', 'time traveller', '2001-01-01');
```
**Expected DB state if guarded:** trigger forcing `created_at = now()` (like projects' `updated_at`).
**Validation query:**
```sql
select id from public.todos where created_at > now() + interval '1 day' or created_at < now() - interval '10 years';
```
**Live result:** not executed — schema permits it by inspection. | Sev-4
**Fix:** `before insert` trigger or revoke column-level insert on `created_at`.

## C-12 — Completion of a recurring task via direct API skips the spawn (ANALYTICAL — not executed)
**Scenario:** the spawn-next-occurrence logic lives in the client. Completing a recurring task through any channel other than the app (API, SQL, a future integration) completes it **without** creating the next occurrence — the series silently ends.
**Setup SQL/API:**
```sql
update public.todos set completed = true where id = <recurring-id>;  -- no spawn occurs
```
**Expected DB state if guarded:** a trigger that inserts the next occurrence on completion (server-side rule, idempotent per plan §40), or a recurring-instance table.
**Validation query:**
```sql
select t.id, t.recurrence, t.due_date from public.todos t
where t.completed and t.recurrence is not null
  and not exists (
    select 1 from public.todos n
    where n.user_id = t.user_id and n.title = t.title
      and n.recurrence = t.recurrence and n.created_at > t.completed_at);
```
**Live result:** not executed — client-side spawn is an accepted architectural compromise (documented in the development log), revisit when reminders/background jobs arrive. | Sev-3
**Fix:** move spawn logic into a Postgres function/trigger when server-side execution is added.

---

## Summary

| ID | Corruption | Detected by | Severity | Status |
|---|---|---|---|---|
| C-01 | Whitespace-only task title | validation query | Sev-3 | ACCEPTED — fix: btrim check |
| C-02 | Unicode-identical duplicate tags/projects | join on normalize | Sev-3 | ACCEPTED — fix: normalize index |
| C-03 | Parent-task cycle | recursive chain query | — | **REJECTED by schema** (positive finding) |
| C-04 | Duplicate project positions | group-by having | Sev-4 | ACCEPTED |
| C-05 | Mixed trash family | family join | Sev-3 | ACCEPTED |
| C-06 | Duplicate recurrence spawns | group-by having | Sev-2 | ACCEPTED — fix: idempotency key |
| C-07 | Garbage recurrence phrase | pattern exclusion | Sev-3 | ACCEPTED — fix: CHECK |
| C-08 | Recurrence without due date | null-due check | Sev-4 | ACCEPTED |
| C-09 | Silent lost update (no OCC) | concurrent PATCH | Sev-2 | CONFIRMED — fix: updated_at + preconditions |
| C-10 | No completion timestamp | column check | Sev-3 | GAP — fix: completed_at |
| C-11 | Client-set created_at | range query | Sev-4 | Permitted by schema |
| C-12 | API completion skips recurrence spawn | anti-join | Sev-3 | Architectural compromise, documented |

**Proposed single hardening migration** (fixes C-01, C-05 guard decision aside, C-07, C-08, C-10 and enables C-09 detection):
```sql
alter table public.todos
  add constraint todos_title_btrim_check check (title = btrim(title)) not valid;
alter table public.todos
  add constraint todos_recurrence_format_check
  check (recurrence is null or recurrence ~ '^every (\d+ )?(days?|weeks?|months?|years?|(sun|mon|tue|wed|thu|fri|sat)(urday|nesday|rsday|day)?)$') not valid;
alter table public.todos
  add constraint todos_recurrence_needs_due_date
  check (recurrence is null or due_date is not null) not valid;
alter table public.todos
  add column completed_at timestamptz;
alter table public.todos
  add column updated_at timestamptz not null default now();
create trigger todos_set_updated_at before update on public.todos
  for each row execute function public.set_updated_at();
```
(`NOT VALID` + a separate `validate constraint` pass avoids breaking existing rows; decide C-05's restore semantics and C-09's OCC strategy as product rulings first.)
