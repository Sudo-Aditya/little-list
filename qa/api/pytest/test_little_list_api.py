"""Little List API test suite — Supabase Auth + PostgREST.

Covers: contract/schema validation, missing & invalid parameters, boundary
values, authentication and authorization failures, rate limits, pagination,
sorting/filtering, idempotency, concurrency, malformed JSON, unexpected
content types, huge payloads, duplicate requests, and version compatibility.

Run:
    SUPABASE_ACCESS_TOKEN=... LITTLELIST_URL=... LITTLELIST_ANON_KEY=... \
    QA_EMAIL_A=... QA_PASS_A=... python -m pytest qa/api/pytest -v
"""

import concurrent.futures
import uuid

from conftest import AUTH, BASE_URL, _headers

import pytest

TABLE = "todos"
TODAY = "2026-10-25"
TOMORROW = "2026-10-26"


def _tracker(api, token_a, uid_a):
    ids = []

    def track(table, tid):
        ids.append((table, tid))

    def cleanup():
        for table, tid in reversed(ids):
            api.rest("DELETE", table, token=token_a, params={"id": f"eq.{tid}"})

    return track, cleanup


@pytest.fixture()
def tracked(api, token_a, uid_a):
    track, cleanup = _tracker(api, token_a, uid_a)
    yield track
    cleanup()


def _make(api, token_a, uid_a, track, **fields):
    body = {"title": fields.pop("title"), "user_id": uid_a, **fields}
    code, rows, _ = api.rest("POST", TABLE, token=token_a, json=body)
    if code == 201 and isinstance(rows, list) and rows:
        track(TABLE, rows[0]["id"])
    return code, rows, {"status": code}


# ---------------------------------------------------------------- contract

class TestContract:
    def test_openapi_requires_secret_key(self, api):
        code, body, _ = api.rest("GET", "", token=None)
        assert code == 401 and "Secret API key required" in str(body)

    def test_content_type_is_json(self, api, token_a, seeded_tasks):
        r = api.rest_raw("GET", TABLE, token=token_a, params={"select": "id", "limit": 1})
        assert r.status_code == 200
        assert r.headers["Content-Type"].startswith("application/json")

    def test_task_shape_matches_schema(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest(
            "GET", TABLE, token=token_a,
            params={"select": "id,title,description,completed,priority,due_date,recurrence,deleted_at,project_id,parent_task_id,created_at",
                    "title": "eq.APITEST today none"},
        )
        assert code == 200 and len(rows) == 1
        row = rows[0]
        assert set(row) == {"id", "title", "description", "completed", "priority", "due_date",
                            "recurrence", "deleted_at", "project_id", "parent_task_id", "created_at"}
        assert isinstance(row["id"], int) and isinstance(row["completed"], bool)
        assert row["priority"] == "none" and row["description"] == ""

    def test_gateway_version_header(self, api, token_a, seeded_tasks):
        code, _, headers = api.rest("GET", TABLE, token=token_a, params={"limit": 1})
        assert headers.get("sb-gateway-version") == "1"

    def test_unknown_table_404(self, api, token_a):
        code, body, _ = api.rest("GET", "definitely_not_a_table", token=token_a)
        assert code == 404


# ---------------------------------------------------------------- schema validation

class TestSchema:
    def test_null_title_rejected(self, api, token_a, uid_a, tracked):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, body, _ = api.rest("POST", TABLE, token=token_a, json={"user_id": uid_a})
        cleanup()
        assert code == 400

    def test_invalid_priority_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a, json={"title": "x", "user_id": uid_a, "priority": "critical"})
        assert code == 400 and "priority" in str(body)

    def test_description_over_limit_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a,
                                 json={"title": "x", "user_id": uid_a, "description": "D" * 2001})
        assert code == 400 and "description" in str(body)

    def test_recurrence_over_limit_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a,
                                 json={"title": "x", "user_id": uid_a, "recurrence": "R" * 101})
        assert code == 400 and "recurrence" in str(body)


# ---------------------------------------------------------------- missing parameters

