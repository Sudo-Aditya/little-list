# Accessibility Test Cases — WCAG 2.1 AA

Audit performed 2026-10-25 against the live workspace (code review + scripted DOM inspection + rendered-contrast measurement) with the sandbox account. WCAG level: **2.1 AA** (plan §22). Every finding is mapped to a success criterion (SC); "✓" rows confirm passing behavior and guard against regressions.

## Findings summary (defects first)

| ID | WCAG SC | Finding | Sev |
|---|---|---|---|
| A11Y-KB-01 | 2.4.3 Focus Order | Modal has `aria-modal="true"` but **no focus trap** — Tab escapes into the background page while sighted users see the overlay | High |
| A11Y-KB-02 | 2.4.3 Focus Order | **Focus is lost to `<body>` after the modal closes** (backdrop/Cancel/submit) — keyboard users restart from the top of the page | High |
| A11Y-SR-01 | 4.1.3 Status Messages | **Undo notice has no `role="status"`** — "Task moved to Trash" is never announced | High |
| A11Y-SR-02 | 4.1.3 Status Messages | Task creation/completion/deletion/recurrence-spawn change the list silently — no live region announces additions | Medium |
| A11Y-CON-01 | 1.4.3 Contrast | **Completed task titles: #999 on white = 2.85:1** (needs 4.5:1) — the strike-through carries state, the text is still content | Medium |
| A11Y-HD-01 | 1.3.1 Info & Relationships | Heading order runs **H2 (Projects) → H2 (Tags) → H1 (view title)** — H2s precede the H1 in DOM | Medium |
| A11Y-FORM-01 | 3.3.1 Error Identification | Auth/login and form errors render as a single notice **not associated with the offending input** (`aria-describedby` missing) — screen readers get the message but not which field | Medium |
| A11Y-DIS-01 | 1.4.13 Content on Hover/Focus | Tag-picker, due-picker, and manage popovers are not **dismissable with Escape** and overlay adjacent content | Medium |
| A11Y-NAV-01 | 2.4.1 Bypass Blocks | **No skip link** past the ~20-tab-stop sidebar | Medium |
| A11Y-SR-03 | 4.1.2 Name/Role/Value | Some decorative SVGs (brand check, recurrence icon) lack `aria-hidden="true"` | Low |
| A11Y-TIME-01 | 2.2.1 Timing Adjustable | Undo notice auto-dismisses after 10 s (mitigated: Trash provides the same recovery) | Low |
| A11Y-ZOOM-01 | 1.4.10 Reflow | 15 px horizontal scroll at 320 px width (BF-09) | Low |

## Confirmed passing (regression guards)

| Area | Evidence | SC |
|---|---|---|
| All buttons/selects/inputs have accessible names (0 violations found, incl. icon-only ×, ···, Restore) | live DOM audit | 4.1.2, 1.1.1 |
| Error notices use `role="alert"` when rendered (verified by triggering a failure) | live DOM audit | 4.1.3 |
| Modal moves focus to the title input on open; `role="dialog"`, `aria-modal`, labelled | live DOM audit | 2.4.3 (partial) |
| Checkbox is a real `<button>` with dynamic `aria-label` + `aria-pressed` | code | 4.1.2 |
| Priority filter/labels announce `P1 · Urgent` (text carries urgency, not color alone) | code | 1.4.1 |
| Focus-visible outlines globally defined (3 px accent) | CSS | 2.4.7 |
| `prefers-reduced-motion` disables row/loader animations | CSS | 2.3.3 |
| `lang="en"` set; no unlabelled images; search is `type="search"` | live DOM audit | 3.1.1, 1.1.1 |
| Measured contrasts: muted text 5.32, due chip 6.09, urgent flag 7.7, delete icon 3.9, checkbox border 3.45 (all ≥ 4.5 text / 3.0 non-text) | computed | 1.4.3, 1.4.11 |
| Native `<details>` pickers, `type="search"`, `type="date"`, real `<ul>`/`<li>` task lists, single H1 per screen (order issue separate) | code | 1.3.1 |

---

## Test cases

ID prefix `A11Y-<area>-nn`. Requirement column cites the WCAG 2.1 SC. Automation: High = DOM-computable ( axe-core candidates), Med = scripted keyboard/focus run, Low = needs SR or human judgment.

