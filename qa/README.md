# Little List — QA Test Suite

Formal QA deliverables for the Little List to-do application (React + Vite + Supabase), produced by a Principal-QA review of everything implemented to date.

## Scope of the system under test

- **Auth:** email/password sign-up with email confirmation, login, per-device sign-out, origin-aware confirmation redirect
- **Tasks:** create (modal quick-add), inline edit, complete/reopen, soft delete, trash, restore, undo (10-second window), permanent delete with confirmation
- **Organization:** P1–P4 priorities, projects (create/rename/reorder/archive/delete), tags (create/rename/delete/assign), one-level subtasks with progress and inheritance
- **Time:** calendar due dates, `every …` recurrence with spawn-next-on-completion, descriptions (`//` token)
- **Quick add parser:** `#project`, `@tag`, `p1`–`p4`, date phrases, `every` phrases, `//` description — live-chip preview in the modal
- **Views:** Inbox, Active, Done, Trash, Today (overdue + today), Upcoming, per-tag, per-project, search
- **Security:** per-user row-level security (RLS), publishable-key-only frontend, hardened grants

Out of scope (not implemented): reminders/notifications, sections, sub-projects, manual drag ordering, comments, activity log, exports, collaboration, offline sync, password reset/change, account deletion.

## Folder structure

```text
qa/
├── README.md                      # this file
├── test-plan.md                   # strategy, environments, risk model, entry/exit criteria
├── requirements/
│   └── traceability-matrix.md     # requirement ID → test case IDs → automation status
├── test-cases/
│   ├── functional-scenarios.md    # end-to-end journeys
│   ├── positive-cases.md          # per-feature happy paths
│   ├── negative-cases.md          # invalid input / error paths
│   ├── boundary-cases.md          # edges and limits
│   ├── equivalence-partitions.md  # input classes with representative cases
│   └── state-transitions.md       # task/project lifecycle model + transition cases
└── analysis/
    ├── missing-requirements.md    # gaps and ambiguities found during analysis
    ├── assumptions.md             # assumptions that need product clarification
    └── adversarial-session-2026-10-25.md  # dedicated break-attempt findings (BF-01…BF-10)
```

## Conventions

- **Case ID prefixes:** `FS-` functional scenario, `POS-` positive, `NEG-` negative, `BND-` boundary, `EQV-` equivalence, `ST-` state transition.
- **Counts (audited):** 182 unique case IDs — 15 FS, 46 POS, 34 NEG, 30 BND, 34 EQV, 23 ST.
- **Priority:** P0 (smoke/blocker), P1 (critical path), P2 (important), P3 (nice-to-have).
- **Risk:** H/M/L — likelihood × impact of the underlying behavior failing.
- **Automation suitability:** High (pure logic — matches the existing `node --test` layer), Med (API/PostgREST or deterministic Playwright UI), Low (needs real email, human visual judgment, or third-party failure injection).

## Existing automation

The repository already carries 65 unit tests (`npm test`, Node test runner) covering the pure-logic layer the High-suitability cases below target: title validation, filters, priorities, due-date math, quick-add parsing, recurrence math, colors. UI flows have been exercised with scripted browser sessions on a disposable sandbox account; the cases marked Med are the candidates to productize as Playwright specs.

## Pushing to GitHub

This folder is self-contained. From the repo root:

```sh
git init            # if the repo is not yet a git repository
git add qa/
git commit -m "QA: test plan, cases, and analysis for current feature set"
```