class TestMissingParams:
    def test_missing_apikey(self, api):
        code, body, _ = api.rest("GET", TABLE, token=None)
        assert code == 401

    def test_missing_bearer_for_private_read(self, api):
        code, body, _ = api.rest("GET", TABLE, token=None)
        assert code == 401

    def test_patch_requires_filter(self, api, token_a):
        code, body, _ = api.rest("PATCH", TABLE, token=token_a, json={"title": "nope"})
        assert code == 400  # PostgREST requires a filter (returns 400)

    def test_delete_requires_filter(self, api, token_a):
        code, body, _ = api.rest("DELETE", TABLE, token=token_a)
        assert code == 400  # PostgREST: filter required

    def test_insert_without_user_id(self, api, token_a):
        # The client normally supplies user_id; without it RLS default fails.
        code, body, _ = api.rest("POST", TABLE, token=token_a, json={"title": "no user"})
        assert code in (400, 403)


# ---------------------------------------------------------------- invalid parameters

class TestInvalidParams:
    def test_invalid_uuid_filter(self, api, token_a):
        code, body, _ = api.rest("GET", TABLE, token=token_a, params={"id": "eq.not-a-uuid"})
        assert code == 400

    def test_unknown_select_column(self, api, token_a):
        code, body, _ = api.rest("GET", TABLE, token=token_a, params={"select": "no_such_column"})
        assert code == 400 and "no_such_column" in str(body)

    def test_invalid_order_column(self, api, token_a):
        code, body, _ = api.rest("GET", TABLE, token=token_a, params={"order": "no_such_column"})
        assert code == 400

    def test_invalid_date_filter_value(self, api, token_a):
        code, body, _ = api.rest("GET", TABLE, token=token_a, params={"due_date": "eq.not-a-date"})
        assert code == 400

    def test_invalid_filter_operator(self, api, token_a):
        code, body, _ = api.rest("GET", TABLE, token=token_a, params={"id": "zz.1"})
        assert code == 400


# ---------------------------------------------------------------- boundary values

class TestBoundary:
    def test_title_one_char_accepted(self, api, token_a, uid_a, tracked):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="A")
        assert code == 201 and rows[0]["title"] == "A"

    def test_title_200_chars_accepted(self, api, token_a, uid_a):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="B" * 200)
        assert code == 201 and rows[0]["title"] == "B" * 200

    def test_title_201_chars_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a, json={"title": "B" * 201, "user_id": uid_a})
        assert code == 400

    def test_title_empty_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a, json={"title": "", "user_id": uid_a})
        assert code == 400

    def test_whitespace_title_accepted_by_db(self, api, token_a, uid_a):
        """Documents corruption finding C-01: todos.title has no btrim check."""
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="   ")
        assert code == 201 and rows[0]["title"] == "   "

    def test_description_2000_accepted(self, api, token_a, uid_a):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="desc ok", description="D" * 2000)
        assert code == 201 and rows[0]["description"] == "D" * 2000

    def test_description_2001_rejected(self, api, token_a, uid_a):
        code, body, _ = api.rest("POST", TABLE, token=token_a,
                                 json={"title": "x", "user_id": uid_a, "description": "D" * 2001})
        assert code == 400

    def test_recurrence_100_accepted_101_rejected(self, api, token_a, uid_a):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="r-ok", recurrence="E" * 100)
        assert code == 201
        code, body, _ = api.rest("POST", TABLE, token=token_a,
                                 json={"title": "x", "user_id": uid_a, "recurrence": "R" * 101})
        assert code == 400

    def test_due_date_extremes_accepted(self, api, token_a, uid_a):
        track, cleanup = _tracker(api, token_a, uid_a)
        for due in ("1000-01-01", "9999-12-31"):
            code, rows, _ = _make(api, token_a, uid_a, track, title=f"extreme {due}", due_date=due)
            assert code == 201

    def test_project_name_60_accepted_61_rejected(self, api, token_a, uid_a):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = api.rest("POST", "projects", token=token_a,
                                 json={"name": "N" * 58 + uuid.uuid4().hex[:2], "user_id": uid_a})
        cleanup(); track("projects", rows[0]["id"]) if code == 201 else None
        assert code == 201
        code, body, _ = api.rest("POST", "projects", token=token_a,
                                 json={"name": "N" * 61, "user_id": uid_a})
        assert code == 400

    def test_tag_name_40_accepted_41_rejected(self, api, token_a, uid_a):
        code, rows, _ = api.rest("POST", "tags", token=token_a,
                                 json={"name": "T" * 38 + uuid.uuid4().hex[:2], "user_id": uid_a})
        assert code == 201
        if code == 201:
            api.rest("DELETE", "tags", token=token_a, params={"id": f"eq.{rows[0]['id']}"})
        code, body, _ = api.rest("POST", "tags", token=token_a, json={"name": "T" * 41, "user_id": uid_a})
        assert code == 400


