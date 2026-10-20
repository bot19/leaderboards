-- Leaderboard details: Provisional flag, Inactive split, Rating history.
-- Inactive uses last Match time, or joined_at when the Ladder member has never played.
-- Being Inactive never changes a Rating.

drop function if exists public.rating_constants();

create or replace function public.rating_constants()
returns table (
  starting_rating integer,
  k_factor integer,
  provisional_k_factor integer,
  provisional_threshold integer,
  confirmation_window_hours integer,
  inactive_threshold_days integer
)
language sql
immutable
set search_path = ''
as $$
  select 1000, 32, 64, 5, 48, 30;
$$;

revoke all on function public.rating_constants() from public, anon;
grant execute on function public.rating_constants() to authenticated;
-- Leaderboard and Inactive views call this as the invoker (security_invoker).

alter table public.ladder_members
  add column joined_at timestamptz not null default now();

-- Rejoining after Left refreshes joined_at so a never-played member is not
-- immediately Inactive from their original join time.
create or replace function public.join_ladder(p_share_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target_ladder uuid;
  policy public.join_policy;
  starting integer;
  existing_status public.ladder_member_status;
begin
  if caller is null then
    raise exception 'Sign in before joining a Ladder'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before joining a Ladder'
      using errcode = 'P0002';
  end if;

  select l.id, l.join_policy
  into target_ladder, policy
  from public.ladders l
  where l.share_token = p_share_token;

  if target_ladder is null then
    raise exception 'No Ladder matches this Share link'
      using errcode = 'P0002';
  end if;

  if policy is distinct from 'open' then
    raise exception 'This Ladder is not open to join'
      using errcode = '42501';
  end if;

  select lm.status
  into existing_status
  from public.ladder_members lm
  where lm.ladder_id = target_ladder
    and lm.user_id = caller;

  if existing_status = 'removed' then
    raise exception 'A Removed Ladder member cannot rejoin from the Share link'
      using errcode = '42501';
  elsif existing_status = 'left' then
    update public.ladder_members
    set
      status = 'active',
      joined_at = now()
    where ladder_id = target_ladder
      and user_id = caller;
  elsif existing_status is null then
    select constants.starting_rating into starting
    from public.rating_constants() as constants;

    insert into public.ladder_members (
      ladder_id,
      user_id,
      role,
      status,
      rating,
      rated_match_count
    )
    values (target_ladder, caller, 'player', 'active', starting, 0);
  end if;

  return 'joined';
end;
$$;

create or replace function public.reinstate_ladder_member(p_ladder_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
begin
  select ladder_id, status
  into target_ladder, target_status
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No Ladder member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Ladder'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'removed' then
    raise exception 'Only a Removed Ladder member can be reinstated'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set
    status = 'active',
    joined_at = now()
  where id = p_ladder_member_id;
end;
$$;

drop view public.leaderboard;

create view public.leaderboard
with (security_invoker = true) as
select
  lm.ladder_id,
  lm.id as ladder_member_id,
  p.display_name,
  lm.rating,
  lm.rated_match_count < constants.provisional_threshold as provisional,
  rank() over (
    partition by lm.ladder_id
    order by lm.rating desc, p.display_name asc
  ) as rank
from public.ladder_members lm
join public.profiles p on p.id = lm.user_id
cross join lateral public.rating_constants() as constants
where lm.status = 'active'
  and coalesce(lm.last_match_at, lm.joined_at)
    >= now() - make_interval(days => constants.inactive_threshold_days);

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to authenticated;

create view public.inactive_ladder_members
with (security_invoker = true) as
select
  lm.ladder_id,
  lm.id as ladder_member_id,
  p.display_name,
  lm.rating,
  lm.rated_match_count < constants.provisional_threshold as provisional,
  coalesce(lm.last_match_at, lm.joined_at) as last_active_at
from public.ladder_members lm
join public.profiles p on p.id = lm.user_id
cross join lateral public.rating_constants() as constants
where lm.status = 'active'
  and coalesce(lm.last_match_at, lm.joined_at)
    < now() - make_interval(days => constants.inactive_threshold_days);

revoke all on table public.inactive_ladder_members from public, anon, authenticated;
grant select on table public.inactive_ladder_members to authenticated;

create view public.rating_history
with (security_invoker = true) as
select
  part.ladder_member_id,
  m.ladder_id,
  m.id as match_id,
  m.confirmed_at,
  part.rating_before,
  part.rating_change
from public.participants part
join public.matches m on m.id = part.match_id
where m.status = 'confirmed'
  and part.rating_before is not null
  and part.rating_change is not null;

revoke all on table public.rating_history from public, anon, authenticated;
grant select on table public.rating_history to authenticated;
