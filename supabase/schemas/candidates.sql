-- Films to offer the user, chosen for them rather than recalled by them.
--
-- The draw belongs in the database. Done from the server it was three sequential requests
-- — the exclusions, the pool size, then the page — which is three times the latency for a
-- decision meant to feel instant. Returning a batch cuts it further: a run of wave-offs
-- costs one round trip rather than one each.
create function public.next_candidates(sample_size integer default 10)
returns setof public.movies
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
	-- How far down the vote-count order the draw may reach. Past this the titles are
	-- obscure enough that most offers would come back as "haven't seen it".
	pool constant integer := 1000;
	available bigint;
	pick bigint;
begin
	select count(*) into available
	from public.movies m
	where not exists (
		select 1 from public.rankings r
		where r.user_id = (select auth.uid()) and r.movie_id = m.id
	)
	and not exists (
		select 1 from public.unseen u
		where u.user_id = (select auth.uid()) and u.movie_id = m.id
	);

	if available = 0 then
		return;
	end if;

	-- Squaring the draw leans on the most-voted end, where a hit is likeliest, without
	-- ever fixing an order. Clamping to what is left keeps the offset inside the set.
	pick := floor(least(available, pool) * power(random(), 2));

	return query
	select m.*
	from public.movies m
	where not exists (
		select 1 from public.rankings r
		where r.user_id = (select auth.uid()) and r.movie_id = m.id
	)
	and not exists (
		select 1 from public.unseen u
		where u.user_id = (select auth.uid()) and u.movie_id = m.id
	)
	-- Vote count alone leaves ties in an undefined order, which paging needs settled.
	order by m.tmdb_vote_count desc nulls last, m.id
	offset pick
	limit greatest(1, least(sample_size, 50));
end $$;

grant execute on function public.next_candidates(integer) to authenticated;