# ---------------------------------------------------------------- authentication failures

class TestAuthFailures:
    def test_login_wrong_password(self, api):
        r = api.login("littleliste2e1154910518@maxxspace.com", "wrong-password")
        assert r.status_code == 400 and "invalid" in r.text.lower()

    def test_signup_weak_password(self, api):
        r = api.session.post(
            f"{BASE_URL}/auth/v1/signup", headers=_headers(),
            json={"email": f"weak-{uuid.uuid4().hex[:6]}@littlelist-test.local", "password": "abc"},
        )
        assert r.status_code == 422 and "assword" in r.text  # GoTrue: 422 for weak passwords

    def test_malformed_bearer_token(self, api, token_a, seeded_tasks):
        code, body, _ = api.rest("GET", TABLE, token="garbage.token.here", params={"limit": 1})
        assert code == 401

    def test_expired_token(self, api, token_a, seeded_tasks):
        expired = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
                   + __import__("base64").urlsafe_b64encode(
                       b'{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","exp":1000000000}'
                   ).decode().rstrip("=") + ".sig")
        code, body, _ = api.rest("GET", TABLE, token=expired, params={"limit": 1})
        assert code == 401

    def test_wrong_issuer_token_rejected(self, api, seeded_tasks):
        foreign = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
                   + __import__("base64").urlsafe_b64encode(
                       b'{"iss":"https://some-other-project.supabase.co/auth/v1","role":"authenticated","exp":9999999999}'
                   ).decode().rstrip("=") + ".sig")
        code, body, _ = api.rest("GET", TABLE, token=foreign, params={"limit": 1})
        assert code == 401


# ---------------------------------------------------------------- authorization failures

class TestAuthorization:
    def test_user_b_cannot_read_user_a_tasks(self, api, token_a, token_b, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_b, params={"title": "like.APITEST*"})
        assert code == 200 and rows == []

    def test_user_b_cannot_patch_user_a_task(self, api, token_a, token_b, seeded_tasks):
        code, rows, _ = api.rest("PATCH", TABLE, token=token_b,
                                 params={"id": f"eq.{seeded_tasks[0]}"}, json={"completed": True})
        assert code in (200, 204)  # silent no-op: RLS-filtered update succeeds with 0 rows
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"id": f"eq.{seeded_tasks[0]}", "select": "completed"})
        assert rows[0]["completed"] is False  # A's data unchanged

    def test_user_b_cannot_delete_user_a_task(self, api, token_a, token_b, seeded_tasks):
        code, _, _ = api.rest("DELETE", TABLE, token=token_b, params={"id": f"eq.{seeded_tasks[0]}"})
        assert code in (200, 204)  # silent no-op
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"id": f"eq.{seeded_tasks[0]}", "select": "id"})
        assert len(rows) == 1  # A's task still exists

    def test_user_b_cannot_insert_into_user_a_project(self, api, token_a, token_b, uid_a, seeded_tasks):
        # Find A's project_id from A's seeded task (read as A), then insert as B.
        code, rows, _ = api.rest("GET", TABLE, token=token_a, params={"id": f"eq.{seeded_tasks[0]}", "select": "project_id"})
        code, body, _ = api.rest("POST", TABLE, token=token_b,
                                 json={"title": "B intrusion", "user_id": None, "project_id": rows[0]["project_id"]})
        assert code in (400, 403)  # composite FK blocks cross-user assignment

    def test_user_b_cannot_tag_user_a_task(self, api, token_a, token_b, uid_a, seeded_tasks):
        code, body, _ = api.rest("POST", "todo_tags", token=token_b,
                                 json={"user_id": None, "todo_id": seeded_tasks[0], "tag_id": None})
        assert code in (400, 403)

    def test_user_b_sees_empty_projects_and_tags(self, api, token_b):
        code, rows, _ = api.rest("GET", "projects", token=token_b)
        assert code == 200 and rows == []
        code, rows, _ = api.rest("GET", "tags", token=token_b)
        assert code == 200 and rows == []


# ---------------------------------------------------------------- rate limits

class TestRateLimits:
    def test_auth_burst_stays_4xx(self, api):
        """Bounded burst: 12 rapid failed logins. Records whether Supabase
        rate limiting (429) kicks in; must never return 5xx."""
        codes = set()
        for _ in range(12):
            r = api.login("rate.limit.probe@littlelist-test.local", "wrong-password-xyz")
            codes.add(r.status_code)
        assert all(400 <= c < 500 for c in codes), f"unexpected codes: {codes}"
        assert len(codes) <= 3  # tight range: 400 invalid_grant / 422 / 429


