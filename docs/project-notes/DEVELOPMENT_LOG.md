# Little List — Development Log

This log records significant implementation, configuration, and verification steps so the project can be picked up later. Update it whenever more work is done.

## Project overview

- **App:** Little List, a responsive to-do list web app.
- **Access model:** Each person signs in with an individual email/password account and gets a private list that syncs through Supabase.
- **Frontend:** React 19 and Vite.
- **Backend:** Supabase Auth and Postgres, accessed using the Supabase JavaScript client.
- **Hosting plan:** Vercel was selected as the intended frontend host.

## Completed work

### Visual direction reset

- Moved the task workspace away from the Todoist-inspired red-and-white treatment and back toward the warm, organic brief: cream surfaces, botanical green accents, softer dividers, and serif display typography.
- Kept the compact navigation and task-management behavior in place; this change restores the visual direction without reintroducing the previous crowded controls.
- Verified the production build and all 25 unit tests. The local sign-in page loads in the browser.
- Deployed production deployment `FFpMeJQKFqQiSXUTe83ToUL7mFeh` to [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app). Confirmed the live page and stylesheet load successfully and the new bundle contains the restored green palette rather than the previous red accents. The live sign-in page renders at 320px with no browser console errors.

### Project structure and GitHub sync

- Grouped app illustrations and project notes under `docs/`, and UI QA screenshots under `test/ui-screenshots/`.
- Added ignore rules for local environment files, generated output, editor configuration, browser artifacts, and private QA screenshots. `.env.example` remains trackable.
- Documented the source tree and reproducible dependency lockfile in the README.
- Synchronized the maintained project files to the `main` branch of the GitHub repository.

### Design-plan refinement

- Refined authentication and task-workspace styling toward the warm, minimalist design brief: replaced the external font download with system typography, improved text contrast and focus indicators, and moved the auth footer into normal layout flow to prevent overlap.
- Improved mobile and small-tablet usability with 48px touch targets, wrapping task actions, safer subtask/trash row layouts, and input limits aligned to the database's 200-character title limit. Added a live loading status for assistive technology.
- Checked the deployed sign-in screen at widths from 320px to 1440px, including a short 320x480 viewport: no horizontal overflow or auth-footer overlap and inputs remain 48px tall. A representative nested task-row fixture also had no horizontal overflow; mobile task controls measured at least 48px. No authenticated live workspace was available for an end-to-end visual check.
- All 25 unit tests pass, the production build succeeds, and editor diagnostics report no issues. Deployed to Vercel production deployment `5Rgs835tLcTJSzbzFGfAq6F2FFAm` and reassigned [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app). The live page and JS/CSS assets return HTTP 200, `/.env.local` returns HTTP 404, and the deployed HTML no longer requests external Google Fonts.

### Frontend scaffold and to-do features

- Created the Vite/React app, its main HTML entry point, and app stylesheet.
- Implemented account sign-up, sign-in, and sign-out.
- Sign-out now offers a current-device action and a separate confirmed global action. Confirmation explains that other devices can remain signed in until their existing access tokens expire.
- Verified the Supabase JavaScript sign-out API documentation and deployed the change to [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app). Live Playwright checks confirmed the current-device button calls `auth/v1/logout?scope=local` and returns to sign-in; cancelling the global confirmation leaves the session active and sends no global logout; confirming it calls `auth/v1/logout?scope=global` and returns to sign-in.
- The deployed page and assets return HTTP 200, `/.env.local` returns HTTP 404, and the browser console has no errors. All 13 unit tests pass, the production build succeeds, and editor diagnostics are clear.
- Follow-up UX change: removed the global sign-out option and confirmation per product direction. The remaining **Sign out** control explicitly uses Supabase local scope; README now documents that this signs out only the current device.
- Project management follow-up: implemented project rename, persisted position controls, archive/unarchive with an archived-project view, and confirmed project deletion. Deleting a project uses the existing composite foreign key's `ON DELETE SET NULL (project_id)` behavior so tasks are preserved as unassigned.
- Added project name validation/reorder helper tests. All 18 unit tests pass, production build succeeds, and diagnostics are clear. No database migration was needed.
- Phase 3 tags: added reusable user-owned tags, case-insensitive per-user name uniqueness, RLS-protected task associations, and composite ownership foreign keys that prevent linking another user's tags or tasks. The frontend supports tag create/rename/delete, assigning multiple tags per task, and tag filtering composed with status, priority, project, and Trash filters.
- Added tag validation/filter tests and the idempotent migration `supabase/migrations/20261015200000_add_todo_tags.sql`. Applied the migration to production as Supabase version `20261015152015`; verified RLS is enabled, all seven owner policies and the intended table grants exist, and the composite ownership constraints are present.
- All 22 unit tests pass, the production build succeeds, and editor diagnostics are clear. Deployed the tag-enabled frontend to Vercel deployment `GpRyKtHvu1YZE4JEpXM393wrGGYc` and reassigned [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) to it. The page and JS bundle return HTTP 200, the bundle contains the tag UI, `/.env.local` returns HTTP 404, and the public sign-in page has no console errors. No authenticated tag CRUD smoke test was run after deployment.
- UI refresh: replaced the crowded, always-expanded project/tag controls and filter row with a compact sidebar for task views, projects, and tags. Creation and management controls now live in expandable menus; the main workspace focuses on the selected task list, quick-add field, and a single priority filter. The responsive layout switches to horizontally scrollable navigation on small screens. Tasks created while viewing a tag are assigned that tag.
- Follow-up UI QA: made project and tag management menus mutually exclusive and positioned desktop popovers outside the scroll-clipped sidebar. On mobile, the menus remain bottom sheets. This prevents the popover from being cut off and from covering the other management controls.
- UI refresh verification: all 22 unit tests pass, the production build succeeds, and editor diagnostics are clear. Deployed Vercel deployment `WcCiYfRDdc9XDgM6GpMJSnDAKmq5` to [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app); the public page, JavaScript, and CSS return HTTP 200, the served bundle contains the sidebar navigation, and `/.env.local` remains HTTP 404. The user was signed out, so the deployed authenticated workspace was not exercised in Playwright.
- Subtasks: implemented a one-level parent/child relationship with owner-safe foreign keys, trigger validation, parent deletion orphaning, nested task controls, and parent completion progress. New subtasks inherit their parent’s project and tags. Added grouping/progress unit tests and documented the one-level constraint.
- Subtask verification: all 25 unit tests pass, `npm run build` succeeds, and editor diagnostics report no issues. Applied the subtasks migration to production as Supabase version `20261015160325`; verified `parent_task_id`, the composite owner-safe foreign key, the self-parent check, and the validation trigger.
- Deployed the subtasks frontend to Vercel production deployment `5hUu3LwFudUL3gCTxTiMf7BMXi7d` and reassigned [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) to it. Verified the page, JavaScript, and CSS return HTTP 200; the served bundle contains the subtask UI; `/.env.local` returns HTTP 404; and no temporary deployment token remains in `dist`. Authenticated subtask CRUD was not exercised against the live app.
- Implemented adding, editing, completing/reopening, deleting, and filtering tasks.
- Added empty/loading/error states, a responsive layout, and a favicon.
- Added `.gitignore` entries for dependencies, build output, local environment files, and Vercel state.
- Added `.env.example` as the non-secret environment-variable template.
- Added the Node.js/Vite development and production build scripts.

