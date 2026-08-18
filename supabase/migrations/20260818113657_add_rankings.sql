-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

CREATE TABLE public.rankings (
  user_id    uuid                     NOT NULL,
  movie_id   uuid                     NOT NULL,
  rank       text                     COLLATE "C" NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.rankings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_pkey PRIMARY KEY (user_id, movie_id);

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.rankings
  ADD CONSTRAINT rankings_user_id_rank_key UNIQUE (user_id, rank);

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.rankings TO anon;

GRANT ALL ON public.rankings TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.rankings TO service_role;

CREATE INDEX rankings_movie_id_idx ON public.rankings (movie_id);

CREATE POLICY "own rankings are deletable" ON public.rankings
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own rankings are insertable" ON public.rankings
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own rankings are readable" ON public.rankings
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "own rankings are updatable" ON public.rankings
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));