-- Watchlog initial schema: titles + episode_watches, with row-level security.
-- Every row belongs to one user; users can only see and change their own rows.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- titles: one row per movie or show in a user's log
-- ---------------------------------------------------------------------------

create table public.titles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tmdb_id       integer not null check (tmdb_id > 0),
  media_type    text not null check (media_type in ('movie', 'tv')),
  title         text not null check (length(title) between 1 and 500),
  year          smallint check (year between 1870 and 2200),
  poster_path   text,
  genres        text[] not null default '{}',
  runtime       integer check (runtime is null or runtime >= 0), -- minutes (per episode for shows)
  status        text not null default 'want'
                  check (status in ('watched', 'watching', 'want', 'dropped')),
  rating        numeric(2, 1)
                  check (rating is null or (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2))),
  notes         text check (notes is null or length(notes) <= 20000),
  watched_on    date,
  times_watched integer not null default 1 check (times_watched >= 0),
  favorite      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, tmdb_id, media_type),
  -- Lets episode_watches reference (id, user_id) so an episode row can only
  -- point at a title owned by the same user.
  unique (id, user_id)
);

comment on column public.titles.runtime is 'Minutes. For shows, the typical episode runtime.';

create index titles_user_status_idx on public.titles (user_id, status);
create index titles_user_watched_on_idx on public.titles (user_id, watched_on desc nulls last);

create trigger titles_set_updated_at
  before update on public.titles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- episode_watches: one row per watched episode of a show
-- ---------------------------------------------------------------------------

create table public.episode_watches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title_id   uuid not null,
  season     integer not null check (season >= 0),  -- season 0 = specials on TMDB
  episode    integer not null check (episode >= 1),
  watched_at timestamptz not null default now(),

  unique (user_id, title_id, season, episode),
  foreign key (title_id, user_id) references public.titles (id, user_id) on delete cascade
);

create index episode_watches_title_idx on public.episode_watches (title_id);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.titles enable row level security;
alter table public.episode_watches enable row level security;

-- (select auth.uid()) is evaluated once per statement instead of once per row.

create policy "titles: select own" on public.titles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "titles: insert own" on public.titles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "titles: update own" on public.titles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "titles: delete own" on public.titles
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "episode_watches: select own" on public.episode_watches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "episode_watches: insert own" on public.episode_watches
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "episode_watches: update own" on public.episode_watches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "episode_watches: delete own" on public.episode_watches
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Signed-in users only; the anon role gets nothing.
revoke all on public.titles, public.episode_watches from anon;
grant select, insert, update, delete on public.titles, public.episode_watches to authenticated;
