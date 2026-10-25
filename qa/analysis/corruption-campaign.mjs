// Rerunnable data-corruption campaign (see data-corruption-analysis.md).
//
// Requires credentials via environment variables — never hardcode them here:
//   SUPABASE_ACCESS_TOKEN  personal access token (Management API SQL access)
//   SUPABASE_URL           project URL
//   SUPABASE_ANON_KEY      publishable key
//   QA_ACCOUNT_EMAIL       disposable QA account email
//   QA_ACCOUNT_PASSWORD    disposable QA account password
//
// Run with:  node qa/analysis/corruption-campaign.mjs

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const KEY = process.env.SUPABASE_ANON_KEY;
const QA_EMAIL = process.env.QA_ACCOUNT_EMAIL;
const QA_PASSWORD = process.env.QA_ACCOUNT_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : null;
const headers = { apikey: KEY, "Content-Type": "application/json" };

if (!PAT || !KEY || !URL || !QA_EMAIL || !QA_PASSWORD) {
  console.error("Set SUPABASE_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY, QA_ACCOUNT_EMAIL and QA_ACCOUNT_PASSWORD first.");
  process.exit(1);
}

const auth = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST", headers,
  body: JSON.stringify({ email: QA_EMAIL, password: QA_PASSWORD }),
})).json();
if (!auth.access_token) throw new Error("sign-in failed");
const H = { ...headers, Authorization: `Bearer ${auth.access_token}` };
const uid = auth.user.id;
const created = { todos: [], projects: [], tags: [] };
const log = (id, verdict, detail) => console.log(`${id} | ${verdict} | ${detail}`);

const ins = async (table, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (created[table] && j[0]?.id) created[table].push(j[0].id);
  return { status: r.status, row: j[0], error: j.message || j.error };
};
const patch = async (table, id, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) });
  return { status: r.status, row: (await r.json())[0] };
};
const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  return { status: r.status, rows: await r.json() };
};

// ===== C-01: whitespace-only title via API =====
{
  const r = await ins("todos", { title: "   ", user_id: uid });
  const v = await sql(`select char_length(title) as len, (title = btrim(title)) as trimmed from public.todos where id = ${r.row.id};`);
  log("C-01", r.status === 201 ? "CORRUPTION ACCEPTED" : "rejected", `whitespace-only title stored, len=${v.rows[0]?.len}, btrim-equal=${v.rows[0]?.trimmed}`);
}

// ===== C-02: NFC/NFD unicode duplicate tag names =====
{
  const nfc = "caf\u00e9";
  const nfd = "cafe\u0301";
  const a = await ins("tags", { name: nfc, user_id: uid });
  const b = await ins("tags", { name: nfd, user_id: uid });
  const looksSame = nfc.normalize("NFC") === nfd.normalize("NFC");
  log("C-02", a.status === 201 && b.status === 201 ? "CORRUPTION ACCEPTED" : "rejected", `two visually-identical tags (NFC ${a.status}, NFD ${b.status}), normalize-equal=${looksSame}`);
}

// ===== C-03: two-task parent cycle =====
{
  const a = await ins("todos", { title: "C-03 cycle A", user_id: uid });
  const b = await ins("todos", { title: "C-03 cycle B", user_id: uid });
  await patch("todos", a.row.id, { parent_task_id: b.row.id });
  const r2 = await patch("todos", b.row.id, { parent_task_id: a.row.id });
  const v = await sql(`select count(*)::int as cycle from public.todos where user_id = '${uid}' and id in (${a.row.id}, ${b.row.id}) and parent_task_id is not null;`);
  log("C-03", v.rows[0].cycle === 2 ? "CORRUPTION ACCEPTED" : "rejected", `2-cycle stored — client grouping hides BOTH tasks from every view`);
}

// ===== C-04: duplicate project positions =====
{
  const p1 = await ins("projects", { name: "C-04 pos project 1", user_id: uid, position: 7 });
  const p2 = await ins("projects", { name: "C-04 pos project 2", user_id: uid, position: 7 });
  log("C-04", p1.status === 201 && p2.status === 201 ? "CORRUPTION ACCEPTED" : "rejected", `duplicate position=7 on two projects (ordering ambiguous)`);
}

