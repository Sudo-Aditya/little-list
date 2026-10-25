# Positive Test Cases

Happy paths per feature. All cases assume: signed in, workspace loaded, backend has all current columns.

## Auth

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-AUTH-01 | R-AUTH-02 | Confirmed account | valid email + password | Log in | Signed in; workspace loads; account email shown in sidebar | P0 | H | Med |
| POS-AUTH-02 | R-AUTH-04 | Signed in | — | Reload page | Still signed in; list state intact | P0 | H | Med |
| POS-AUTH-03 | R-AUTH-03 | Signed in | — | Click Sign out | Auth screen shown; other-device sessions unaffected | P1 | M | Med |
| POS-AUTH-04 | R-AUTH-01 | Signed out | valid credentials | Toggle Sign up ↔ Log in link | Headings/labels/autocomplete swap correctly (`new-password` vs `current-password`) | P2 | L | Med |

## Tasks

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-TASK-01 | R-TASK-01 | Modal open | `Buy oat milk` | Submit | Task appears at top of Inbox; count +1 | P0 | H | Med |
| POS-TASK-02 | R-TASK-03 | Task exists | new title `Buy two` | Edit → change → Save | Title updates inline; appears in search immediately | P0 | H | Med |
| POS-TASK-03 | R-TASK-03 | Edit form open | any | Press Enter | Saves (same as Save); Escape cancels keeping original | P1 | M | Med |
| POS-TASK-04 | R-TASK-04 | Active task | — | Click checkbox | Row struck-through; Active count −1; Done count +1 | P0 | H | Med |
| POS-TASK-05 | R-TASK-04 | Completed task | — | Click checkbox again | Reopens: strike removed; counts reverse | P0 | H | Med |
| POS-TASK-06 | R-TASK-05 | Active task | — | Click × | Task leaves list; Trash count +1; Undo notice shown 10 s | P0 | H | Med |
| POS-TASK-07 | R-TASK-06 | Task in Trash | — | Click Restore | Task active again in Inbox; Trash count −1 | P0 | H | Med |
| POS-TASK-08 | R-DESC-01 | Description column present | `Meter reading: 4021` | Edit task, fill description, save | Muted second line under title; persists after reload | P1 | M | Med |

## Priorities

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-PRI-01 | R-PRI-01, R-PRI-02 | Task row visible | `urgent` | Set via row select | Select shows `P1 · Urgent`; select text colored red | P1 | M | Med |
| POS-PRI-02 | R-PRI-02 | Task in Trash | any priority | View Trash row | Read-only badge shows the P-label (`P2 · High` etc.) | P2 | L | Med |
| POS-PRI-03 | R-PRI-03 | Mixed priorities exist | — | Filter = Urgent | Only urgent tasks listed; composes with status/project/tag/due filters | P1 | M | High |

## Projects

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-PROJ-01 | R-PROJ-01 | Manage menu open | `Errands` | Create | Appears in sidebar with a stable colored dot; view switches to it | P1 | M | Med |
| POS-PROJ-02 | R-PROJ-01 | Project selected | `Fix sink` | Add task via modal | Task lands in the selected project (project view lists it) | P1 | M | Med |
| POS-PROJ-03 | R-PROJ-02 | `Errands` exists | `ERRANDS` | Attempt create | DB rejects duplicate (case-insensitive unique); error surfaced | P1 | M | High |
| POS-PROJ-04 | R-PROJ-03 | ≥2 projects | — | Move project ↓ | Order swaps and persists after reload | P2 | L | Med |
| POS-PROJ-05 | R-PROJ-04 | Project exists | — | Archive → Unarchive | Leaves sidebar/selected view resets to Inbox; returns on unarchive | P2 | L | Med |
| POS-PROJ-06 | R-PROJ-05 | Project owns tasks | — | Delete project (confirm) | Tasks survive with no project (visible in Inbox) | P0 | H | Med |

