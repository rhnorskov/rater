-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

DROP INDEX public.movies_tmdb_popularity_idx;

ALTER TABLE public.movies
  ADD COLUMN tmdb_vote_count integer;

CREATE INDEX movies_tmdb_vote_count_idx ON public.movies (tmdb_vote_count DESC NULLS LAST);