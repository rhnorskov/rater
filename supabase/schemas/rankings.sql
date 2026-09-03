create table public.rankings (
	user_id uuid not null references auth.users (id) on delete cascade,
	movie_id uuid not null references public.movies (id) on delete cascade,
	-- LexoRank libraries compute midpoints bytewise. The database default collation
	-- orders punctuation differently, which would place rows against the client's intent.
	rank text collate "C" not null,
	created_at timestamptz not null default now(),
	primary key (user_id, movie_id),
	-- Two rows sharing a key have no defined order; a colliding insert must retry.
	unique (user_id, rank)
);

-- Reading every list a movie appears in, for the global fit.
create index rankings_movie_id_idx on public.rankings (movie_id);

alter table public.rankings enable row level security;

grant select, insert, update, delete on public.rankings to authenticated;

-- The global fit has to read every user's order, which RLS deliberately hides from the
-- app. Read only: a list is written by its owner and by nothing else. RLS bypass and table
-- privileges are separate gates, so this grant is required on top of the secret key.
grant select on public.rankings to service_role;

create policy "own rankings are readable" on public.rankings
	for select to authenticated using ((select auth.uid()) = user_id);

create policy "own rankings are insertable" on public.rankings
	for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own rankings are updatable" on public.rankings
	for update to authenticated using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);

create policy "own rankings are deletable" on public.rankings
	for delete to authenticated using ((select auth.uid()) = user_id);
