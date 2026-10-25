import { test, expect } from "@playwright/test";

/**
 * Little List API tests (Supabase Auth + PostgREST) — Playwright `request` context.
 *
 * Setup (qa/api/playwright/README.md): npm i -D @playwright/test, then set env vars
 * LITTLELIST_URL, LITTLELIST_ANON_KEY, QA_EMAIL_A, QA_PASS_A before `npx playwright test`.
 * Run: npx playwright test qa/api/playwright/tests/api --config=qa/api/playwright/playwright.config.ts
 */

const BASE_URL = process.env.LITTLELIST_URL ?? "https://YOUR-PROJECT.supabase.co";
const ANON_KEY = process.env.LITTLELIST_ANON_KEY ?? "YOUR-PUBLISHABLE-KEY";
const EMAIL = process.env.QA_EMAIL_A ?? "your-qa-account@example.com";
const PASSWORD = process.env.QA_PASS_A ?? "your-qa-password";

let access_token = "";
let uid = "";

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${BASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  access_token = body.access_token;
  uid = body.user.id;
});

const authHeaders = () => ({
  apikey: ANON_KEY,
  Authorization: `Bearer ${access_token}`,
  "Content-Type": "application/json",
});

let createdId: string | undefined;

test.describe("Contract", () => {
  test("task shape matches schema", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?limit=1`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    const rows = await res.json();
    if (rows.length) {
      for (const field of ["id", "title", "completed", "priority", "created_at"])
        expect(rows[0]).toHaveProperty(field);
    }
  });

  test("gateway version header", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?limit=1`, { headers: authHeaders() });
    expect(res.headers()["sb-gateway-version"]).toBe("1");
  });
});

test.describe("Missing parameters", () => {
  test("missing apikey is 401", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?limit=1`);
    expect(res.status()).toBe(401);
  });

  test("PATCH without filter is 400", async ({ request }) => {
    const res = await request.patch(`${BASE_URL}/rest/v1/todos`, {
      headers: authHeaders(), data: { title: "nope" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Boundary values", () => {
  test("200-char title accepted, 201 rejected", async ({ request }) => {
    const ok = await request.post(`${BASE_URL}/rest/v1/todos?select=id`, {
      headers: authHeaders(), data: { title: "B".repeat(200), user_id: uid },
    });
    expect(ok.status()).toBe(201);
    createdId = (await ok.json())[0].id;

    const bad = await request.post(`${BASE_URL}/rest/v1/todos`, {
      headers: authHeaders(), data: { title: "B".repeat(201), user_id: uid },
    });
    expect(bad.status()).toBe(400);
  });
});

test.describe("Authentication failures", () => {
  test("wrong password is 400 invalid", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email: EMAIL, password: "wrong-password" },
    });
    expect(res.status()).toBe(400);
    expect((await res.text()).toLowerCase()).toContain("invalid");
  });

  test("malformed bearer token is 401", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?limit=1`, {
      headers: { apikey: ANON_KEY, Authorization: "Bearer garbage.token.here" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Authorization (RLS)", () => {
  test("anonymous requests are denied", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?limit=1`, {
      headers: { apikey: ANON_KEY },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Pagination", () => {
  test("count header carries total", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?select=id`, {
      headers: { ...authHeaders(), Prefer: "count=exact" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-range"]).toMatch(/\/\d+$/);
  });
});

test.describe("Sorting", () => {
  test("order=due_date.asc sorts ascending", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/rest/v1/todos?title=like.APITEST*&order=due_date.asc`, {
      headers: authHeaders(),
    });
    const due = (await res.json()).map((r: { due_date: string }) => r.due_date);
    expect(due).toEqual([...due].sort());
  });
});

test.describe("Robustness", () => {
  test("malformed JSON is 400", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/rest/v1/todos`, {
      headers: authHeaders(), data: "{not valid json",
    });
    expect(res.status()).toBe(400);
  });

  test("2MB body has no 5xx", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/rest/v1/todos`, {
      headers: authHeaders(), data: JSON.stringify({ title: "H".repeat(2000000), user_id: uid }),
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.afterAll(async ({ request }) => {
  if (!createdId) return;
  await request.delete(`${BASE_URL}/rest/v1/todos?id=eq.${createdId}`, { headers: authHeaders() });
});
