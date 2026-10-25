"""Shared fixtures for the Little List API test suite.

Credentials come from environment variables — never hardcode them:
  LITTLELIST_URL            e.g. https://<project-ref>.supabase.co
  LITTLELIST_ANON_KEY       publishable key (ships with the frontend bundle)
  QA_EMAIL_A / QA_PASS_A    confirmed disposable account (user A)
  QA_EMAIL_B / QA_PASS_B    second account (created/confirmed via Management API)
  SUPABASE_ACCESS_TOKEN     personal access token (user B creation + SQL validation)
"""

import os

import pytest
import requests

BASE_URL = os.environ["LITTLELIST_URL"]
ANON_KEY = os.environ["LITTLELIST_ANON_KEY"]
EMAIL_A = os.environ["QA_EMAIL_A"]
PASS_A = os.environ["QA_PASS_A"]
EMAIL_B = os.environ.get("QA_EMAIL_B", "qa.userb@littlelist-test.local")
PASS_B = os.environ.get("QA_PASS_B", "Qa!Pass-B-12345")
ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = BASE_URL.split("//")[1].split(".")[0]

API = f"{BASE_URL}/rest/v1"
AUTH = f"{BASE_URL}/auth/v1"


def _headers(token=None, extra=None):
    h = {"apikey": ANON_KEY, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    if extra:
        h.update(extra)
    return h


class ApiClient:
    """Thin wrapper over the Supabase REST + Auth surface."""

    def __init__(self, token=None):
        self.token = token
        self.session = requests.Session()

    def login(self, email, password):
        return self.session.post(
            f"{AUTH}/token?grant_type=password",
            headers=_headers(),
            json={"email": email, "password": password},
        )

    def rest(self, method, table, *, token=None, params=None, json=None, data=None, extra=None):
        """Returns (status, parsed_body, headers). Writes request representation by default."""
        r = self.rest_raw(method, table, token=token, params=params, json=json, data=data, extra=extra)
        try:
            body = r.json()
        except ValueError:
            body = r.text
        return r.status_code, body, r.headers

    def rest_raw(self, method, table, *, token=None, params=None, json=None, data=None, extra=None):
        headers = _headers(token or self.token, extra)
        # PostgREST returns an empty body for writes unless representation is requested.
        if method in ("POST", "PATCH") and json is not None and not (extra and "Prefer" in extra):
            headers["Prefer"] = "return=representation"
        url = f"{API}/{table}"
        return self.session.request(method, url, headers=headers, params=params, json=json, data=data)

    def admin_sql(self, query):
        r = self.session.post(
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            headers={"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"},
            json={"query": query},
        )
        return r.status_code, r.json()


@pytest.fixture(scope="session")
def api():
    return ApiClient()


@pytest.fixture(scope="session")
def user_a(api):
    r = api.login(EMAIL_A, PASS_A)
    assert r.status_code == 200, f"user A login failed: {r.text[:200]}"
    return r.json()


@pytest.fixture(scope="session")
def token_a(user_a):
    return user_a["access_token"]


@pytest.fixture(scope="session")
def uid_a(user_a):
    return user_a["user"]["id"]


@pytest.fixture(scope="session")
def token_b(api):
    """Second confirmed user for cross-user authorization tests.

    The API signup path is rate-limited by the built-in SMTP (429
    over_email_send_rate_limit), so user B is created directly as postgres:
    insert into auth.users + auth.identities when missing, confirm, then log in.
    """
    login = api.login(EMAIL_B, PASS_B)
    if login.status_code != 200:
        if ACCESS_TOKEN:
            api.admin_sql(f"""
                insert into auth.users
                    (instance_id, id, aud, role, email, encrypted_password,
                     email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                     created_at, updated_at, confirmation_token, recovery_token,
                     email_change, email_change_token_new)
                select '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
                       'authenticated', 'authenticated', '{EMAIL_B}',
                       extensions.crypt('{PASS_B}', extensions.gen_salt('bf')), now(),
                       '{{"provider":"email","providers":["email"]}}', '{{}}',
                       now(), now(), '', '', '', ''
                where not exists (select 1 from auth.users where email = '{EMAIL_B}');

                update auth.users set email_confirmed_at = now(), updated_at = now()
                where email = '{EMAIL_B}';

                insert into auth.identities (user_id, provider_id, identity_data, provider,
                                             last_sign_in_at, created_at, updated_at)
                select id, email,
                       json_build_object('sub', id, 'email', email, 'email_verified', true),
                       'email', now(), now(), now()
                from auth.users where email = '{EMAIL_B}'
                on conflict (provider_id, provider) do nothing;
            """)
        login = api.login(EMAIL_B, PASS_B)
    assert login.status_code == 200, f"user B login failed: {login.text[:200]}"
    return login.json()["access_token"]


@pytest.fixture(scope="session")
def seeded_tasks(api, token_a, uid_a):
    """Seed a deterministic task matrix for filtering/sorting/paging tests.

    Pre-cleans leftovers so repeated runs are deterministic (earlier failed
    runs could leave rows behind).
    """
    for pattern in ("APITEST%", "Re-verify task%", "Verification task%",
                    "Double submit target%", "Created in tab A", "Created while offline",
                    "Buy milk //%", "Renew license tom", "Water the plants @home%",
                    "Take out trash every monday", "QA verify task", "Review budget%"):
        api.rest("DELETE", "todos", token=token_a, params={"title": f"like.{pattern}"})

    matrix = [
        ("APITEST overdue urgent", "urgent", "2026-10-01", "desc-a"),
        ("APITEST today none", "none", "2026-10-25", None),
        ("APITEST tomorrow high", "high", "2026-10-26", "desc-b"),
        ("APITEST nextweek low", "low", "2026-11-02", None),
        ("APITEST far none", "none", None, None),
        ("APITEST special @token", "medium", None, None),
        ("APITEST completed", "none", None, None),
    ]
    ids = []
    for title, priority, due, desc in matrix:
        code, rows, _ = api.rest(
            "POST", "todos", token=token_a,
            json={"title": title, "user_id": uid_a, "priority": priority, "due_date": due,
                  "description": desc or "", "completed": title.endswith("completed")},
        )
        assert code == 201, f"seed failed: {rows}"
        ids.append(rows[0]["id"])
    yield ids
    for tid in ids:
        api.rest("DELETE", "todos", token=token_a, params={"id": f"eq.{tid}"})
