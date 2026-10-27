-- C-02 (projects) and C-04 from qa/analysis/data-corruption-analysis.md.

-- C-02: project-name uniqueness was case-insensitive but not
-- Unicode-normalized, so NFC and NFD spellings of the same name coexisted as
-- "different" projects (macOS/iOS input often produces NFD). Same treatment as
-- 20261026000100_tags_unicode_unique.sql: normalize before lowering.
--
-- Assumes no existing duplicate pair (validate first with the join query in
-- the analysis doc; merge or rename duplicates before applying otherwise).

drop index if exists public.projects_user_name_unique;

create unique index projects_user_name_unique
  on public.projects (user_id, lower(normalize(name, NFC)));

-- C-04: two active projects sharing a position make ordering ambiguous and
-- reorder operations unstable. Archived projects are excluded — they keep the
-- position they had when archived and may legitimately collide.
--
-- Assumes no existing duplicate pair among active projects (validate with the
-- group-by query in the analysis doc before applying).

create unique index projects_user_active_position_unique
  on public.projects (user_id, position)
  where not is_archived;
