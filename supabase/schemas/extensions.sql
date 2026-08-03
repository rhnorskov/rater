-- The `extensions` schema keeps extension objects off the PostgREST-exposed `public` surface.
create extension if not exists pg_trgm with schema extensions;
