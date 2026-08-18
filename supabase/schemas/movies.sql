create table public.movies (
	id uuid primary key default gen_random_uuid(),
	tmdb_id bigint unique,
	imdb_id text unique,
	title text not null,
	original_title text,
	release_date date,
	overview text,
	poster_url text,
	backdrop_url text,
	tmdb_popularity real,
	-- Last fetched from the source, whether or not anything changed.
	synced_at timestamptz not null default now(),
	-- Last fetch that changed a value; the trigger below leaves it alone otherwise.
	updated_at timestamptz not null default now(),
	created_at timestamptz not null default now()
);

create index movies_tmdb_popularity_idx on public.movies (tmdb_popularity desc nulls last);

-- Serves both fuzzy matching (% and <%) and substring matching (ilike).
create index movies_title_trgm_idx on public.movies using gin (title extensions.gin_trgm_ops);

-- Comparing whole rows as jsonb keeps this correct as columns are added.
create function public.movies_set_updated_at() returns trigger language plpgsql as $$
begin
	if (to_jsonb(new) - 'synced_at' - 'updated_at')
	   is distinct from (to_jsonb(old) - 'synced_at' - 'updated_at') then
		new.updated_at = now();
	end if;
	return new;
end $$;

create trigger movies_set_updated_at before update on public.movies
	for each row execute function public.movies_set_updated_at();

alter table public.movies enable row level security;

grant select on public.movies to anon, authenticated;

-- Writes require the secret key: RLS bypass and table privileges are separate gates.
grant select, insert, update, delete on public.movies to service_role;

create policy "movies are readable by everyone" on public.movies
	for select to anon, authenticated using (true);