### Supabase project and security

- Created the **`little-list`** Supabase project in the **`Sudo-Aditya's Org`** Free-plan organization, in **South Asia (Mumbai)**.
- Project reference: `hglxmhqthuafyokojjjs`.
- Added `supabase/schema.sql` and ran its SQL in the hosted SQL Editor.
- The `public.todos` table has an identity ID, authenticated user ID, title length constraint, completion state, and creation timestamp.
- Enabled row-level security and verified that the table has four policies: users can select, insert, update, and delete only their own todos.
- Granted the authenticated role the required table operations and ID sequence usage.
- Disabled the Supabase project option that automatically exposes newly created tables.
- Set the Supabase Auth Site URL and redirect allow-list to `http://localhost:5173`.
- Configured the app to prefer `VITE_SUPABASE_PUBLISHABLE_KEY` while still supporting `VITE_SUPABASE_ANON_KEY` for compatibility.
- Added the project URL and publishable key to local `.env.local`. This file is ignored by Git; do not copy its values into this log or commit the file.
- Updated the example environment file, setup guide, and email-confirmation/SMTP guidance.

### Verification performed

- Queried Supabase after setup and confirmed row-level security is enabled and four policies exist.
- Confirmed the Supabase Auth health endpoint responded with HTTP 200.
- Started the local development server at `http://127.0.0.1:5173`.
- Confirmed the configured app displayed the account-creation screen.
- Ran `npm run build` successfully after adding the Supabase configuration.
- Checked the main React files for editor errors; none were reported.

### Local app and live-data check — 2026-10-14

- Confirmed the local Vite server responds successfully and the signed-in app loads at `http://127.0.0.1:5173`.
- Read the current signed-in user's task list through the app's Supabase request: one saved task was present and active. The task text and account email are intentionally not copied into this log.
- Confirmed the Done filter shows its empty state while the active task count remains unchanged.
- Reloaded the page and confirmed the signed-in session and saved task still load from Supabase.
- Checked the responsive layout at 390px and 1280px viewport widths; neither had horizontal overflow.
- Confirmed the Supabase Auth health endpoint returns HTTP 200 and the unauthenticated table read is denied (HTTP 401, permission denied).
- Reapplied least-privilege table grants in the Supabase SQL Editor. Verified authenticated select/insert/update/delete are allowed, authenticated truncate is denied, anonymous select is denied, and authenticated sequence usage is allowed. The four row-level security policies remain in place.
- Ran `npm run build` successfully after the permission-script update.
- No task rows were added, edited, completed, or deleted during these checks.
- The Supabase dashboard later redirected to GitHub sign-in; the live task check above used the existing signed-in Little List app session. SQL query history was not inspected.

### Vercel deployment attempt — 2026-10-14

- Confirmed the project folder has no Git repository or Vercel project binding, so the Git-import deployment path is not currently available from this folder.
- Ran the Vercel CLI through `npm exec`; the CLI is not authenticated in this environment.
- Started Vercel's device authorization flow, but authorization was not completed. Stopped the waiting CLI process without uploading the app or changing Vercel project settings.
- No production deployment was created and there is no shareable URL yet. Supabase production redirect URLs and email-delivery settings therefore remain to be configured.
- Documented a Git-free Vercel CLI deployment path in the README. The deployment still requires the project owner to complete Vercel sign-in and approve the CLI.

### Vercel production deployment — 2026-10-15

