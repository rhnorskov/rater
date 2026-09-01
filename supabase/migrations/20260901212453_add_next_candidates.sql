-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.next_candidates (
  sample_size integer DEFAULT 10
)
  RETURNS SETOF public.movies
  LANGUAGE plpgsql
  STABLE
  SET search_path TO ''
  AS $function$
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
end $function$;

GRANT ALL ON FUNCTION public.next_candidates(integer) TO authenticated;