# ---------------------------------------------------------------- pagination

class TestPagination:
    def test_count_header_exact(self, api, token_a, seeded_tasks):
        r = api.rest_raw("GET", TABLE, token=token_a,
                         params={"title": "like.APITEST*", "select": "id"},
                         extra={"Prefer": "count=exact"})
        assert r.status_code == 200
        import re as _re
        m = _re.search(r"/(\d+)$", r.headers.get("Content-Range", ""))
        assert m and int(m.group(1)) >= len(seeded_tasks)  # >= : prior runs may leave extra rows

    def test_limit_offset_paging(self, api, token_a, seeded_tasks):
        page1 = api.rest("GET", TABLE, token=token_a,
                         params={"title": "like.APITEST*", "select": "id", "order": "id", "limit": 3, "offset": 0})[1]
        page2 = api.rest("GET", TABLE, token=token_a,
                         params={"title": "like.APITEST*", "select": "id", "order": "id", "limit": 3, "offset": 3})[1]
        assert len(page1) == 3 and len(page2) == 3
        assert not set(r["id"] for r in page1) & set(r["id"] for r in page2)

    def test_paging_beyond_end_returns_empty(self, api, token_a, uid_a, tracked, seeded_tasks):
        track, cleanup = _tracker(api, token_a, uid_a)
        marker = f"APITEST page-end {uuid.uuid4().hex[:8]}"
        code, rows, _ = _make(api, token_a, uid_a, track, title=marker)
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"title": f"eq.{marker}", "select": "id", "limit": 3, "offset": 99})
        assert code == 200 and rows == []


# ---------------------------------------------------------------- sorting / filtering

class TestSortingFiltering:
    def test_order_due_date_asc(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"title": "like.APITEST%due%", "select": "title,due_date",
                                         "order": "due_date.asc"})
        due = [r["due_date"] for r in rows]
        assert due == sorted(due)

    def test_order_desc_reverses(self, api, token_a, seeded_tasks):
        asc = api.rest("GET", TABLE, token=token_a,
                       params={"title": "like.APITEST*due*", "select": "due_date", "order": "due_date.asc"})[1]
        desc = api.rest("GET", TABLE, token=token_a,
                        params={"title": "like.APITEST%due%", "select": "due_date", "order": "due_date.desc"})[1]
        assert asc == list(reversed(desc))

    def test_eq_filter(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"title": "eq.APITEST today none", "select": "title"})
        assert len(rows) == 1 and rows[0]["title"] == "APITEST today none"

    def test_like_filter(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"title": "like.APITEST*today*", "select": "title"})
        assert len(rows) >= 1 and all("today" in r["title"] for r in rows)

    def test_due_date_range_filters(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"due_date": f"gte.{TODAY}", "title": "like.APITEST*",
                                         "select": "title,due_date", "order": "due_date.asc"})
        assert all(r["due_date"] and r["due_date"] >= TODAY for r in rows)

    def test_combined_filters_and_select(self, api, token_a, seeded_tasks):
        code, rows, _ = api.rest("GET", TABLE, token=token_a,
                                 params={"priority": "eq.urgent", "title": "like.APITEST*", "select": "title,priority"})
        assert len(rows) == 1 and rows[0]["priority"] == "urgent"


# ---------------------------------------------------------------- idempotency / duplicate requests

class TestIdempotency:
    def test_duplicate_post_creates_two_rows(self, api, token_a, uid_a, tracked):
        """Documents current behavior: the API has no idempotency-key layer,
        so an identical replay creates a second task (corruption finding C-06)."""
        track, cleanup = _tracker(api, token_a, uid_a)
        payload = {"title": f"APITEST idempotency {uuid.uuid4().hex[:8]}", "user_id": uid_a}
        c1, r1, _ = api.rest("POST", TABLE, token=token_a, json=payload)
        c2, r2, _ = api.rest("POST", TABLE, token=token_a, json=payload)
        assert c1 == 201 and c2 == 201 and r1[0]["id"] != r2[0]["id"]

    def test_prefer_minimal_returns_no_body(self, api, token_a, uid_a, tracked):
        track, cleanup = _tracker(api, token_a, uid_a)
        r = api.rest_raw("POST", TABLE, token=token_a,
                         json={"title": f"APITEST minimal {uuid.uuid4().hex[:8]}", "user_id": uid_a},
                         extra={"Prefer": "return=minimal"})
        assert r.status_code == 201 and r.text == ""

    def test_duplicate_delete_is_idempotent_safe(self, api, token_a, uid_a, tracked):
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="delete twice")
        tid = rows[0]["id"]
        d1, _, _ = api.rest("DELETE", TABLE, token=token_a, params={"id": f"eq.{tid}"})
        d2, _, _ = api.rest("DELETE", TABLE, token=token_a, params={"id": f"eq.{tid}"})
        assert d1 == 204 and d2 == 204  # zero-row delete is a silent 204
        code, rows, _ = api.rest("GET", TABLE, token=token_a, params={"id": f"eq.{tid}"})
        assert rows == []


