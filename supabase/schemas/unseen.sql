-- Films the user has told us they have not watched. Distinct from "not ranked yet": the
-- game needs to stop offering these, and "never seen it" is a fact about the user worth
-- keeping rather than a UI state to throw away on reload.
create table public.unseen (
	user_id uuid not null references auth.users (id) on delete cascade,
	movie_id uuid not null references public.movies (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (user_id, movie_id)
);

alter table public.unseen enable row level security;

-- No update: the row carries no answer, only its own existence. Watching the film later
-- is a delete.
grant select, insert, delete on public.unseen to authenticated;

create policy "own unseen are readable" on public.unseen
	for select to authenticated using ((select auth.uid()) = user_id);

create policy "own unseen are insertable" on public.unseen
	for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own unseen are deletable" on public.unseen
	for delete to authenticated using ((select auth.uid()) = user_id);
