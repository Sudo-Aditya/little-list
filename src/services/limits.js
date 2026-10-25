// Single source of truth for entity limits, extracted from supabase/schema.sql.
// Kept honest by test/schema-drift.test.js, which parses the schema and asserts
// every value here matches (Family C in qa/analysis/bug-pattern-analysis.md).

export const limits = {
  taskTitle: { min: 1, max: 200 },
  taskDescription: { min: 0, max: 2000 },
  taskRecurrence: { max: 100 },
  projectName: { min: 1, max: 60 },
  projectDescription: { min: 0, max: 500 },
  tagName: { min: 1, max: 40 },
};

// Documented known drift between these limits and the UI (MR-01): the tag
// inputs set maxLength="80" while the DB enforces 40. Asserted by the drift
// test so the mismatch can't be "fixed" on one side silently.
export const knownUiDrift = [
  { field: "tagName", schemaMax: 40, uiMaxLength: 80, finding: "MR-01" },
];
