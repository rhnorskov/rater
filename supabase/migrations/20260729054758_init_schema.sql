create table public.ratings (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	subject text not null,
	score int not null check (score between 1 and 5),
	created_at timestamptz not null default now()
);

create index ratings_user_id_idx on public.ratings (user_id);

alter table public.ratings enable row level security;

-- auth.uid() wrapped in a subselect is evaluated once per statement, not once per row.
create policy "own ratings readable" on public.ratings
	for select to authenticated using ((select auth.uid()) = user_id);

create policy "own ratings insertable" on public.ratings
	for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "own ratings updatable" on public.ratings
	for update to authenticated using ((select auth.uid()) = user_id)
	with check ((select auth.uid()) = user_id);

create policy "own ratings deletable" on public.ratings
	for delete to authenticated using ((select auth.uid()) = user_id);