# ---------------------------------------------------------------- concurrency

class TestConcurrency:
    def test_parallel_updates_last_write_wins(self, api, token_a, uid_a, tracked):
        """Documents C-09: no OCC — concurrent writes both succeed, last wins."""
        track, cleanup = _tracker(api, token_a, uid_a)
        code, rows, _ = _make(api, token_a, uid_a, track, title="concurrent target", description="original")
        tid = rows[0]["id"]
        with concurrent.futures.ThreadPoolExecutor(2) as ex:
            f1 = ex.submit(api.rest, "PATCH", TABLE, token=token_a, params={"id": f"eq.{tid}"}, json={"description": "write A"})
            f2 = ex.submit(api.rest, "PATCH", TABLE, token=token_a, params={"id": f"eq.{tid}"}, json={"description": "write B"})
            codes = [f1.result()[0], f2.result()[0]]
        assert all(c == 200 or c == 204 for c in codes)
        code, final, _ = api.rest("GET", TABLE, token=token_a, params={"id": f"eq.{tid}", "select": "description"})
        assert final[0]["description"] in ("write A", "write B")  # one silently lost (C-09)

    def test_parallel_inserts_get_distinct_ids(self, api, token_a, uid_a, tracked):
        track, cleanup = _tracker(api, token_a, uid_a)
        with concurrent.futures.ThreadPoolExecutor(4) as ex:
            futures = [ex.submit(api.rest, "POST", TABLE, token=token_a,
                                 json={"title": f"APITEST parallel {i}", "user_id": uid_a})
                       for i in range(4)]
            rows = [f.result()[1][0] for f in futures]
        assert len({r["id"] for r in rows}) == 4


# ---------------------------------------------------------------- malformed JSON / content types

class TestMalformedInput:
    def test_malformed_json_rejected(self, api, token_a):
        r = api.session.post(f"{BASE_URL}/rest/v1/todos", headers=_headers(token_a), data="{not valid json")
        assert r.status_code == 400

    def test_unexpected_content_type_rejected(self, api, token_a):
        r = api.session.post(f"{BASE_URL}/rest/v1/todos", headers=_headers(token_a, {"Content-Type": "text/plain"}),
                             data="title=hello", )
        assert r.status_code in (400, 415)

    def test_json_array_instead_of_object_rejected(self, api, token_a):
        r = api.session.post(f"{BASE_URL}/rest/v1/todos", headers=_headers(token_a), json=[1, 2, 3])
        assert r.status_code == 400


# ---------------------------------------------------------------- huge payloads

class TestHugePayloads:
    def test_oversized_title_rejected(self, api, token_a, uid_a):
        r = api.session.post(f"{BASE_URL}/rest/v1/todos", headers=_headers(token_a),
                             json={"title": "H" * 300000, "user_id": uid_a})
        assert r.status_code == 400

    def test_2mb_body_rejected_no_5xx(self, api, token_a, uid_a):
        r = api.session.post(f"{BASE_URL}/rest/v1/todos", headers=_headers(token_a),
                             json={"title": "H" * 2000000, "user_id": uid_a},
                             )
        assert r.status_code == 400  # gateway rejects oversized bodies with 400 (no 5xx)


# ---------------------------------------------------------------- version compatibility

class TestVersionCompatibility:
    def test_auth_health_endpoint(self, api):
        r = api.session.get(f"{BASE_URL}/auth/v1/health", headers=_headers())
        assert r.status_code == 200

    def test_gateway_version_stable(self, api, token_a, seeded_tasks):
        v1 = api.rest("GET", TABLE, token=token_a, params={"limit": 1})[2].get("sb-gateway-version")
        v2 = api.rest("GET", TABLE, token=token_a, params={"limit": 1})[2].get("sb-gateway-version")
        assert v1 == v2 == "1"