// ===== C-05: mixed trash family =====
{
  const parent = await ins("todos", { title: "C-05 parent", user_id: uid });
  const child = await ins("todos", { title: "C-05 child", user_id: uid, parent_task_id: parent.row.id });
  await patch("todos", parent.row.id, { deleted_at: new Date().toISOString() });
  await patch("todos", child.row.id, { deleted_at: new Date().toISOString() });
  await patch("todos", parent.row.id, { deleted_at: null });
  const v = await sql(`select (p.deleted_at is null) as parent_active, (c.deleted_at is not null) as child_trashed from public.todos p join public.todos c on c.parent_task_id = p.id where p.id = ${parent.row.id};`);
  log("C-05", v.rows[0].parent_active && v.rows[0].child_trashed ? "INCOHERENCE ACCEPTED" : "rejected", `active parent with trashed child — child invisible in Inbox, stranded in Trash`);
}

// ===== C-06: double-spawn duplicates =====
{
  const t = await ins("todos", { title: "C-06 recurring dup", user_id: uid, recurrence: "every week", due_date: "2026-11-06" });
  const s1 = await ins("todos", { title: "C-06 recurring dup", user_id: uid, recurrence: "every week", due_date: "2026-11-13" });
  const s2 = await ins("todos", { title: "C-06 recurring dup", user_id: uid, recurrence: "every week", due_date: "2026-11-13" });
  const v = await sql(`select count(*)::int as n from public.todos where user_id = '${uid}' and title = 'C-06 recurring dup' and due_date = '2026-11-13';`);
  log("C-06", v.rows[0].n === 2 ? "CORRUPTION ACCEPTED" : "rejected", `two identical future occurrences — no idempotency key on completion spawn`);
}

// ===== C-07: garbage recurrence phrase =====
{
  const r = await ins("todos", { title: "C-07 bad recurrence", user_id: uid, recurrence: "whenever the moon is full", due_date: "2026-11-01" });
  log("C-07", r.status === 201 ? "CORRUPTION ACCEPTED" : "rejected", `meaningless recurrence stored; client spawn returns null — series silently ends`);
}

// ===== C-08: recurrence without due_date =====
{
  const r = await ins("todos", { title: "C-08 recurrence no date", user_id: uid, recurrence: "every day" });
  log("C-08", r.status === 201 ? "ACCEPTED (undefined state)" : "rejected", `recurring task with no due date — spawn falls back to today`);
}

// ===== C-09: lost update (no updated_at / OCC) =====
{
  const t = await ins("todos", { title: "C-09 lost update", user_id: uid, description: "original" });
  const [ra, rb] = await Promise.all([
    patch("todos", t.row.id, { description: "device A edit" }),
    patch("todos", t.row.id, { description: "device B edit" }),
  ]);
  const v = await sql(`select description from public.todos where id = ${t.row.id};`);
  const final = v.rows[0].description;
  log("C-09", "LOST UPDATE (silent)", `both devices wrote concurrently; final description = "${final}" — one edit vanished without warning (todos has no updated_at / version column)`);
}

// ===== C-10: no completion timestamp =====
{
  const t = await ins("todos", { title: "C-10 completed audit gap", user_id: uid });
  await patch("todos", t.row.id, { completed: true });
  const v = await sql(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'todos' and column_name ilike '%completed%';`);
  log("C-10", v.rows.length === 1 ? "GAP CONFIRMED" : "column exists", `completed=true recorded with NO timestamp — "when was this done?" is unanswerable (plan §3 requires completed_at)`);
}

console.log("=== cleanup ===");
for (const id of created.todos) await fetch(`${SUPABASE_URL}/rest/v1/todos?id=eq.${id}`, { method: "DELETE", headers: H });
for (const id of created.projects) await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${id}`, { method: "DELETE", headers: H });
for (const id of created.tags) await fetch(`${SUPABASE_URL}/rest/v1/tags?id=eq.${id}`, { method: "DELETE", headers: H });
const remain = await sql(`select count(*)::int as n from public.todos where user_id = '${uid}' and (title like 'C-0%' or title = '   ');`);
console.log("leftover corruption rows:", remain.rows[0].n);
console.log("=== campaign complete ===");
