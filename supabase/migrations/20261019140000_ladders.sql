-- Ladders, Games, and Ladder members.
-- Writes go through functions. Reads are protected by row-level security.
-- Tunable constants live in one place for later tickets to read.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.tunable_constants()
returns table (
  starting_rating integer,
  k_factor integer,
  provisional_k_factor integer,
  provisional_threshold integer,
  inactive_threshold_days integer,
  confirmation_window_hours integer
)
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 1000, 32, 64, 5, 30, 48
$$;

revoke all on function private.tunable_constants() from public, anon, authenticated;

create type public.join_policy as enum ('open');
create type public.ladder_role as enum ('admin', 'player');
create type public.ladder_member_status as enum ('active', 'left', 'removed');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  draws_allowed boolean not null,
  largest_side integer not null,
  constraint games_largest_side_positive check (largest_side >= 1)
);

insert into public.games (name, draws_allowed, largest_side)
values ('pool', false, 2);

create table public.ladders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  game_id uuid not null references public.games (id),
  share_token text not null unique,
  join_policy public.join_policy not null default 'open',
  created_at timestamptz not null default now(),
  constraint ladders_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.ladder_members (
  id uuid primary key default gen_random_uuid(),
  ladder_id uuid not null references public.ladders (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role public.ladder_role not null,
  status public.ladder_member_status not null default 'active',
  rating integer not null,
  rated_match_count integer not null default 0,
  last_match_at timestamptz,
  constraint ladder_members_rated_match_count_non_negative check (rated_match_count >= 0)
);

create unique index ladder_members_one_user_per_ladder
  on public.ladder_members (ladder_id, user_id)
  where user_id is not null;

create index ladder_members_user_id_idx on public.ladder_members (user_id);

create or replace function private.caller_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_super_admin
  );
$$;

revoke all on function private.caller_is_super_admin() from public, anon;
grant execute on function private.caller_is_super_admin() to authenticated;

create or replace function private.caller_can_read_ladder(p_ladder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.caller_is_super_admin()
    or exists (
      select 1
      from public.ladder_members
      where ladder_id = p_ladder_id
        and user_id = (select auth.uid())
    );
$$;

revoke all on function private.caller_can_read_ladder(uuid) from public, anon;
grant execute on function private.caller_can_read_ladder(uuid) to authenticated;

create or replace function private.shares_ladder_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ladder_members mine
    join public.ladder_members theirs
      on theirs.ladder_id = mine.ladder_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.shares_ladder_with(uuid) from public, anon;
grant execute on function private.shares_ladder_with(uuid) to authenticated;

drop policy profiles_select_own on public.profiles;

create policy profiles_select_visible
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.caller_is_super_admin()
    or private.shares_ladder_with(id)
  );

alter table public.games enable row level security;
alter table public.ladders enable row level security;
alter table public.ladder_members enable row level security;

create policy games_select_authenticated
  on public.games
  for select
  to authenticated
  using (true);

create policy ladders_select_visible
  on public.ladders
  for select
  to authenticated
  using (private.caller_can_read_ladder(id));

create policy ladder_members_select_visible
  on public.ladder_members
  for select
  to authenticated
  using (private.caller_can_read_ladder(ladder_id));

revoke all on table public.games from public, anon, authenticated;
grant select on table public.games to authenticated;
grant select, insert, update, delete on table public.games to service_role;

revoke all on table public.ladders from public, anon, authenticated;
grant select on table public.ladders to authenticated;
grant select, insert, update, delete on table public.ladders to service_role;

revoke all on table public.ladder_members from public, anon, authenticated;
grant select on table public.ladder_members to authenticated;
grant select, insert, update, delete on table public.ladder_members to service_role;

create or replace function public.create_ladder(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  cleaned text := btrim(p_name);
  pool_id uuid;
  ladder_id uuid;
  starting integer;
begin
  if caller is null then
    raise exception 'Sign in before creating a Ladder'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before creating a Ladder'
      using errcode = 'P0002';
  end if;

  if cleaned is null or char_length(cleaned) = 0 then
    raise exception 'Ladder name is required'
      using errcode = '22023';
  end if;

  if char_length(cleaned) > 80 then
    raise exception 'Keep the Ladder name under 80 characters'
      using errcode = '22023';
  end if;

  select id into pool_id
  from public.games
  where name = 'pool';

  if pool_id is null then
    raise exception 'Pool is not available'
      using errcode = 'P0002';
  end if;

  select tunable.starting_rating into starting
  from private.tunable_constants() as tunable;

  insert into public.ladders (name, game_id, share_token)
  values (cleaned, pool_id, gen_random_uuid()::text)
  returning id into ladder_id;

  insert into public.ladder_members (
    ladder_id,
    user_id,
    role,
    status,
    rating,
    rated_match_count
  )
  values (ladder_id, caller, 'admin', 'active', starting, 0);

  return ladder_id;
end;
$$;

revoke all on function public.create_ladder(text) from public, anon;
grant execute on function public.create_ladder(text) to authenticated;

-- Shared Admin check. Later Admin-only functions call the private function.
create or replace function private.caller_is_active_ladder_admin(p_ladder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.caller_is_super_admin()
    or exists (
      select 1
      from public.ladder_members
      where ladder_id = p_ladder_id
        and user_id = (select auth.uid())
        and role = 'admin'
        and status = 'active'
    );
$$;

revoke all on function private.caller_is_active_ladder_admin(uuid) from public, anon, authenticated;

create or replace function public.assert_active_ladder_admin(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.caller_is_active_ladder_admin(p_ladder_id) then
    raise exception 'You need to be an active Admin of this Ladder'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_active_ladder_admin(uuid) from public, anon;
grant execute on function public.assert_active_ladder_admin(uuid) to authenticated;

create view public.leaderboard
with (security_invoker = true) as
select
  lm.ladder_id,
  lm.id as ladder_member_id,
  p.display_name,
  lm.rating
from public.ladder_members lm
join public.profiles p on p.id = lm.user_id
where lm.status = 'active';

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to authenticated;

create view public.my_ladders
with (security_invoker = true) as
select
  l.id,
  l.name,
  g.name as game_name,
  l.created_at
from public.ladder_members lm
join public.ladders l on l.id = lm.ladder_id
join public.games g on g.id = l.game_id
where lm.user_id = (select auth.uid());

revoke all on table public.my_ladders from public, anon, authenticated;
grant select on table public.my_ladders to authenticated;
