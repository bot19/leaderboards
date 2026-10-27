-- A Ladder member's record across all Confirmed Matches on that Ladder.
-- Reads current participant rows, so a Replay updates every value.
-- security invoker: existing RLS on matches/participants decides who can see it.

create or replace function public.ladder_member_record(p_ladder_member_id uuid)
returns table (
  wins integer,
  losses integer,
  draws integer,
  form text[],
  streak_result text,
  streak_length integer,
  peak_rating numeric,
  peak_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with confirmed as (
    select
      m.id as match_id,
      m.confirmed_at,
      case
        when m.result = 'draw' then 'D'
        when (m.result = 'side_a_won' and part.side = 'a')
          or (m.result = 'side_b_won' and part.side = 'b') then 'W'
        else 'L'
      end as outcome,
      (part.rating_before + part.rating_change) as rating_after
    from public.participants part
    join public.matches m on m.id = part.match_id
    where part.ladder_member_id = p_ladder_member_id
      and m.status = 'confirmed'
      and part.rating_before is not null
      and part.rating_change is not null
  ),
  ordered as (
    select
      match_id,
      confirmed_at,
      outcome,
      rating_after,
      row_number() over (order by confirmed_at desc, match_id desc) as newest_rank,
      row_number() over (order by confirmed_at asc, match_id asc) as oldest_rank
    from confirmed
  ),
  newest as (
    select outcome
    from ordered
    where newest_rank = 1
  ),
  streak as (
    select
      (select outcome from newest) as result,
      coalesce(
        (
          select min(newest_rank) - 1
          from ordered
          where outcome is distinct from (select outcome from newest)
        ),
        (select count(*)::integer from ordered)
      ) as length
  ),
  peak as (
    select rating_after, confirmed_at
    from ordered
    order by rating_after desc, confirmed_at asc, match_id asc
    limit 1
  )
  select
    coalesce((select count(*)::integer from ordered where outcome = 'W'), 0),
    coalesce((select count(*)::integer from ordered where outcome = 'L'), 0),
    coalesce((select count(*)::integer from ordered where outcome = 'D'), 0),
    coalesce(
      (
        select array_agg(outcome order by newest_rank)
        from ordered
        where newest_rank <= 5
      ),
      '{}'::text[]
    ),
    (select result from streak),
    coalesce((select length from streak), 0),
    (select rating_after from peak),
    (select confirmed_at from peak);
$$;

revoke all on function public.ladder_member_record(uuid) from public, anon;
grant execute on function public.ladder_member_record(uuid) to authenticated;