## Tags

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-TAG-01 | R-TAG-01 | Manage menu open | `home` | Create | Chip appears in manage list with stable color; sidebar `#home` | P1 | M | Med |
| POS-TAG-02 | R-TAG-01 | Tag + task exist | — | Toggle tag on task | Chip appears on row; toggle off removes it | P1 | M | Med |
| POS-TAG-03 | R-TAG-02 | Two tasks tagged | — | Click tag in sidebar | View titled with tag name; exactly those tasks listed | P1 | M | Med |
| POS-TAG-04 | R-TAG-01 | Tag assigned | `home`→`household` | Rename | Chips + sidebar update everywhere without reload | P2 | L | Med |

## Subtasks

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-SUB-01 | R-SUB-01 | Parent task | `Buy domain` | + Subtask → add | Nested row under parent; progress `0 / 1 completed` | P1 | M | Med |
| POS-SUB-02 | R-SUB-02 | Parent has project+tags | — | Add subtask | Subtask inherits project and all parent tags | P1 | M | Med |
| POS-SUB-03 | R-SUB-03 | Subtask exists | — | Complete subtask | Progress `1 / 1`; parent stays active; subtask struck-through beneath it in Active view | P1 | M | High |

## Quick add

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-QA-01 | R-QA-01 | `Errands` exists | `Fix tap #Errands` | Quick add | Title `Fix tap`; task inside Errands project | P0 | H | High |
| POS-QA-02 | R-QA-02 | `home` tag exists | `Water plants @home` | Quick add | Tag applied; title without token | P0 | H | High |
| POS-QA-03 | R-QA-03 | — | `Escalate p1` | Quick add | Priority urgent (P1); title `Escalate` | P0 | H | High |
| POS-QA-04 | R-QA-04 | — | `File taxes tomorrow` | Quick add | Due tomorrow; chip shows `Due tomorrow` | P0 | H | High |
| POS-QA-05 | R-QA-05 | — | `Standup every monday` | Quick add | Recurrence `every monday`; first due = coming Monday | P0 | H | High |
| POS-QA-06 | R-QA-06 | — | `Milk // oat` | Quick add | Title `Milk`; description `oat` | P1 | M | High |
| POS-QA-07 | R-MOD-01 | Any view | any | Open modal from Done view | Modal opens over the screen; closes on success/Escape/backdrop/Cancel | P1 | M | Med |

## Due dates & recurrence

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-DATE-01 | R-DATE-01 | Row visible | 2026-11-15 | Set via picker | Chip `Sun, Nov 15`; persists after reload | P1 | M | Med |
| POS-DATE-02 | R-DATE-01 | Due date set | — | Remove | Chip gone; due_date null | P1 | M | Med |
| POS-DATE-03 | R-DATE-02 | Overdue task | — | View row | Chip reads `Overdue · <weekday, date>` (text carries urgency, not color alone) | P2 | L | High |
| POS-REC-01 | R-REC-01 | — | `every 2 weeks` due 2026-10-24 | Complete | Next occurrence due 2026-11-07 | P0 | H | High |
| POS-REC-02 | R-REC-02 | Recurring task with tag | — | Complete | Spawned copy carries the tag and description | P1 | M | Med |
| POS-REC-03 | R-REC-01 | — | `every month` due Jan 31 | Complete | Next due Feb 28 (month-end clamp) | P0 | H | High |

## Views & search

| ID | Requirement | Preconditions | Test data | Steps | Expected result | Pri | Risk | Auto |
|---|---|---|---|---|---|---|---|---|
| POS-VIEW-01 | R-VIEW-01 | Mixed states exist | — | Cycle Inbox/Active/Done/Trash | Each lists exactly its own set; counts (Active, Done, Trash) match contents | P0 | H | High |
| POS-VIEW-02 | R-VIEW-05 | View with zero pre-filter tasks | — | Open empty Done view | No toolbar row; friendly empty state | P2 | L | Med |
| POS-SRCH-01 | R-SRCH-01 | `Buy oat milk` exists | `oat` | Type in search | Live non-deleted title matches; count `N results` | P2 | L | Med |
| POS-SRCH-02 | R-SRCH-01 | Active task matching query is trashed | — | Search its title | Trashed copy excluded from results | P2 | L | Med |
| POS-COL-01 | R-COL-01 | Any project/tag set | — | Reload twice | Same color per id every time (deterministic assignment) | P3 | L | High |
