# AI Decisions Log

This file documents all decisions made by the AI assistant during the integration of Graphify into the my-web-app project.

---

## Decision 1: Install Git and Python via winget

**Date:** 2026-10-22  
**Decision:** Install Git and Python 3.12 using Windows Package Manager (winget)  
**Reason:** The system did not have Git or Python installed, which are prerequisites for Graphify. Winget is the recommended package manager for Windows and provides official, verified packages.

---

## Decision 2: Install Graphify via pip (graphifyy package)

**Date:** 2026-10-22  
**Decision:** Install Graphify using `pip install graphifyy`  
**Reason:** Graphify is distributed as a Python package named `graphifyy` on PyPI. This is the official installation method documented in the Graphify repository.

---

## Decision 3: Run Graphify with `--code-only` flag

**Date:** 2026-10-22  
**Decision:** Use `graphify . --code-only` instead of full extraction  
**Reason:** The project contains non-code files (docs, images) that would require an LLM API key for semantic extraction. The `--code-only` flag uses only local AST parsing (tree-sitter) which requires no API keys and works fully offline. This is ideal for code-only analysis.

---

## Decision 4: Run `graphify cluster-only` after extraction

**Date:** 2026-10-22  
**Decision:** Execute `graphify cluster-only` to generate GRAPH_REPORT.md and name communities  
**Reason:** The initial extraction only produces the raw graph.json. The cluster-only command performs community detection and labeling, generating the human-readable GRAPH_REPORT.md and interactive graph.html for exploration.

---

## Decision 5: Skip SQL file parsing (tree-sitter-sql not installed)

**Date:** 2026-10-22  
**Decision:** Accept the warning about 7 .sql files contributing nothing to the graph  
**Reason:** The SQL files in the supabase/migrations directory would require the optional `tree-sitter-sql` parser (installable via `pip install "graphifyy[sql]"`). Since the core application code (React/JS) was successfully indexed and the SQL files are migration scripts rather than application logic, this was deemed acceptable for the initial integration.

---

## Decision 6: Accept that 4 code files yielded no symbols

**Date:** 2026-10-22  
**Decision:** Accept the warning about 4 files yielding no symbols  
**Reason:** The files (src/main.jsx, src/services/todo-filters.js, test/tags.test.js, test/task-validation.test.js) either contain only imports/exports, are test files with no extractable symbols, or are entry points with minimal code. This is normal behavior for Graphify's AST-based extraction.

---

## Decision 7: Create decisions.md for tracking

**Date:** 2026-10-22  
**Decision:** Create and maintain a decisions.md file in the project root  
**Reason:** The user explicitly requested maintaining a decisions.md file listing all AI decisions and their reasoning. This provides transparency and auditability for the integration process.

---

## Summary of Generated Files

The Graphify integration produced the following files in `graphify-out/`:

| File | Description |
|------|-------------|
| `graph.json` | Full knowledge graph (90 nodes, 109 edges, 9 communities) |
| `graph.html` | Interactive browser-based graph visualization |
| `GRAPH_REPORT.md` | Human-readable summary with communities, god nodes, and suggested questions |
| `.graphify_analysis.json` | Internal analysis metadata |
| `.graphify_labels.json` | Community labels |
| `.graphify_labels.json.sig` | Signature for label verification |
| `.graphify_root` | Root marker file |
| `manifest.json` | Output manifest |

---

## Key Findings from Graphify Analysis

1. **Core Abstraction:** `App()` component is the central "god node" with 23 edges, connecting most of the application logic
2. **No Import Cycles:** The codebase has no circular dependencies
3. **9 Communities Detected:** Including App component, package.json dependencies, task priorities, and npm scripts
4. **Weak Cohesion in App Community:** Cohesion score of 0.14 suggests the App component could be split into smaller modules
5. **Isolated Nodes:** `vite` and `@vitejs/plugin-react` have minimal connections (expected for build tool config)

---

## Decision 8: Fix broken `./lib/` imports by restoring `./services/` paths

**Date:** 2026-10-24  
**Decision:** Point `src/App.jsx` imports back to `src/services/*` instead of the non-existent `src/lib/*`  
**Reason:** `npm run build` failed with "Could not resolve ./lib/supabase.js". The actual modules and every test import live under `src/services/`; only App.jsx referenced `lib/`, indicating an unfinished refactor. Restoring `services/` paths returns the tree to a consistent, buildable state without duplicating modules.

---

## Decision 9: Scope `npm test` to `test/*.test.js`

**Date:** 2026-10-24  
**Decision:** Change the test script from `node --test` to `node --test "test/*.test.js"`  
**Reason:** The unscoped runner swept vendored files such as `ui-ux-pro-max-skill/gallery/lib/parseStyles.test.ts`, which fails and breaks the suite's exit code. The glob restricts the suite to the project's own tests. The glob form (not a directory argument) is required because directory arguments to `node --test` fail to resolve on Windows.

---

## Decision 10: Store due dates as a plain `date` column, not `timestamptz`

**Date:** 2026-10-24  
**Decision:** Add `todos.due_date` as Postgres `date` with no time or timezone component  
**Reason:** A date-only due date means "this calendar day in the user's own timezone" by construction: the user picks a day, the API returns the same `YYYY-MM-DD` string, and overdue/today logic compares it to the browser's local calendar day. This avoids the UTC-shift bugs that date+time support would introduce while no user-timezone preference exists (plan.txt section 8 requires storing the user's timezone before interpreting timestamps). Time-of-day due dates can be added later as a separate additive column (`due_at`) once profiles/preferences exist; `plan.txt` section 45 also instructs implementing in milestones rather than one giant step.

---

## Decision 11: Ship due dates as Phase 4 milestone 1 without reminders or recurrence

**Date:** 2026-10-24  
**Decision:** Implement due dates + due-date filtering only; defer reminders and recurring tasks  
**Reason:** Reminders require background jobs (plan.txt sections 10 and 29: workers, idempotency, retries) and notification infrastructure the project does not have yet, and recurrence requires instance-generation jobs. Both are backend architecture changes that deserve their own milestone. Due dates alone are independently useful and follow the project's established one-feature-per-migration workflow.

---

## Decision 12: Deploy with graceful degradation instead of blocking on the migration

**Date:** 2026-10-24  
**Decision:** Ship the due-date frontend with a missing-column fallback rather than waiting for the production migration  
**Reason:** A read-only probe confirmed production lacked `todos.due_date`, and deploying the due-date frontend as-is would have broken every authenticated load (all task queries select the column). The user instructed a deploy, so the app now detects the `42703` undefined-column error on load, retries with the legacy column list, sets a `dueDatesSupported` flag, and hides only the due-date picker and filter. Everything else behaves exactly like the previous build, no data is affected, and the feature activates automatically once the migration is applied — no redeploy needed. The alternative (blocking until the user ran the SQL) was declined because the user explicitly repeated the deploy instruction after being told about the dependency.

---

## Next Steps (Optional)

- Set up an LLM API key (GOOGLE_API_KEY, OPENAI_API_KEY, etc.) to enable semantic extraction of docs/images
- Install `tree-sitter-sql` for SQL migration file analysis: `pip install "graphifyy[sql]"`
- Explore the interactive graph.html in a browser for visual navigation
- Use `graphify query` to ask specific questions about the codebase
- Consider refactoring the App component based on the low cohesion score suggestion