- Completed Vercel CLI device sign-in and built the production bundle successfully with `npm run build`.
- Deployed the generated static `dist` output to the Vercel production project, then renamed the project to `little-list`.
- Assigned the stable public URL [`https://little-list-anaiks-projects.vercel.app`](https://little-list-anaiks-projects.vercel.app). Disabled Vercel SSO deployment protection for this project so people without Vercel accounts can use the link.
- Verified the public URL responds with HTTP 200 and renders the Little List sign-in screen. Verified the production JavaScript and CSS assets also return HTTP 200.
- Confirmed the local production bundle contains the configured Supabase URL and browser publishable key; the values were not copied into this log. The upload contained the static output only, not `.env.local`.
- Updated the Supabase Auth Site URL to the production URL and added the production URL to the allowed Redirect URLs, retaining `http://localhost:5173`.
- No test account was created and no todo data was changed during deployment checks.
- Custom SMTP is not configured. New accounts may need email confirmation, so reliable confirmation delivery for a wider audience remains to be set up and tested.

### Public URL update — 2026-10-15

- Assigned the cleaner project-specific alias [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) without renaming the Vercel team/account slug, avoiding URL changes for other projects in the account.
- Verified the alias serves the Little List page with HTTP 200.
- Updated the Supabase Auth Site URL to the new alias and added it to allowed Redirect URLs. The previous production alias and local development URL remain allowed.
- Updated the README share link and deployment URL reference.

### Global sign-out — 2026-10-15

- Changed the app's sign-out action to use Supabase global sign-out, revoking refresh sessions for the account across devices.
- Updated the button label and added pending/error UI feedback for the global sign-out request.
- Documented that other devices can remain authenticated until existing access tokens expire.
- Production build completed and deployed to Vercel; the `littlelist-app.vercel.app` alias now points to the new deployment.
- Verified the public page and JavaScript bundle return HTTP 200 and the shipped bundle contains the global sign-out action.
- Did not trigger a real global sign-out during validation, to avoid terminating the user's active sessions.

### End-to-end test preparation — 2026-10-15

- Confirmed the public app returns HTTP 200 and the sign-up form is reachable.
- Confirmed the Supabase Auth health endpoint returns HTTP 200 using the configured publishable key.
- Read the public Supabase Auth settings: sign-up is enabled, email auth is enabled, and email auto-confirm is disabled. Email confirmation is therefore required for new accounts.
- Confirmed an unauthenticated REST read of `public.todos` is denied with HTTP 401.
- SMTP provider configuration is not exposed by the public Auth settings endpoint. The dashboard session expired and redirected to sign-in, so the configured SMTP provider and delivery status could not be checked.
- Attempted to access the dashboard through its GitHub sign-in and the available Google sign-in path; both require interactive account credentials that are not available in this session.
- Did not create a test account, alter authentication settings, or change any todo data. A full signup/sign-in/task CRUD test requires access to a mailbox that can receive the confirmation link; dashboard access is also needed to configure SMTP or change confirmation settings.

### Plan review and Phase 2 progress — 2026-10-15

- Reviewed `plan.txt` against the current codebase.
- Phase 1 is mostly implemented: React/Vite setup, Supabase Auth, per-user RLS, responsive base UI, and hosting are present; user profile management remains missing.
- Phase 2 was partial before this change: create/read/complete/reopen/permanent delete existed; task editing and recovery did not.
- Added accessible inline task-title editing with Save/Cancel, Enter to save, Escape to cancel, request-in-progress handling, and visible failure feedback.
- Added shared title validation that trims whitespace, rejects empty titles, limits titles to 200 Unicode code points to match the Postgres `char_length` constraint, and is used for both creating and editing tasks.
- Added Node's built-in test runner and five focused tests for normalization, blank titles, length boundaries, and supplementary Unicode characters.
- All five tests passed; the production Vite build completed successfully and editor diagnostics reported no issues.
- Deployed the update to Vercel and moved [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) to the new production deployment. Verified the app page, JavaScript, and CSS return HTTP 200 and the served bundle includes the edit UI and validation messages.
- Phases 3–7 remain unimplemented: project/tag/priority/subtask organization; dates/reminders/recurrence; search and richer views; offline/recovery; exports and collaboration.
- Phase 8 is partial: the app is deployed, but broader security, accessibility, observability, performance, and end-to-end test coverage remain.
- No database migration was needed for title edits; updates use the existing authenticated Supabase update policy.
- Phase 2 follow-up: added a `deleted_at` soft-delete migration and wired the app to separate active and trashed tasks, restore from Trash, and undo a recent deletion. Permanent deletion is gated behind Trash and a browser confirmation.
- Added focused tests for active/Done/Trash filtering.
- Updated the fresh-install schema and setup documentation. Initially, rollout was held pending application of `supabase/migrations/20261015093000_add_todo_soft_delete.sql`; the migration was subsequently applied and verified as described below.
- Verified all nine unit tests pass, the production build succeeds, and editor diagnostics are clear.
- Confirmed the existing public production app still responded with HTTP 200 while rollout was held to avoid querying a missing column.
- Applied the additive migration in the authenticated Supabase SQL Editor. It added nullable `deleted_at timestamptz`; an `information_schema.columns` query verified the column type and nullability. Existing task rows were not modified.
- Deployed the Trash/restore build to the existing Vercel production project and moved [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) to the new production deployment.
- Verified the production page, JavaScript bundle, and stylesheet return HTTP 200 and the served bundle contains Trash, Restore, and Undo UI. Confirmed unauthenticated reads including the new column remain denied with HTTP 401.
- Re-ran all nine unit tests successfully and confirmed editor diagnostics remain clear. No task rows or accounts were modified during validation.
- Phase 3 start: added constrained priority levels (`none`, `low`, `medium`, `high`, `urgent`), per-task priority selection, and a filter that composes with status and Trash. Updated the fresh-install schema and added an idempotent production migration.
- All 12 unit tests pass and the production build succeeds; editor diagnostics report no issues.
- Renamed the migration to `supabase/migrations/20261015192000_add_todo_priority.sql` so its timestamp precedes application time. Applied migration `20261015135453` (`add_todo_priority`) to the active Supabase project.
- Verified `public.todos.priority` is non-null text with default `'none'`, and the `todos_priority_check` constraint exists. Existing tasks receive the default without modifying other task data.
- Deployed the priority-enabled frontend to Vercel and updated the stable alias [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app). Verified the page and hashed JS/CSS assets return HTTP 200, the served JavaScript includes the `urgent` priority value, and `/.env.local` returns HTTP 404. The public unauthenticated page renders the sign-in screen as expected.
- Phase 3 projects v1: added an owner-scoped projects schema with RLS, case-insensitive per-user unique names, constrained metadata, and a composite task/project foreign key that prevents cross-user assignments. Tasks can be created within a selected project; project filtering composes with status, Trash, and priority filters.
- Added project-filter unit coverage; all 13 tests pass, the production build succeeds, and editor diagnostics are clear.
- Applied project migration `20261015142031` (`add_todo_projects`) to production. Verified the project table has RLS enabled and four policies, `todos.project_id` exists, and the composite user/project foreign key is present.
- Deployed the project-enabled frontend to Vercel and updated [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app). Verified the page and JS/CSS return HTTP 200, the project UI is in the served bundle, and `/.env.local` returns HTTP 404.
- Signed in to the disposable Playwright test account and verified project creation (HTTP 201), project-filtered task creation (HTTP 201), filtering out unassigned tasks, and permanent task cleanup (HTTP 204). The test project remains on that disposable test account because cleanup through the database write interface was cancelled; no task remains in it. No browser console errors were observed.

### Phase 4 milestone: due dates, build repair, test scoping — 2026-10-24

- Build repair first: `src/App.jsx` imported six modules from `./lib/`, which did not exist, so `npm run build` failed with "Could not resolve ./lib/supabase.js". The modules live in `src/services/` (which the tests import), so the imports were restored to `./services/` paths. The last deployed bundle predates this breakage, so production was unaffected. Empty scaffold directories `src/components`, `src/hooks`, `src/pages`, and `src/utils` were left untouched.
- Scoped the test script to the project's own suite: `npm test` previously ran `node --test` over the whole tree and swept in `ui-ux-pro-max-skill/gallery/lib/parseStyles.test.ts`, which fails. The script is now `node --test "test/*.test.js"`, which covers all project tests and nothing else. On this Node version, directory arguments to `--test` fail on Windows, so the glob form is required.
- Phase 4 milestone 1 (due dates): added an optional calendar `due_date date` column to `public.todos` via the idempotent additive migration [`supabase/migrations/20261024000000_add_todo_due_date.sql`](../../../supabase/migrations/20261024000000_add_todo_due_date.sql), plus a partial index `todos_user_due_date_idx` on `(user_id, due_date) where due_date is not null` for per-user due-date lookups (Today/Upcoming/Overdue views in a later milestone). No new policies or grants: table-level RLS already governs the column, and existing rows keep `due_date` as null.
- Design decision: a plain `date` column rather than `timestamptz`. A date-only due date means that calendar day in the viewer's own timezone by construction; the API returns the same `YYYY-MM-DD` string the user picked, and overdue/today comparisons run in the browser against the user's local calendar day. Time-of-day due dates require storing a user timezone preference (no profiles table exists yet) and are deferred; the additive-migration pattern allows adding `due_at` later without breaking this column.
- Added the pure helper module `src/services/task-due-dates.js`: `validateDueDate` (rejects malformed strings and impossible calendar dates such as 2026-02-31 that JavaScript would silently roll over), `classifyDueDate` (none/overdue/today/upcoming), `formatDueDate` (relative labels "Due today"/"Due tomorrow" and weekday-formatted dates, with overdue tasks labelled "Overdue · <date>" so urgency is readable as text, not just color), `addDaysToKey`/`getTodayKey` calendar arithmetic, and `filterTodosByDueDate` (buckets: no-date, overdue, today, week = today through today+6 inclusive; unknown filter names fall through safely to all). All functions accept an explicit `todayKey` so tests control the clock.
- Extended `filterTodos` in `src/services/task-priorities.js` with optional `dueFilter` and `todayKey` parameters so the due filter composes with status, priority, project, and tag filters, mirroring the existing tag-filter composition.
- Wired the UI in `src/App.jsx`: `due_date` added to all four todos `select` lists (initial load, task insert, subtask insert, update refresh); each non-Trash row shows a due-date chip that opens a `<details>` popover containing a native date input and a Remove button (same interaction pattern as the tag picker; native date inputs are keyboard- and mobile-friendly); Trash rows show a read-only chip like the priority badge; the toolbar gained a "Filter by due date" select beside the priority filter.
- Styled the chips, popover, and filter in `src/assets/styles.css` following the existing conventions: classification colors matching the priority palette (overdue #873c34, today #76603a, upcoming green), urgency also carried by the chip text, and 48px minimum touch targets in both mobile breakpoints.
- Added eight unit tests in `test/task-due-dates.test.js` covering validation (including the 2027-02-29 non-leap rejection), calendar rollovers (month, year, leap day), classification, formatting (including a regression guard that a picked day never formats as the neighboring day regardless of timezone offset), and the week-window boundaries. All 33 project tests pass and the production build succeeds.
- Browser verification against the dev server: the app boots without module or runtime errors, the signed-in workspace renders, the "Filter by due date" combobox shows all five options, and synthetic backend failures surface as the app's normal error notice instead of a blank screen or crash. Authenticated row-level interaction (setting, changing, and clearing a due date against a real account) remains to verify after the migration is applied, because no account credentials are available to this session.
- Deployment order matters: the frontend now selects `todos.due_date`, so the production migration must be applied in the Supabase SQL Editor before the next Vercel deploy, or authenticated loads will fail with a PostgREST "column not found" error. The migration is additive; applying it before the deploy is safe for the currently deployed frontend.
- No production deployment, migration application, or account change was performed in this session; no existing task data was read or modified.

### Production deployment of due dates with graceful degradation — 2026-10-24

- Before deploying, a read-only probe with the publishable key against `https://hglxmhqthuafyokojjjs.supabase.co/rest/v1/todos?select=due_date&limit=1` returned HTTP 400 `42703 column todos.due_date does not exist`, confirming the due-date migration had not been applied to production. The user instructed a deploy regardless, so the frontend was extended to degrade gracefully instead of shipping a known-breaking build.
- Added `isMissingDueDateColumn` to `src/services/task-due-dates.js` (matches PostgREST error code `42703` or a `due_date` "does not exist"/"Could not find" message) with five unit tests; the suite now counts 34 tests, all passing, and the production build succeeds.
- Reworked the todos load in `src/App.jsx` into a `loadTodos` helper: it tries the due-date column list first and, on a missing-column error, retries with the legacy column list and sets a `dueDatesSupported` flag. While unsupported, the three mutation selects (task insert, subtask insert, update refresh) use the legacy list and the due-date row picker and toolbar filter are hidden, so tasks, tags, projects, priorities, and subtasks keep working exactly as the previously deployed build. No data is lost or degraded: rows simply carry no due date.
- Deployed with the Git-free CLI workflow: `npm run build`, `vercel link --cwd ./dist --project little-list --scope anaiks-projects --yes`, `vercel deploy dist --prod --yes`. The deployment `little-list-ngkf2lvl5-anaiks-projects.vercel.app` became Ready with target production, but the stable domain is an explicitly managed alias and did not move automatically; `vercel alias set` moved it.
- Verified the rollout: [`https://littlelist-app.vercel.app`](https://littlelist-app.vercel.app) returns HTTP 200 and serves today's bundle (`index-DXERMlsf.js` / `index-Dz91DB4C.css`), the JavaScript contains the `due_date` and due-filter markers, the stylesheet returns HTTP 200, `/.env.local` returns HTTP 404, and the unauthenticated page renders the sign-in screen in a real browser session.
- Consolidated the remaining aliases after the deployer noticed stale URLs: `little-list-anaiks-projects.vercel.app` and `dist-anaiks-projects.vercel.app` still pointed at the 10-day-old `dist-dqb288jnp` deployment. Both were re-pointed with `vercel alias set` to `little-list-ngkf2lvl5-anaiks-projects.vercel.app`. All five Little List URLs (littlelist-app, little-list-anaiks-projects, dist-anaiks-projects, dist-snowy-sigma-43, and the deployment URL) now return HTTP 200 and serve the same latest bundle. The unrelated `twitter-bot-automation` project's aliases were left untouched.
- The due-date UI is present in the shipped bundle but hidden until the migration is applied. Applying [`supabase/migrations/20261024000000_add_todo_due_date.sql`](../../../supabase/migrations/20261024000000_add_todo_due_date.sql) in the Supabase SQL Editor activates due dates for all users on their next load — no redeploy is needed. Authenticated due-date editing still needs a real-account check once the migration is applied.

### Password visibility toggle on the auth form — 2026-10-24

- Added a Show/Hide button to the password field shared by the sign-in and create-account forms in `src/App.jsx`: a `showPassword` state swaps the input between `password` and `text` types, and the button carries `type="button"` (so it never submits the form), a dynamic `aria-label` ("Show password"/"Hide password"), `aria-pressed` reflecting the state, and a native `title` tooltip. On request the original "Show"/"Hide" text was replaced with inline Material-style eye SVG icons (open eye while masked, slashed eye while revealed) drawn with `currentColor` so no icon library was added.
- Styled in `src/assets/styles.css`: the field is a relative wrapper with the toggle absolutely positioned inside it on the right, the input gains right padding so text clears the button, and the mobile breakpoint raises the toggle to a 44px touch target. Both `autoComplete` modes (`current-password` / `new-password`) and the `minLength` rule are unchanged.
- Verified in a real browser on the dev server: the input type flips between `password` and `text` on click, `aria-pressed` and the button text swap correctly, the typed value survives toggling, a real pointer click lands on the button (checked via hit-testing), and screenshots confirmed the masked and revealed layouts in both auth modes. All 34 unit tests pass and the production build succeeds.
- Not yet deployed; the production site still serves the previous bundle until the next deploy.

### Type-scale increase for readability — 2026-10-24

- Checked the vendored `ui-ux-pro-max-skill` guidance (`src/ui-ux-pro-max/data/ux-guidelines.csv`) before changing sizes. Its relevant rules: minimum 16px body text on mobile (rule 67, high severity), a consistent type scale such as 12/14/16/18/24/32 instead of arbitrary sizes (rule 74), and 1.5–1.75 line height for body text (rule 72, already satisfied by the task titles).
- The stylesheet had ten 10px styles, thirteen 11px styles, and 14px primary reading text — below every floor the guidance sets. Applied a one-step shift to the whole ladder in `src/assets/styles.css`: 10px → 12px, 11px → 12px, 12px → 13px, 13px → 14px, and 14px primary reading text (task titles, auth description) → 16px. Nothing below 12px remains, and the main sizes land on the recommended 12/14/16 steps. Icon glyphs (checkmarks, brand marks, decorative symbols) kept their sizes.
- Added a mobile rule setting all text-entry inputs (add task, subtask, project/tag forms, inline edit, due-date picker) to 16px, satisfying rule 67 and preventing iOS Safari's auto-zoom on focused inputs smaller than 16px.
- Verified with screenshots at 1280px and 390px widths against the dev server: auth screen, workspace shell (sidebar, toolbar, filters, empty state) all render with the larger sizes and no wrapping or overflow breakage. All 34 unit tests pass and the production build succeeds.
- Not yet deployed; production still serves the previous bundle until the next deploy.

### Email-confirmation redirect fix — 2026-10-24

- User report: after confirming account creation from the email link, they landed on a different URL than the site they signed up on.
- Root cause: `signUp` was called without `emailRedirectTo`, so Supabase embedded the dashboard's **Site URL** in the confirmation link for everyone. Signing up on `http://localhost:5173` therefore confirmed into the production URL (and vice versa), regardless of origin.
- Fix in `src/App.jsx`: the signup call now passes `options.emailRedirectTo: window.location.origin`, so the confirmation link returns users to the exact site they signed up from.
- Dashboard requirement (cannot be verified from this session): Supabase honors the requested redirect only when the origin is allow-listed under **Authentication → URL Configuration → Redirect URLs**; otherwise it silently falls back to the Site URL. The allow-list must contain every origin users sign up from — `http://localhost:5173`, `https://littlelist-app.vercel.app`, and any alias domains in use (`little-list-anaiks-projects.vercel.app`, `dist-anaiks-projects.vercel.app`).
- Verified without creating a real account: intercepted the outgoing `/auth/v1/signup` request in the browser (fetch mocked in-page, response faked) and confirmed the request URL now carries `?redirect_to=http%3A%2F%2Flocalhost%3A5173`; the form then showed the normal "Check your inbox" message. The JSON body correctly does not contain the redirect — supabase-js passes it as a query parameter. All 34 unit tests pass and the production build succeeds.
- Not yet deployed; production signups keep the old behavior until the next deploy.

### Production deployment: eye-icon toggle, type scale, email-redirect fix — 2026-10-24

- Deployed the pending frontend changes to production in one release: the password-visibility eye-icon toggle, the readability type-scale increase, and the email-confirmation redirect fix. All 34 unit tests passed and a fresh production build was created before deploying.
- Deployed with the Git-free CLI workflow (`npm run build`, `vercel link --cwd ./dist`, `vercel deploy dist --prod --yes`). New production deployment: `little-list-29ajnotje-anaiks-projects.vercel.app`.
- Re-pointed all three managed aliases (`littlelist-app.vercel.app`, `little-list-anaiks-projects.vercel.app`, `dist-anaiks-projects.vercel.app`) to the new deployment; the auto-assigned `dist-snowy-sigma-43.vercel.app` also serves it.
- Verified the rollout: all five Little List URLs return HTTP 200 and serve the new bundle (`index-DmvVgyco.js` / `index-BKXHnd5V.css`); the bundle contains the "Show password" aria-label and redirect handling; the stylesheet carries the 16px task-title rule; `/.env.local` returns HTTP 404; and a real browser session confirmed the unauthenticated page renders the sign-in screen with the eye-icon button present.
- Production Supabase still lacks the due-date migration; the graceful-degradation fallback keeps due-date UI hidden while everything else works. Applying `supabase/migrations/20261024000000_add_todo_due_date.sql` in the Supabase SQL Editor remains pending and activates due dates without a redeploy.

### Single add-task entry point and subtask visibility fix — 2026-10-24

- User report: the workspace showed two "Add task" buttons (sidebar button plus the inline form's submit), and the question of how an active parent with a completed subtask should display.
- Add-task rework in `src/App.jsx`: the inline form is now hidden by default; the sidebar "Add task" button toggles it (`aria-expanded`/`aria-controls`), auto-focusing the field on open; Escape closes it and clears the draft; adding a task keeps the field open and focused for rapid entry; the state resets on sign-out. The empty Inbox state now shows a note plus an "Add your first task" button that opens the same field, so the right side of an empty page stays clear.
- Subtask display fix in `src/services/task-priorities.js`: status, priority, project, tag, and due filters now select parent tasks, and any non-deleted subtask of a selected parent is re-attached to the result. Previously a completed subtask vanished from the Active view under its still-active parent while the parent's "x / y completed" progress (computed from all tasks) kept counting it. The correct display, now implemented: the completed subtask stays visible struck through under its active parent, and the parent remains open until checked manually; likewise an active subtask shows under a completed parent in Done view.
- Added five unit tests covering the new subtask-visibility rules (active parent keeps its done subtask; done parent keeps active subtasks in Done; subtasks ride along through priority filters; deleted subtasks never re-attach outside Trash; a completed parent and its subtasks stay out of Active). All 39 tests pass and the production build succeeds.
- Verified the add-task flow in the browser on the dev server workspace shell (synthetic local session, backend-failing as designed): empty page shows no form and the note; sidebar click reveals the focused field; Escape closes it; the empty-state button opens it; the sidebar toggle closes it. Not yet deployed.

### Filters hidden on empty views; JWT error explained — 2026-10-24

- User request: hide the filters when no tasks are present. The list toolbar (the "Tasks"/"Deleted tasks" label and the priority/due-date selects) is now rendered only when the current view has anything to filter — computed from the view's pre-filter selection, so a filter combination that matches nothing can always be undone. A genuinely empty view (no tasks at all, an Active view with nothing active, an empty Done view, or an empty Trash) shows no toolbar row.
- Explained the "Expected 3 parts in JWT; got 1" banner: it is Supabase's client rejecting an access token that is not a real JWT. In this case it was caused by the assistant's earlier UI-verification sessions injecting a synthetic token into `localhost:5173`'s localStorage, which is shared with the user's own signed-in tab on the same origin. The remedy for the user is to sign out and sign in again; production was never affected. To prevent recurrence, all subsequent assistant UI tests run against a separate-origin sandbox (a second dev server on port 5174, or any port other than the user's), since storage is partitioned per origin.
- Verified the hidden toolbar with a sandbox session on `http://localhost:5174` (separate origin): an empty workspace renders the heading, empty state with its note and "Add your first task" button, and footer, with no toolbar row and zero filter selects. All 39 unit tests pass and the production build succeeds. Not yet deployed.

### Full end-to-end QA pass with a disposable account — 2026-10-24

- Ran the complete account flow against the real backend from a separate-origin sandbox (dev server on port 5174) using a mail.tm disposable mailbox (`littleliste2e1154910518@maxxspace.com`), so the user's own sessions were never touched.
- Signup → confirmation email received in the temp inbox → confirmation link clicked. Real-world findings: Supabase ignored the sandbox's `emailRedirectTo` (that origin is not allow-listed) and fell back to the Site URL, which is `https://little-list-anaiks-projects.vercel.app/` — confirming both the documented fallback behavior and that the Site URL is the alias domain. The verify link signed the browser straight into the production deployment, where the session was established correctly.
- Signed in on the sandbox and exercised every feature: task create (via the new sidebar-button flow), complete/reopen, inline edit save and Escape-cancel, soft delete with undo, Trash restore, permanent delete (confirm dialog; the DB's `on delete set null` correctly kept the done subtask as a standalone task — no data loss), priority set + urgent filter, project create/rename/reorder/archive/unarchive/delete (confirm dialog; archive resets a selected project view), task creation inside a project, tag create/assign/filter/rename/delete, subtask create/complete with progress, the Active-view subtask visibility fix, sign-out/sign-in, and the mobile (390px) layout. Zero console or page errors across the entire session.
- UI-UX issues found and fixed per the vendored skill's `ux-guidelines.csv`:
  1. Orphaned progress line: Trash showed "x / y completed" under a trashed parent with no children rendered (children are not deleted, so they do not appear in Trash). The progress line is now hidden in Trash, matching the row's read-only restore purpose.
  2. Contrast failures against rule 36 (4.5:1 minimum, high severity): privacy note, subtask progress, tag-picker and list-loading text, project-list empty text, sidebar counts, filter/row selects, manage-menu summaries, action buttons, eyebrows, and the delete × were all below the threshold (≈2.3–4:1). Standardized on `--muted` (#626b60, ≈5:1) and darkened the priority-high amber and the delete icon.
- Both fixes verified in the browser (progress line hidden in Trash; computed muted color rgb(98, 107, 96)); all 39 unit tests pass and the production build succeeds.
- The disposable test account and its sample data remain on the Supabase project (precedent: earlier disposable test account); its credentials are not recorded here. The sandbox server was stopped after testing; the user's own dev server and sessions were untouched.

### Production deployment: add-task flow, subtask fix, empty-view filters, UX fixes — 2026-10-24

- Deployed the accumulated frontend changes in one release: the single add-task entry point (sidebar button reveals a focused field, Escape closes, empty-state "Add your first task" button), the subtask-visibility fix (filters select parents; non-deleted subtasks always render with their parent), hidden toolbars on genuinely empty views, the Trash progress-line fix, and the contrast sweep to `--muted` per the skill's 4.5:1 rule. All 39 unit tests passed on the exact build that shipped.
- Deployed with the Git-free CLI workflow; new production deployment `little-list-8uzc4nlwd-anaiks-projects.vercel.app`. All three managed aliases (littlelist-app, little-list-anaiks-projects, dist-anaiks-projects) were re-pointed and verified serving the new bundle (`index-BrbL1J1t.js` / `index-mHd57K-P.css`), with the "Add your first task" and `task-add-form` markers present in the bundle, the muted privacy-note color in the stylesheet, `/.env.local` at HTTP 404, and the sign-in screen rendering in a real browser session.
- Production Supabase still lacks the due-date migration; the graceful-degradation fallback keeps the due-date UI hidden. Applying `supabase/migrations/20261024000000_add_todo_due_date.sql` in the Supabase SQL Editor remains the pending step to activate due dates without a redeploy.

### Fix: nested subtasks invisible in Trash — 2026-10-24

- User report from production: the Trash sidebar count said 2 while the list showed 1 task, and a priority filter revealed the "other" task. Root cause (a regression from the Trash progress-line fix shipped earlier the same day): two stacked problems. First, the fix had hidden the entire subtask section in Trash — including nested trashed subtasks — instead of only the progress line. Second, the section's gate used `getSubtaskProgress(...).total`, which counts only non-deleted children, so for a trashed parent it was 0 and the section never rendered even after the first fix. With a trashed parent + trashed subtask: the parent rendered alone (count 2 vs list 1), and filtering by "No priority" matched only the subtask, which then rendered standalone because its parent dropped out of the list — exactly the reported behavior.
- Fix in `src/App.jsx`: the subtask section now renders when `children.length > 0` (nested subtasks present in the current view, including Trash) or when outside Trash and the parent has non-deleted subtasks; the progress line remains hidden in Trash only. Verified against a live reproduction (trashed parent + trashed subtask): Trash shows the nested subtask beneath its parent, the row count matches the sidebar count, and no progress line renders.
- All 39 unit tests pass. Deployed as production deployment `little-list-p2719lw5r` (bundle `index-OiXszg3y.js`, content-hashed from the fixed source); all three managed aliases re-pointed and verified; `/.env.local` remains HTTP 404.
- Sandbox session (port 5174) signed out, storage cleared, server stopped after verification.

### Todoist study and milestone 1: flags, quick-add parsing — 2026-10-24

- Explored the user's Todoist account via API v1 (`api.todoist.com/api/v1`; the REST v2 endpoints are deprecated) with a user-provided token used read-only, plus the official developer reference. Findings recorded in [`docs/todoist-clone-notes.md`](../../todoist-clone-notes.md): the full task/project/section/label data model (fractional `order_key` ordering, `due` objects with recurrence, separate deadlines, task descriptions, comments, unlimited-depth subtasks), the quick-add token syntax, and a Todoist-vs-Little-List gap analysis with a phased roadmap. The account itself contained only the default Inbox and one task.
- Implemented milestone 1 (no schema change, so everything works on the current production database):
  - Todoist-style priority flags: the five DB levels now display as `P1 · Urgent` (red), `P2 · High`, `P3 · Medium`, `P4 · Low`, and `No priority` in row selects, the toolbar filter, and Trash badges (P1 most urgent, matching Todoist's UI rather than its inverted API numbering).
  - Natural-language quick add (`src/services/quick-add.js`): `#Project` (existing projects, case-insensitive), `@tag` (existing tags), `p1`–`p4`, and date phrases (`today`/`tod`, `tomorrow`/`tom`, `next week`, weekday names with same-day or "next" semantics) parse out of the quick-add input and apply on creation — project overrides the current filter, priority is stored, tag is assigned, and the date lands in `due_date` when supported. Precedence guards keep `@p2` a tag, and unconsumed tokens stay in the title so nothing is silently lost; when the backend lacks the due-date column, date phrases remain in the title.
  - Today and Upcoming sidebar views (Today = overdue + due today, Upcoming = later), with live counts, gated on due-date support so they appear automatically once the due-date migration is applied to production.
- Eleven new parser tests plus sidebar-bucket tests bring the suite to 51; all pass, and the production build succeeds. Verified in the browser on the sandbox against the real backend: a quick add of "Pay water bill p1 #Errands @errands" produced a task titled "Pay water bill" with P1 flag and errands chip; date tokens stayed in the title with the pre-migration schema; Today/Upcoming stayed hidden; zero console errors.
- Deployed as production deployment `little-list-mtrrmre0k`; all three managed aliases re-pointed and verified serving the new bundle; `/.env.local` remains HTTP 404.
- Security note: the Todoist API token was posted in chat by the user and should be rotated; it was used read-only and never stored in the repository.

### Todoist milestone 2: red accent theme and colored projects/labels — 2026-10-24

- Re-themed the app to Todoist's visual language: white surfaces with a light-gray sidebar (previously cream/green), Todoist brand red `#dc4c3e` as the accent (brand mark, primary buttons, sidebar add button, focus rings, checkbox hover, quick-add focus border), neutral gray text and borders, and the green palette removed entirely except semantic success states. Text contrast was preserved (muted gray #666666 ≈ 5.7:1 on white; link-red uses the darker `--accent-dark` at ≈ 5.6:1).
- Added `src/services/colors.js`: Todoist's label palette as chip pairs (main color, light tint, darkened text — each pair holds 4.5:1 contrast) plus a deterministic djb2 assignment so every project gets a stable colored dot and every tag a stable colored chip and `#` mark without a schema column. User-chosen colors are noted as a future schema addition in `docs/todoist-clone-notes.md`.
- Wired the colors in `src/App.jsx`: project dots in the sidebar, tag chips on tasks, tag rows in the manage menu, and tag `#` marks now take their palette colors inline.
- Added three determinism/palette tests (suite now 54, all passing). Verified in the browser on the sandbox with screenshots: themed workspace (red brand, blue project dot, pink errands chip) and themed auth screen. The checked-checkbox treatment changed to Todoist's gray fill.
- Deployed as production deployment `little-list-5ykoay9tv`; all three managed aliases re-pointed and verified serving the new bundle (`index-C8CFFX32.js`), the stylesheet carries the Todoist red, `/.env.local` remains HTTP 404.

### Fix: favicon and theme-color still in the old brand green — 2026-10-24

- User catch: the browser-tab icon was missed during the red re-theme. `public/favicon.svg` still carried the old green `#426c55` and the `theme-color` meta still carried the old cream `#f6f5f0` — both browser-chrome surfaces that sit outside the stylesheet sweep.
- Updated the favicon tile to the brand red `#dc4c3e` and the theme-color meta to match, so the tab icon and mobile address bar match the app.
- All 54 tests pass; deployed as production deployment `little-list-mceeyxvui`; all three managed aliases re-pointed; the served favicon and theme-color verified on production.

### Todoist milestone 3: full layout, branding, and copy replacement — 2026-10-24

- Completed the visual/structural clone per the user's "change everything, don't keep anything from the original project": the app name stays "Little List" (deliberate — Todoist is a trademark), but every other original-design element was replaced.
- Layout restructure: the top bar is gone. The app is now sidebar-first like Todoist — the red checkmark-tile logo and app name lead the sidebar, followed by the Add task button, a search input, the view navigation (Inbox/Today/Upcoming/Active/Done/Trash with counts), Projects, Tags, and the signed-in email plus Sign out at the sidebar bottom. Typography switched from Georgia serif headings to Todoist's system font stack with bold 24px view headers.
- New client-side search: the sidebar search box filters non-deleted task titles live, showing a "Search" view with a result count, hiding the toolbar and add form while active, clearable with Escape or the × button.
- Copy replaced everywhere: auth screen ("Log in"/"Sign up", "Log in to see your to-do list.", "Private by design" — no eyebrow, no arrow on buttons), empty states ("No tasks yet", "Nothing left to do.", "No completed tasks yet.", "No results."), the footer is removed, and index.html's description now reads "Organize your work and life, one task at a time."
- Favicon and brand mark replaced with the Todoist-style red rounded tile and white checkmark (inline SVG in-app, same SVG as favicon).
- All 54 unit tests pass and the production build succeeds. Verified in the browser on the sandbox: themed auth screen, the new sidebar layout with working search ("oat" → 2 results), search clearing, and the account block in the sidebar.
- Deployed as production deployment `little-list-qm8pffa9u`; all three managed aliases re-pointed and verified serving the new bundle (`index-D47tUDRn.js`) and copy; `/.env.local` remains HTTP 404.

### Todoist milestone 4: task descriptions with graceful multi-column fallback — 2026-10-24

- Added the task-description feature (Todoist's `//` quick-add token and separate description field). The production database does not have the new column yet, so — like due dates — the feature is shipped behind the app's graceful-degradation pattern and activates automatically when the migration is applied.
- New migration [`supabase/migrations/20261025000000_add_todo_description.sql`](../supabase/migrations/20261025000000_add_todo_description.sql): `todos.description text not null default ''` with a 2000-character check; schema.sql updated to match. No new policies or grants needed.
- Generalized the todos load fallback: instead of a one-off due-date retry, `loadTodos` now walks a chain of column sets (full → with-due-date → base), stepping down on undefined-column errors, and sets independent `dueDatesSupported` / `descriptionsSupported` flags. Any pending migration therefore degrades on its own and its feature activates when applied — future milestones can extend the chain.
- Quick add now splits on `//`: everything after the separator becomes the description (only when supported; otherwise the text stays in the title). Parsing is covered by four new unit tests; the suite is at 57, all passing.
- Descriptions render as a muted second line under task titles, and the inline edit form gained a description field (hidden while unsupported, shared by tasks and subtasks, Escape cancels both fields, save is skipped when nothing changed).
- Verified in the browser on the sandbox against the real backend: with the description column absent, `Buy milk // lactose free` keeps the full text in the title, the description editor is correctly hidden, and there are zero console errors.
- Deployed as production deployment `little-list-1c205njnj`; all three managed aliases re-pointed and verified serving the new bundle; `/.env.local` remains HTTP 404.
- Migration queue for the user (paste in order): 1. `20261024000000_add_todo_due_date.sql` (due dates, Today/Upcoming, quick-add dates), 2. `20261025000000_add_todo_description.sql` (descriptions and the `//` token).

### Todoist milestone 5: recurring tasks — 2026-10-25

- Implemented recurring tasks, Todoist's hallmark feature, behind the graceful-degradation pattern (the recurrence column is third in the pending-migration queue).
- New migration [`supabase/migrations/20261025010000_add_todo_recurrence.sql`](../supabase/migrations/20261025010000_add_todo_recurrence.sql): `todos.recurrence text` with a 100-character check; schema.sql updated. The column stores a normalized human phrase ("every day", "every 3 days", "every monday", "every month", "every year").
- New pure module `src/services/recurrence.js`: `extractRecurrence` finds and normalizes the first "every …" phrase in free text (intervals, plurals, weekday abbreviations), and `nextRecurrenceDate` computes the next due date strictly after the base — including month-end clamping (Jan 31 → Feb 28), leap-year handling (Feb 29 → Feb 28), and strictly-after weekday math. Eight unit tests cover the engine; three parser tests cover quick-add integration; the suite is at 65, all passing.
- Quick add now parses `every …` before date phrases (so the weekday inside "every monday" isn't eaten by the date parser). The token sets the recurrence rule and the first occurrence — today for interval rules, the weekday itself for weekday rules — unless an explicit date was already parsed. When the backend lacks the columns, the phrase stays in the title.
- Completing a recurring task spawns its next occurrence as a new task with the same title, description, priority, project, parent, recurrence, and tags, with the due date advanced from the previous due date (or today). The completed occurrence stays in Done, giving history plus the future instance; failures surface as clear, separate error messages ("task completed, but its next occurrence couldn't be created") so a spawn failure never loses a completion.
- Recurring tasks show a repeat-icon chip with the phrase (Todoist-style) when supported.
- Verified in the browser on the sandbox against the real backend: with the columns absent, "Take out trash every monday" keeps its full title, no chip renders, and completing it behaves exactly like a plain task — zero console errors.
- Deployed as production deployment `little-list-m9zr5l6eb`; all three managed aliases re-pointed and verified; `/.env.local` remains HTTP 404.
- Migration queue for the user (paste in order): 1. `20261024000000_add_todo_due_date.sql`, 2. `20261025000000_add_todo_description.sql`, 3. `20261025010000_add_todo_recurrence.sql`.

### UX fixes: quick-add modal and Done count — 2026-10-25

- User report from production: the inline add form made no sense on views where a new task can't appear (Done, Trash), and the Done row was the only view without a sidebar count.
- Replaced the inline add form with a Todoist-style quick-add modal: clicking Add task (sidebar or the empty-state button) opens a centered dialog over a dimmed backdrop, from every view. The modal has a focused title input with natural-language parsing, a description field, live parsed-token chips (project, tag, priority, due date, recurrence) rendered as they're typed, and Cancel/Add actions. Escape or a backdrop click closes it; a successful add closes it and a failure keeps it open with the error shown. Unmatched tokens (unknown projects/tags, dates while migrations are pending) correctly stay in the title.
- Added the Done count to the sidebar (same treatment as Active and Trash).
- Removed the inline form and its styles entirely. All 65 unit tests pass; the production build succeeds.
- Verified in the browser on the sandbox against the real backend: on the Done view the modal opens over the list, typing "Water the plants p2 @home #Errands tomorrow" showed Errands and P2 · High chips, submitting created the task in the Errands project (visible in that project view) and closed the modal; the Done and Active counts rendered correctly; zero console errors.
- Deployed as production deployment `little-list-9w6atjtwl`; all three managed aliases re-pointed and verified serving the new bundle; `/.env.local` remains HTTP 404.

### Migrations applied by the assistant; full feature verification on live data — 2026-10-25

- The user provided a Supabase personal access token, so the pending migrations were applied by the assistant through the Management API (`POST /v1/projects/{ref}/database/query`) instead of the SQL Editor: `20261024000000_add_todo_due_date.sql`, `20261025000000_add_todo_description.sql`, and `20261025010000_add_todo_recurrence.sql` all returned 201.
- Verified the columns are live: unauthenticated probes with the publishable key now return permission denied (42501, correct — the anon role has no todos access by the hardening grants) instead of "column does not exist"; the `authenticated` role's table-level grants automatically cover the new columns, and an API smoke test signed in as the disposable account, inserted a task with `due_date`, `description`, and `recurrence` set, read it back, and cleaned it up (201/200/204).
- Full browser smoke test on the sandbox against live data: the column-fallback chain now selects the full column set, so Today and Upcoming sidebar views render, quick add of "Review budget every friday p1" showed live chips (P1 · Urgent, Fri Oct 30, every friday) and created the task with its recurrence chip and due chip, and completing it spawned the next occurrence due Fri Nov 6 with the Done count incrementing — exactly the Todoist spawn-on-completion behavior. Zero console errors.
- SMTP/auth config checked via the Management API: built-in Supabase SMTP is in use (no custom host), email confirmation is on (`mailer_autoconfirm: false`). Configuring a custom SMTP provider still requires SMTP provider credentials from the user, which have not been provided.
- Security: the Supabase personal access token was posted in chat and used for this session's Management API calls only; it was never stored in the repository and should be rotated along with the Todoist token.

### Principal-QA deliverable: formal test suite — 2026-10-25

- Added a self-contained `qa/` folder (11 documents) covering the full shipped feature set: test plan with risk model and entry/exit criteria, 139 test cases across six files (15 end-to-end scenarios, 43 positive, 37 negative, 24 boundary, 24 equivalence partitions, 22 state transitions with Mermaid lifecycle diagrams), a requirements traceability matrix mapping 50 requirement IDs to cases and automation status, and requirement analysis (18 missing-requirement findings, 8 ambiguities, 14 assumptions needing product rulings).
- Notable defect-level findings recorded for action: tag name UI/DB length mismatch (80 vs 40), raw database errors surfacing to users (plan §32 violation), Today/Upcoming counts including completed tasks, and title-only search against plan §11.
- 78 cases are High automation suitability and map onto the existing `node --test` suites; the remaining Med/Low cases define the Playwright and manual backlogs.

### GitHub repo reconciled and all changes pushed — 2026-10-25

- The user installed the GitHub CLI (assisted — winget's silent install needed locating in the WinGet packages cache) and completed device-flow authentication; git is configured to use the GitHub credential helper via `gh auth setup-git`.
- Discovered during push: the existing GitHub repository [`Sudo-Aditya/little-list`](https://github.com/Sudo-Aditya/little-list) contains the **original project's history** — seven commits including `src/lib/` modules and `src/styles.css`. This resolves the long-standing mystery of the local `./lib/` imports: the local working copy was a reorganized checkout that had lost its `.git` folder while the original version lived on GitHub.
- Rather than discarding that history, it was merged: `git merge origin/main --allow-unrelated-histories -X ours` preserves both lineages with the current Todoist-style app winning all content conflicts, followed by a cleanup commit removing the legacy `src/lib/` modules and stylesheet the merge resurrected.
- Pushed `47e54ac..2225247` to `main` (normal fast-forward). Remote tree verified: 59 files, matching local exactly, no legacy paths. Latest commit on GitHub: `2225247`.
- Repository visibility is currently **public** (user's choice at creation). The secret scan found no tokens or credentials in tracked files, but the `qa/` suite and dev log are publicly readable — flip to private in Settings if preferred.

## Remaining before friends can use it

1. **Email delivery:** Set up a custom SMTP provider in Supabase if email confirmation is required. Alternatively, for a small friends-only demo, decide whether to disable email confirmation under **Authentication → Sign In / Providers**.
2. **End-to-end account test:** After email delivery is configured (or the email-confirmation policy is deliberately changed), create a dedicated test account, verify sign-in, and check that adding/completing/deleting todos works.
3. **Future deployments:** Use the Git-free CLI steps in the README to rebuild locally from `.env.local`, link the generated `dist` directory to the existing Vercel project, and deploy it.

## Security and maintenance notes

- Never put a Supabase secret/service-role key or database password in frontend code, `.env.example`, or this log.
- Keep `.env.local` out of source control; it contains local Supabase configuration.
- The publishable key is intended for browser use; access control depends on the database grants and row-level security policies, not on hiding that key.
- Update this log after future feature work, hosting setup, Supabase configuration changes, or verification runs.
