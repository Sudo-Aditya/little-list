# Functional Test Scenarios (End-to-End Journeys)

Full user journeys crossing multiple features. Requirement IDs are defined in `../requirements/traceability-matrix.md`.

---

## FS-01 — New user signs up, confirms via email, lands back on the origin site
- **Requirement:** R-AUTH-01 (sign-up + confirmation + origin redirect)
- **Preconditions:** Supabase project live; confirmation emails enabled; origin under test is allow-listed in Redirect URLs; empty mailbox available
- **Test data:** fresh address `qa.fresh.<timestamp>@<temp-mail-domain>`, password `Qa!Pass-12345`
- **Steps:** 1) Open the app on the origin → 2) Switch to Sign up, fill email/password, submit → 3) Observe "Check your inbox…" notice → 4) Open the confirmation email, click the link → 5) Observe landing page URL
- **Expected result:** Step 3 shows the notice and no error; step 5 lands on the origin the user signed up from, signed in (verify link carries the session); if the origin is *not* allow-listed, the link instead resolves to the configured Site URL (documented fallback)
- **Priority:** P0 | **Risk:** H | **Automation:** Med (needs real mailbox — mail.tm pattern proven)

## FS-02 — Existing user logs in, session persists across reload, local sign-out only affects this device
- **Requirement:** R-AUTH-02, R-AUTH-03, R-AUTH-04
- **Preconditions:** confirmed account; two browser profiles (or an incognito window) signed in simultaneously
- **Test data:** confirmed account credentials
- **Steps:** 1) Log in on profile A → 2) Reload → 3) Log in on profile B with the same account → 4) Sign out on A → 5) Check B
- **Expected result:** After reload A stays signed in (no auth screen); after A signs out, B remains signed in and functional
- **Priority:** P0 | **Risk:** H | **Automation:** Med (two Playwright contexts)

## FS-03 — Create a task with every quick-add token from the modal
- **Requirement:** R-QA-01…R-QA-06, R-MOD-01
- **Preconditions:** signed in; projects contain "Errands"; tags contain "home"; due dates/recurrence/description columns applied
- **Test data:** `Pay water bill p1 #Errands @home tomorrow // check the meter`
- **Steps:** 1) Click "Add task" → 2) Type the string; watch chips while typing → 3) Submit → 4) Inspect the created task (title, chip row, project view, tag picker)
- **Expected result:** Live chips show Errands, P1 · Urgent, tomorrow's date; after submit the modal closes; task titled "Pay water bill" exists in Errands, flagged urgent, tagged home, due tomorrow, description "check the meter"
- **Priority:** P0 | **Risk:** H | **Automation:** Med

## FS-04 — Complete a recurring task; next occurrence spawns with same metadata
- **Requirement:** R-REC-02, R-SUB-02 (tag inheritance on spawn)
- **Preconditions:** recurring task exists (e.g., "Review budget", `every friday`, due Fri Oct 30, priority P1, tag, description)
- **Test data:** the seeded recurring task
- **Steps:** 1) Complete the task → 2) Observe Done count increments → 3) Find the new occurrence → 4) Verify its due date, recurrence chip, priority, tag, description
- **Expected result:** Completed instance remains in Done; a new active occurrence exists with identical title/priority/tag/description/recurrence, due the next occurrence date (Fri Nov 6); no console errors
- **Priority:** P0 | **Risk:** H | **Automation:** Med

## FS-05 — Soft delete → undo within the window → still-present task
- **Requirement:** R-TASK-05
- **Preconditions:** signed in; at least one active task
- **Test data:** task "Undo me"
- **Steps:** 1) Delete the task → 2) Observe "Task moved to Trash — Undo" notice → 3) Click Undo immediately → 4) Check Inbox and Trash
- **Expected result:** Task reappears in Inbox as active; Trash count returns to previous value; notice disappears
- **Priority:** P0 | **Risk:** H | **Automation:** Med

## FS-06 — Trash: restore one item, permanently delete another (with confirmation)
- **Requirement:** R-TASK-06, R-TASK-07
- **Preconditions:** at least two soft-deleted tasks
- **Test data:** tasks "Restore me", "Kill me"
- **Steps:** 1) Open Trash → 2) Restore "Restore me" → 3) Click × on "Kill me" → 4) Cancel the confirm dialog → 5) Click × again and accept
- **Expected result:** Cancel leaves the task in Trash; accept removes it permanently (count decrements, gone from Trash and never returns in Inbox); restored task is active in Inbox; trashed parent+subtask pairs render nested in Trash (no progress line)
- **Priority:** P0 | **Risk:** H | **Automation:** Med

## FS-07 — Deleting a parent task keeps its subtasks as standalone tasks
- **Requirement:** R-SUB-04 (orphaning on parent permanent delete)
- **Preconditions:** parent with one subtask, both in Trash
- **Test data:** parent "Parent", subtask "Child"
- **Steps:** 1) Permanently delete "Parent" from Trash → 2) Return to Inbox
- **Expected result:** "Child" remains, no longer indented, no progress line anywhere for it; nothing else lost
- **Priority:** P0 | **Risk:** H | **Automation:** Med

