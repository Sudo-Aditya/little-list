# Little List API QA Suite

Formal API test campaigns against the Little List backend (Supabase Auth + PostgREST), in four frameworks. All credentials come from environment variables — nothing is hardcoded.

## Test surface

The backend is Supabase: `POST /auth/v1/*` (login/signup) and PostgREST `/rest/v1/{todos,projects,tags,todo_tags}` with RLS. The contract endpoint (`GET /rest/v1/`, OpenAPI) requires a secret key, so contract coverage uses response-shape assertions instead.

## 1. pytest (primary — executed live, 63/63 passing)

```sh
cd qa/api/pytest
export LITTLELIST_URL=https://<project-ref>.supabase.co
export LITTLELIST_ANON_KEY=<publishable key>
export QA_EMAIL_A=<confirmed disposable account>
export QA_PASS_A=<password>
export SUPABASE_ACCESS_TOKEN=<personal access token>   # for user B creation
python -m pytest test_little_list_api.py -v
```

Coverage (63 tests): contract shape, missing params, invalid params, boundary values (title 1/200/201, description 2000/2001, recurrence 100/101, project 60/61, tag 40/41, due-date extremes), auth failures, RLS authorization (cross-user read/patch/delete/insert), rate-limit burst, pagination (count header, limit/offset, beyond-end), sorting/filtering, idempotency duplicates, concurrency (parallel writes/inserts), malformed JSON, unexpected content types, huge payloads, version headers.

**Known documented behaviors asserted as-is** (findings, not bugs of the suite): duplicate POSTs create duplicates (no idempotency layer, C-06); concurrent writes are last-write-wins (no OCC, C-09); RLS-hidden PATCH/DELETE are silent no-ops (200/204).

## 2. Postman (pushed to workspace)

- `little-list.postman_collection.json` — 27 requests in 12 folders with `pm.test` assertions
- `little-list.postman_environment.json` — set base_url/anon_key/email/password, run **Login** first (captures access_token/uid)
- `generate_collection.py` — regenerates both; pushes to the workspace when `POSTMAN_API_KEY` is set

## 3. Playwright (API request context)

```sh
cd qa/api/playwright && npm i -D @playwright/test
export LITTLELIST_URL=... LITTLELIST_ANON_KEY=... QA_EMAIL_A=... QA_PASS_A=...
npx playwright test tests/api
```

## 4. REST Assured (JUnit 5)

```sh
cd qa/api/restassured
export LITTLELIST_URL=... LITTLELIST_ANON_KEY=... QA_EMAIL_A=... QA_PASS_A=...
mvn test
```

## Findings feeding the backlog

- C-06 duplicate spawns/POSTs (no idempotency layer) — Sev-2
- C-09 silent lost updates (no OCC) — Sev-2
- Raw Postgres errors surface to clients — Sev-3 (MR-03)
- Built-in SMTP rate limit (429 on signup) blocks new-user creation — needs custom SMTP
- Anonymous OpenAPI endpoint requires a secret key — documented; shape assertions used instead
