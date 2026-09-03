-- Output of the batch Bradley–Terry fit: one scalar per film, fitted over the pairwise
-- data implied by every user's order. Written by the fit job, never by the app.
create table public.global_scores (
	movie_id uuid primary key references public.movies (id) on delete cascade,
	-- Log-strength, on a scale where the neutral prior sits at 0. Gaps carry magnitude:
	-- they come from how often users disagree, which no single list contains.
	strength double precision not null,
	-- Total weight of the comparisons behind this film, after per-user down-weighting.
	weight double precision not null,
	-- How many users' lists it appears on. One rater means no disagreement to measure, so
	-- this is what decides whether a score is worth showing.
	raters integer not null,
	-- Whether the film is joined to the main comparison pool. An island was never compared
	-- against the rest, so its strength is not on the same scale as theirs.
	connected boolean not null,
	fitted_at timestamptz not null default now()
);

-- The leaderboard reads this in order.
create index global_scores_strength_idx on public.global_scores (strength desc);

alter table public.global_scores enable row level security;

grant select on public.global_scores to anon, authenticated;

-- Writes require the secret key, as with movies: RLS bypass and table privileges are
-- separate gates.
grant select, insert, update, delete on public.global_scores to service_role;

create policy "global scores are readable by everyone" on public.global_scores
	for select to anon, authenticated using (true);
