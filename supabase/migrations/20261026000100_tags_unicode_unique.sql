-- C-02 (qa/analysis/data-corruption-analysis.md): tag-name uniqueness was
-- case-insensitive but not Unicode-normalized, so NFC and NFD spellings of
-- the same name coexisted as "different" tags. Replaces the lower()-based
-- unique index with a normalize-then-lower one.
--
-- Assumes no existing duplicate pair (verified: the corruption campaign's
-- duplicate rows were removed; validate with the query in the analysis doc
-- before applying if tags were recreated).

drop index if exists public.tags_user_name_unique;

create unique index tags_user_name_unique
  on public.tags (user_id, lower(normalize(name, NFC)));
