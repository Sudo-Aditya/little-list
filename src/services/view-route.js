// BF-05 (qa/analysis/bug-pattern-analysis.md): the browser back button did
// nothing — view state lived only in React. The hash mirrors the sidebar
// views: #/inbox, #/active, #/done, #/trash, #/today, #/upcoming,
// #/project/<id>, #/tag/<id>.
// The toolbar due-date refinements (overdue / week / no-date) deliberately
// stay local: they are filters on a view, not sidebar views.

const BASE_VIEWS = { inbox: "All", active: "Active", done: "Done", trash: "Trash" };

const ALL_VIEW = { filter: "All", projectFilter: "all", tagFilter: "all", dueFilter: "all" };

export function serializeView(view) {
  if (view.dueFilter === "due-today") return "#/today";
  if (view.dueFilter === "upcoming") return "#/upcoming";
  if (view.projectFilter !== "all") return `#/project/${view.projectFilter}`;
  if (view.tagFilter !== "all") return `#/tag/${view.tagFilter}`;
  const base = Object.keys(BASE_VIEWS).find((key) => BASE_VIEWS[key] === view.filter);
  return `#/${base ?? "inbox"}`;
}

// Returns the view state the hash names, or null when the hash names nothing
// the sidebar can show (unknown path, or an id that no longer exists).
export function parseView(hash, { projectIds = [], tagIds = [] } = {}) {
  const path = String(hash ?? "").replace(/^#\/?/, "");
  if (BASE_VIEWS[path]) return { ...ALL_VIEW, filter: BASE_VIEWS[path] };
  if (path === "today") return { ...ALL_VIEW, dueFilter: "due-today" };
  if (path === "upcoming") return { ...ALL_VIEW, dueFilter: "upcoming" };
  const project = /^project\/(.+)$/.exec(path);
  if (project && projectIds.includes(project[1])) return { ...ALL_VIEW, projectFilter: project[1] };
  const tag = /^tag\/(.+)$/.exec(path);
  if (tag && tagIds.includes(tag[1])) return { ...ALL_VIEW, tagFilter: tag[1] };
  return null;
}
