-- Confirmation window is 30 minutes. Rename the tunable from hours to minutes
-- and expire Pending Matches with make_interval(mins => …).
-- Leaderboard depends on rating_constants(), so recreate it after the swap.

drop view if exists public.leaderboard;
drop function if exists public.rating_constants();

create or replace function public.rating_constants()
returns table (
  starting_rating integer,
  k_factor integer,
  provisional_k_factor integer,
  provisional_threshold integer,
  confirmation_window_minutes integer,
  inactive_threshold_days integer
)
language sql
immutable
set search_path = ''
as $$
  select 1000, 32, 64, 5, 30, 30;
$$;

revoke all on function public.rating_constants() from public, anon;
grant execute on function public.rating_constants() to authenticated;

create view public.leaderboard
with (security_invoker = true) as
with
constants as (
  select * from public.rating_constants()
),
joined as (
  select
    lm.ladder_id,
    lm.id as ladder_member_id,
    p.display_name,
    lm.rating,
    lm.joined_at,
    lm.rated_match_count < constants.provisional_threshold as provisional,
    coalesce(lm.last_match_at, lm.joined_at)
      < now() - make_interval(days => constants.inactive_threshold_days) as inactive
  from public.ladder_members lm
  join public.profiles p on p.id = lm.user_id
  cross join constants
  where lm.status = 'active'
),
ranked as (
  select
    joined.*,
    rank() over (
      partition by joined.ladder_id
      order by joined.rating desc, joined.display_name asc
    ) as rank
  from joined
),
latest_match as (
  select distinct on (m.ladder_id)
    m.ladder_id,
    m.id as match_id,
    m.confirmed_at
  from public.matches m
  where m.status = 'confirmed'
  order by m.ladder_id, m.confirmed_at desc, m.id desc
),
previous_ratings as (
  select
    ranked.ladder_id,
    ranked.ladder_member_id,
    ranked.display_name,
    coalesce(part.rating_before, ranked.rating) as previous_rating
  from ranked
  join latest_match on latest_match.ladder_id = ranked.ladder_id
  left join public.participants part
    on part.match_id = latest_match.match_id
   and part.ladder_member_id = ranked.ladder_member_id
  where ranked.joined_at <= latest_match.confirmed_at
),
previous_ranked as (
  select
    previous_ratings.ladder_id,
    previous_ratings.ladder_member_id,
    rank() over (
      partition by previous_ratings.ladder_id
      order by previous_ratings.previous_rating desc, previous_ratings.display_name asc
    ) as previous_rank
  from previous_ratings
)
select
  ranked.ladder_id,
  ranked.ladder_member_id,
  ranked.display_name,
  ranked.rating,
  ranked.provisional,
  ranked.inactive,
  ranked.rank,
  case
    when previous_ranked.previous_rank is null then null
    else previous_ranked.previous_rank - ranked.rank
  end as rank_change
from ranked
left join previous_ranked
  on previous_ranked.ladder_id = ranked.ladder_id
 and previous_ranked.ladder_member_id = ranked.ladder_member_id;

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to authenticated;

create or replace function private.confirm_expired_pending_matches(p_as_of timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_minutes integer;
  match_row record;
begin
  select constants.confirmation_window_minutes into window_minutes
  from public.rating_constants() as constants;

  for match_row in
    select
      matches.id,
      matches.recorded_at + make_interval(mins => window_minutes) as expired_at
    from public.matches
    where matches.status = 'pending'
      and matches.recorded_at + make_interval(mins => window_minutes) <= p_as_of
    order by matches.recorded_at asc, matches.id asc
  loop
    perform private.apply_match_rating(match_row.id, match_row.expired_at);
  end loop;
end;
$$;

revoke all on function private.confirm_expired_pending_matches(timestamptz)
  from public, anon, authenticated, service_role;