## FS-08 — Project lifecycle: create → task inside → rename → reorder → archive → unarchive → delete keeps tasks
- **Requirement:** R-PROJ-01…R-PROJ-05
- **Preconditions:** signed in with ≥1 other project
- **Test data:** "Errands", "Home"
- **Steps:** 1) Create both projects → 2) With Errands selected, add "Pick up parcel" → 3) Rename Home → "Homestead" → 4) Move Errands below Homestead → 5) Archive Errands while it is the selected view → 6) Unarchive → 7) Delete Errands (confirm)
- **Expected result:** Task created lands in Errands (project view shows it); rename reflected everywhere; order persists after reload; archiving a selected view resets the list to Inbox and removes it from the sidebar; unarchive restores it (order retained); deleting moves its tasks to no-project — "Pick up parcel" survives in Inbox
- **Priority:** P1 | **Risk:** M | **Automation:** Med

## FS-09 — Tag assignment, filtering, rename propagation, delete cascade
- **Requirement:** R-TAG-01, R-TAG-02
- **Preconditions:** tasks exist
- **Test data:** tag "errands"
- **Steps:** 1) Create tag → 2) Assign to two tasks via row tag picker → 3) Filter by tag in sidebar → 4) Rename tag → 5) Delete tag (confirm)
- **Expected result:** Chip appears on both tasks; filtered view shows exactly those tasks (title = tag name); after rename, chips and sidebar update live; after delete, chips vanish and filter resets — tasks themselves untouched
- **Priority:** P1 | **Risk:** M | **Automation:** Med

## FS-10 — Subtask flow: create under parent, inheritance, progress, one-level limit
- **Requirement:** R-SUB-01…R-SUB-03
- **Preconditions:** parent task with project + tag assigned
- **Test data:** parent "Launch site"; subtask "Buy domain"
- **Steps:** 1) Add subtask → 2) Verify inheritance (project + tags copied) → 3) Complete the subtask → 4) Switch to Active view → 5) Attempt to add a subtask *to the subtask*
- **Expected result:** Progress reads 1/1; in Active view the parent stays open with the completed subtask struck-through beneath it; the "+ Subtask" button is absent on subtask rows (one level only)
- **Priority:** P1 | **Risk:** M | **Automation:** Med

## FS-11 — Due-date filter buckets compose with priority and project filters
- **Requirement:** R-DATE-03, R-PRI-03
- **Preconditions:** tasks seeded: overdue+urgent, today+none, next-week+high, no-date+urgent
- **Test data:** the seeded matrix
- **Steps:** 1) Filter Due today → 2) Add priority=Urgent → 3) Add project filter → 4) Reset one filter at a time
- **Expected result:** Each combination shows only tasks matching ALL active filters; removing a filter widens results; "No due date" bucket returns the no-date task only; toolbar remains visible whenever the view has any pre-filter tasks so a zero-result combination can always be undone
- **Priority:** P1 | **Risk:** M | **Automation:** High (pure `filterTodos` logic — extend unit tests)

## FS-12 — Today and Upcoming views
- **Requirement:** R-VIEW-02, R-VIEW-03
- **Preconditions:** tasks seeded: overdue, due today, due tomorrow, due in 8 days, no due date
- **Steps:** 1) Open Today → 2) Open Upcoming → 3) Compare with sidebar counts
- **Expected result:** Today lists overdue + due-today tasks; Upcoming lists strictly-later tasks; counts match list lengths (see MR-08 for the completed-task ambiguity); the due-date dropdown is hidden inside these bucket views
- **Priority:** P1 | **Risk:** M | **Automation:** High (bucket logic) / Med (view)

## FS-13 — Search: match, no-match, clear
- **Requirement:** R-SRCH-01
- **Preconditions:** tasks "Buy oat milk", "Call the bank" exist (one trashed copy of any title also exists)
- **Test data:** query `oat`, query `zzz`
- **Steps:** 1) Type `oat` → 2) Type `zzz` → 3) Press Escape / click ×
- **Expected result:** `oat` shows only non-deleted matching titles with an "N results" count; `zzz` shows the empty-search state ("No results."); clearing returns to the previous view; toolbar and add-form hidden while searching
- **Priority:** P2 | **Risk:** L | **Automation:** Med

## FS-14 — Cross-user isolation (RLS)
- **Requirement:** R-SEC-01
- **Preconditions:** two confirmed accounts (A, B); A owns tasks/projects/tags
- **Steps:** 1) As B (UI), search and browse all views → 2) As B (API with B's token), query tasks/projects/tags with A's known IDs and with no filter
- **Expected result:** B's UI shows zero of A's items; B's API calls return only B's rows; direct reads of A's row IDs return empty; anon-key requests are denied
- **Priority:** P0 | **Risk:** H | **Automation:** High (API layer)

## FS-15 — Graceful degradation when a schema column is missing
- **Requirement:** R-PORT-01 (column-fallback chain)
- **Preconditions:** a Supabase project without the description column (or a local project created from `schema.sql` before a milestone)
- **Steps:** 1) Load the app → 2) Attempt `Buy milk // lactose free` in quick add → 3) Open the edit form
- **Expected result:** Workspace loads normally; `// …` stays in the title; the description field is absent; due-date/recurrence features independently follow their own columns; no console errors
- **Priority:** P1 | **Risk:** M | **Automation:** Med
