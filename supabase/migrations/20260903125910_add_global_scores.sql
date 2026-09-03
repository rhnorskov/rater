-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

CREATE TABLE public.global_scores (
  movie_id  uuid                     NOT NULL,
  strength  double precision         NOT NULL,
  weight    double precision         NOT NULL,
  raters    integer                  NOT NULL,
  connected boolean                  NOT NULL,
  fitted_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.global_scores
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.global_scores
  ADD CONSTRAINT global_scores_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;

ALTER TABLE public.global_scores
  ADD CONSTRAINT global_scores_pkey PRIMARY KEY (movie_id);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.global_scores TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.global_scores TO authenticated;

GRANT ALL ON public.global_scores TO service_role;

CREATE INDEX global_scores_strength_idx ON public.global_scores (strength DESC);

CREATE POLICY "global scores are readable by everyone" ON public.global_scores
  FOR SELECT
  TO anon, authenticated
  USING (true);