### Keyboard navigation

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-KB-01 | 2.4.3 | Modal open | Press Tab repeatedly through the modal | Focus stays within the dialog (trap) and cycles title → description → Cancel → Add | High | H | Med |
| A11Y-KB-02 | 2.4.3 | Modal about to close | Close via submit | Focus returns to the "Add task" button that opened it (not `<body>`) | High | H | Med |
| A11Y-KB-03 | 2.1.2 | Modal open | Press Escape | Modal closes (✓ implemented); focus per A11Y-KB-02 | P1 | M | Med |
| A11Y-KB-04 | 2.1.1 | Any screen | Tab through the entire page | Every interactive control reachable and operable by keyboard alone; no traps outside modals | High | H | Med |
| A11Y-KB-05 | 2.4.7 | Any screen | Tab to any control | Visible 3 px focus outline on every control incl. inside dark chips | High | M | High |
| A11Y-KB-06 | 2.4.3 | Popover open (tag/due/manage) | Shift+Tab back to the summary | Focus order reverses cleanly; popover stays open until dismissed | P2 | M | Med |

### Focus management

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-FM-01 | 2.4.3 | Task deleted from a row | Observe focus after removal | Focus moves to the next task row / a sensible anchor — not `<body>` | P1 | M | Med |
| A11Y-FM-02 | 1.4.13 | Tag or due popover open | Press Escape | Popover closes (currently it does NOT) and focus returns to its summary | P1 | M | Med |
| A11Y-FM-03 | 1.4.13 | Popover open | Read content around it | Overlaid content hidden behind the popover is still reachable after dismissal (✓ transient) | P2 | L | Med |
| A11Y-FM-04 | 2.4.3 | Undo notice visible | — | Notice is focusable or announced (see A11Y-SR-01) | P2 | L | Med |

### Screen readers

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-SR-01 | 4.1.3 | Delete a task | Listen (or inspect live-region roles) | "Task moved to Trash" announced — currently the undo notice has no role | High | H | Med |
| A11Y-SR-02 | 4.1.3 | Create/complete/spawn a task | Listen | List addition announced via a polite live region | P1 | M | Med |
| A11Y-SR-03 | 4.1.2 | Any screen | Walk controls with NVDA/JAWS | Decorative SVGs (brand, recurrence icon) are silent — add `aria-hidden` | P2 | L | High |
| A11Y-SR-04 | 1.1.1 | — | — | No meaningful images without alt (✓ none exist) | — | — | High |
| A11Y-SR-05 | 4.1.2 | Modal open | NVDA browse mode | Dialog announced with label "Add a task"; with the trap fixed, virtual cursor stays inside | High | H | Low |
| A11Y-SR-06 | 1.3.1 | Recurring task | Browse row | Recurrence chip text ("every monday") is read as content (✓ real text, not icon-only) | P2 | L | High |

### Labels

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-LBL-01 | 1.3.1, 4.1.2 | Any screen | Audit every input/select | All have `<label>` or `aria-label` (✓ 0 violations in DOM audit) | High | M | High |
| A11Y-LBL-02 | 2.5.3 | Any screen | Activate controls by their visible label | Label-in-name holds (aria-labels match visible text: "Add task", "Restore") | P2 | L | Low |
| A11Y-LBL-03 | 1.3.1 | Password field | Inspect | Placeholder "At least 6 characters" is not the only label (✓ visible `<label>` exists) | P2 | L | High |

### Semantic HTML

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-SEM-01 | 1.3.1 | Any view | Inspect heading outline | H1 exists; sidebar sections H2; order H2-after-H1 fixed (A11Y-HD-01) or sections demoted | P2 | L | High |
| A11Y-SEM-02 | 1.3.1 | — | Inspect landmarks | `main`, `aside[complementary]`, `nav` present (✓); add `aria-label` to the two nav regions for distinction | P2 | L | High |
| A11Y-SEM-03 | 1.3.1 | Task list | Inspect | Tasks are `<ul>/<li>` with nested sub-lists (✓); rows use buttons not clickable divs (✓) | High | M | High |
| A11Y-SEM-04 | 1.3.1 | — | `lang="en"` present (✓); no `dir` handling needed while content is LTR-only | P3 | L | High |

### Forms

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-FORM-01 | 3.3.1 | Auth form | Submit invalid credentials | Error identified per-field: add `aria-describedby` linking notice → inputs, and `aria-invalid="true"` | P1 | M | Med |
| A11Y-FORM-02 | 3.3.2 | Auth form | Inspect | `required` + `autocomplete` present (✓ both) | P2 | L | High |
| A11Y-FORM-03 | 3.3.3 | Any error | Trigger any validation | Error suggests the fix ("cannot be empty", "at least 6 characters") (✓) | P2 | L | High |
| A11Y-FORM-04 | 4.1.2 | Date picker | Inspect | Native `type="date"` with visible label (✓) | P2 | L | High |

### Error messages

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-ERR-01 | 4.1.3 | Trigger list error (offline) | Listen | Announced (✓ `role="alert"` verified live) | High | M | Med |
| A11Y-ERR-02 | 3.3.1 | Same | Inspect text | Message is actionable — currently raw `TypeError: Failed to fetch` leaks (BF-06/MR-03) — map to friendly copy | P1 | M | Med |
| A11Y-ERR-03 | 1.4.1 | Same | Inspect | Error is not color-only: `role="alert"` + text (✓) | P1 | M | High |

