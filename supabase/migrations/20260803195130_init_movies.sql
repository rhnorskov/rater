-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE EXTENSION pg_trgm WITH SCHEMA extensions;

CREATE FUNCTION public.movies_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
	if (to_jsonb(new) - 'synced_at' - 'updated_at')
	   is distinct from (to_jsonb(old) - 'synced_at' - 'updated_at') then
		new.updated_at = now();
	end if;
	return new;
end $function$;

CREATE TABLE public.movies (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tmdb_id         bigint,
  imdb_id         text,
  title           text                     NOT NULL,
  original_title  text,
  release_date    date,
  overview        text,
  poster_url      text,
  backdrop_url    text,
  tmdb_popularity real,
  synced_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.movies
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.movies
  ADD CONSTRAINT movies_imdb_id_key UNIQUE (imdb_id);

ALTER TABLE public.movies
  ADD CONSTRAINT movies_pkey PRIMARY KEY (id);

ALTER TABLE public.movies
  ADD CONSTRAINT movies_tmdb_id_key UNIQUE (tmdb_id);

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.movies TO anon;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.movies TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.movies TO service_role;

CREATE INDEX movies_tmdb_popularity_idx ON public.movies (tmdb_popularity DESC NULLS LAST);

CREATE INDEX movies_title_trgm_idx ON public.movies USING gin (title extensions.gin_trgm_ops);

CREATE TRIGGER movies_set_updated_at
  BEFORE UPDATE ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION public.movies_set_updated_at();

CREATE POLICY "movies are readable by everyone" ON public.movies
  FOR SELECT
  TO anon, authenticated
  USING (true);