### Color contrast

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-CON-01 | 1.4.3 | Completed task | Measure title vs background | **2.85:1 — FAIL.** Darken completed text to ≥ 4.5:1 (keep the strike-through) | P1 | M | High |
| A11Y-CON-02 | 1.4.11 | Any row | Measure checkbox border, delete icon | 3.45 / 3.9 — pass non-text 3:1 (✓ regression guard) | P1 | M | High |
| A11Y-CON-03 | 1.4.3 | Chips | Measure due/priority/tag chips | 5.3–7.7 (✓); re-measure any new color | P1 | M | High |
| A11Y-CON-04 | 1.4.1 | Priority flags | Inspect | Urgency not by color alone: flag + "P1 · Urgent" text (✓) | P1 | M | High |

### Zoom / reflow

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-ZM-01 | 1.4.10 | 320 px viewport | Render list + modal | No 2-D scroll — currently 15 px overflow (BF-09) | P2 | L | Med |
| A11Y-ZM-02 | 1.4.4 | 200 % browser zoom at 1280 | Render | Equivalent to ~640 px width (swept ✓); text not clipped | P1 | M | Med |
| A11Y-ZM-03 | 1.4.12 | Any width | Inspect spacing tokens | No fixed-height clipping of text (`line-height` normal, no `overflow: hidden` on text) (✓) | P2 | L | High |

### Motion

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-MOT-01 | 2.3.3 | `prefers-reduced-motion: reduce` | Create/delete tasks | Row/loader animations disabled (✓ media query exists) | P2 | L | Med |
| A11Y-MOT-02 | 2.2.2 | Any screen | Watch loader | No infinite non-essential motion after load (spinner is load-state only ✓) | P3 | L | Med |

### Dialogs / modals

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-DLG-01 | 2.4.3, 4.1.2 | Modal open | Tab through | Focus trapped inside (currently escapes — A11Y-KB-01) | High | H | Med |
| A11Y-DLG-02 | 2.4.3 | Modal closed | Observe focus | Returns to the opener (currently lost — A11Y-KB-02) | High | H | Med |
| A11Y-DLG-03 | 4.1.2 | Modal open | NVDA/JAWS | Announced as dialog, labelled (✓ role + aria-label + aria-modal); trap required for `aria-modal` semantics to hold | High | H | Low |
| A11Y-DLG-04 | 1.4.13 | Popovers | Escape dismisses | Currently not dismissable (A11Y-FM-02) | P1 | M | Med |
| A11Y-DLG-05 | 2.1.2 | Native `confirm()` on destructive actions | Trigger | Standard dialogs are SR-announced and Escape-safe (✓); consider custom dialog only after trap lands | P3 | L | Med |

### Tables

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-TBL-01 | — | — | — | **N/A: the app renders no data tables.** When reports/exports add them, require `<th scope>`, captions, and header association per SC 1.3.1 | — | — | — |

### Dynamic content

| ID | WCAG SC | Preconditions | Steps | Expected | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|
| A11Y-DYN-01 | 4.1.3 | Complete/recreate/delete tasks | Listen | List changes announced (currently silent — A11Y-SR-02) | P1 | M | Med |
| A11Y-DYN-02 | 4.1.3 | Filter/search changes | Listen | Result count changes announced via a polite live region (`view-task-count` is a natural candidate) | P2 | L | Med |
| A11Y-DYN-03 | 4.1.3 | Recurrence spawn | Listen | "Next occurrence created" announced (currently silent) | P2 | M | Med |
| A11Y-DYN-04 | 4.1.3 | Loading states | Observe | `role="status"` on list loading (✓ present) | P2 | L | High |

---

## Remediation order (smallest fix → largest)

1. A11Y-SR-01: add `role="status"` to the undo notice (one attribute)
2. A11Y-SEM-03/SR-03: `aria-hidden` on decorative SVGs (attributes)
3. A11Y-CON-01: darken completed-title color (one CSS value)
4. A11Y-SEM-01: swap heading levels in the sidebar (demote to styled non-headings or reorder)
5. A11Y-KB-02/DLG-02: restore focus on modal close (one line + opener ref)
6. A11Y-KB-01/DLG-01: focus trap in the modal (small hook or native `<dialog>` migration)
7. A11Y-FORM-01: `aria-describedby` + `aria-invalid` on auth errors
8. A11Y-FM-02/DLG-04: Escape-dismissable popovers
9. A11Y-NAV-01: skip link
10. A11Y-ZM-01: 320 px reflow (BF-09)
