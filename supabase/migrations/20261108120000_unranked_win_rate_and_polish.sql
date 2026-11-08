-- 1.6.0: Unranked members, wins/matches on the Leaderboard, and on-screen wording.
-- Recreates the leaderboard view and rewords user-facing Ladder messages.

drop view if exists public.leaderboard;

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
    lm.rated_match_count,
    lm.rated_match_count > 0 as ranked,
    lm.rated_match_count as matches,
    lm.rated_match_count < constants.provisional_threshold as provisional,
    coalesce(lm.last_match_at, lm.joined_at)
      < now() - make_interval(days => constants.inactive_threshold_days) as inactive
  from public.ladder_members lm
  join public.profiles p on p.id = lm.user_id
  cross join constants
  where lm.status = 'active'
),
wins as (
  select
    part.ladder_member_id,
    count(*)::integer as wins
  from public.participants part
  join public.matches m on m.id = part.match_id
  where m.status = 'confirmed'
    and (
      (m.result = 'side_a_won' and part.side = 'a')
      or (m.result = 'side_b_won' and part.side = 'b')
    )
  group by part.ladder_member_id
),
with_rank as (
  select
    joined.*,
    coalesce(wins.wins, 0) as wins,
    case
      when joined.ranked then
        rank() over (
          partition by joined.ladder_id, joined.ranked
          order by joined.rating desc, joined.display_name asc
        )
      else null
    end as rank
  from joined
  left join wins on wins.ladder_member_id = joined.ladder_member_id
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
    with_rank.ladder_id,
    with_rank.ladder_member_id,
    with_rank.display_name,
    coalesce(part.rating_before, with_rank.rating) as previous_rating
  from with_rank
  join latest_match on latest_match.ladder_id = with_rank.ladder_id
  left join public.participants part
    on part.match_id = latest_match.match_id
   and part.ladder_member_id = with_rank.ladder_member_id
  where with_rank.ranked
    and with_rank.joined_at <= latest_match.confirmed_at
    and not (
      part.ladder_member_id is not null
      and with_rank.rated_match_count = 1
    )
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
),
first_ranked_by_latest as (
  select
    part.ladder_member_id
  from latest_match
  join public.participants part on part.match_id = latest_match.match_id
  join public.ladder_members lm on lm.id = part.ladder_member_id
  where lm.rated_match_count = 1
)
select
  with_rank.ladder_id,
  with_rank.ladder_member_id,
  with_rank.display_name,
  with_rank.rating,
  with_rank.provisional,
  with_rank.inactive,
  with_rank.ranked,
  with_rank.matches,
  with_rank.wins,
  with_rank.rank,
  case
    when not with_rank.ranked then null
    when first_ranked_by_latest.ladder_member_id is not null then null
    when previous_ranked.previous_rank is null then null
    else previous_ranked.previous_rank - with_rank.rank
  end as rank_change
from with_rank
left join previous_ranked
  on previous_ranked.ladder_id = with_rank.ladder_id
 and previous_ranked.ladder_member_id = with_rank.ladder_member_id
left join first_ranked_by_latest
  on first_ranked_by_latest.ladder_member_id = with_rank.ladder_member_id;

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to authenticated;

-- Reworded user-facing messages (Ladder → Leaderboard / member).

CREATE OR REPLACE FUNCTION public.assert_active_ladder_admin(p_ladder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.caller_is_active_ladder_admin(p_ladder_id) then
    raise exception 'You need to be an active Admin of this Leaderboard'
      using errcode = '42501';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_ladder(p_name text, p_make_default boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  cleaned text := btrim(p_name);
  pool_id uuid;
  ladder_id uuid;
  starting integer;
  attempts integer := 0;
begin
  if caller is null then
    raise exception 'Sign in before creating a Leaderboard'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before creating a Leaderboard'
      using errcode = 'P0002';
  end if;

  if cleaned is null or char_length(cleaned) = 0 then
    raise exception 'Leaderboard name is required'
      using errcode = '22023';
  end if;

  if char_length(cleaned) > 80 then
    raise exception 'Keep the Leaderboard name under 80 characters'
      using errcode = '22023';
  end if;

  select id into pool_id
  from public.games
  where name = 'pool';

  if pool_id is null then
    raise exception 'Pool is not available'
      using errcode = 'P0002';
  end if;

  select constants.starting_rating into starting
  from public.rating_constants() as constants;

  loop
    attempts := attempts + 1;
    begin
      insert into public.ladders (name, game_id, share_token)
      values (cleaned, pool_id, private.gen_join_code())
      returning id into ladder_id;
      exit;
    exception
      when unique_violation then
        if attempts >= 8 then
          raise exception 'Could not create a Leaderboard'
            using errcode = '23505';
        end if;
    end;
  end loop;

  insert into public.ladder_members (
    ladder_id,
    user_id,
    role,
    status,
    rating,
    rated_match_count
  )
  values (ladder_id, caller, 'admin', 'active', starting, 0);

  if p_make_default then
    update public.profiles
    set default_ladder_id = ladder_id
    where id = caller;
  end if;

  perform private.settle_default_ladder(caller);

  return ladder_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_ladder(p_ladder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  deleted integer;
  member_users uuid[];
  member_user uuid;
begin
  if caller is null then
    raise exception 'Sign in before deleting a Leaderboard'
      using errcode = '42501';
  end if;

  if not private.caller_is_super_admin() then
    raise exception 'Only the super admin can delete a Leaderboard'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct lm.user_id), '{}')
  into member_users
  from public.ladder_members lm
  where lm.ladder_id = p_ladder_id
    and lm.user_id is not null;

  delete from public.ladders
  where id = p_ladder_id;

  get diagnostics deleted = row_count;
  if deleted = 0 then
    raise exception 'No Leaderboard matches that id'
      using errcode = 'P0002';
  end if;

  foreach member_user in array member_users loop
    perform private.settle_default_ladder(member_user);
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.join_ladder(p_share_token text, p_make_default boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  target_ladder uuid;
  policy public.join_policy;
  starting integer;
  existing_status public.ladder_member_status;
begin
  if caller is null then
    raise exception 'Sign in before joining a Leaderboard'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = caller) then
    raise exception 'Create a profile before joining a Leaderboard'
      using errcode = 'P0002';
  end if;

  select l.id, l.join_policy
  into target_ladder, policy
  from public.ladders l
  where l.share_token = upper(btrim(p_share_token));

  if target_ladder is null then
    raise exception 'No Leaderboard matches this Share link'
      using errcode = 'P0002';
  end if;

  if policy is distinct from 'open' then
    raise exception 'This Leaderboard is not open to join'
      using errcode = '42501';
  end if;

  select lm.status
  into existing_status
  from public.ladder_members lm
  where lm.ladder_id = target_ladder
    and lm.user_id = caller;

  if existing_status = 'removed' then
    raise exception 'A Removed member cannot rejoin from the Share link'
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

  if p_make_default then
    update public.profiles
    set default_ladder_id = target_ladder
    where id = caller;
  end if;

  perform private.settle_default_ladder(caller);

  return 'joined';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.leave_ladder(p_ladder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  updated integer;
begin
  if caller is null then
    raise exception 'Sign in before leaving a Leaderboard'
      using errcode = '42501';
  end if;

  update public.ladder_members
  set status = 'left'
  where ladder_id = p_ladder_id
    and user_id = caller
    and status = 'active';

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'You need to be an active member to leave'
      using errcode = '42501';
  end if;

  perform private.settle_default_ladder(caller);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.preview_ladder(p_share_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'name', l.name,
    'game_name', g.name,
    'member_count', (
      select count(*)::int
      from public.ladder_members lm
      where lm.ladder_id = l.id
    )
  )
  into result
  from public.ladders l
  join public.games g on g.id = l.game_id
  where l.share_token = upper(btrim(p_share_token));

  if result is null then
    raise exception 'No Leaderboard matches this Share link'
      using errcode = 'P0002';
  end if;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.record_match(p_ladder_id uuid, p_side_a uuid[], p_side_b uuid[], p_result match_result, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  side_a uuid[] := coalesce(p_side_a, '{}');
  side_b uuid[] := coalesce(p_side_b, '{}');
  side_a_count integer := coalesce(cardinality(side_a), 0);
  side_b_count integer := coalesce(cardinality(side_b), 0);
  draws_allowed boolean;
  largest_side integer;
  cleaned_notes text := nullif(btrim(p_notes), '');
  listed integer;
  distinct_listed integer;
  match_id uuid;
begin
  if caller is null then
    raise exception 'Sign in before recording a Match'
      using errcode = '42501';
  end if;

  select games.draws_allowed, games.largest_side
    into draws_allowed, largest_side
  from public.ladders
  join public.games on games.id = ladders.game_id
  where ladders.id = p_ladder_id;

  if draws_allowed is null then
    raise exception 'No such Leaderboard'
      using errcode = 'P0002';
  end if;

  if side_a_count <> side_b_count then
    raise exception 'Sides must be the same size'
      using errcode = '22023';
  end if;

  if side_a_count = 0 then
    raise exception 'Each Side needs a Participant'
      using errcode = '22023';
  end if;

  if side_a_count > largest_side then
    raise exception 'A Side is larger than this Game allows'
      using errcode = '22023';
  end if;

  if p_result = 'draw' and not draws_allowed then
    raise exception 'This Game does not allow a Draw'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(side_a || side_b) as member_id
    where not exists (
      select 1
      from public.ladder_members
      where ladder_members.id = member_id
        and ladder_members.ladder_id = p_ladder_id
        and ladder_members.status = 'active'
    )
  ) then
    raise exception 'Every Participant must be an active member of this Leaderboard'
      using errcode = '22023';
  end if;

  select count(*), count(distinct member_id)
    into listed, distinct_listed
  from unnest(side_a || side_b) as member_id;

  if listed <> distinct_listed then
    raise exception 'A member can only appear once'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.ladder_members
    where ladder_members.id = any (side_a || side_b)
      and ladder_members.user_id = caller
  ) then
    raise exception 'You can only record a Match you played in'
      using errcode = '42501';
  end if;

  insert into public.matches (ladder_id, status, result, notes, recorded_by)
  values (p_ladder_id, 'pending', p_result, cleaned_notes, caller)
  returning id into match_id;

  insert into public.participants (match_id, ladder_member_id, side)
  select match_id, member_id, 'a'::public.match_side
  from unnest(side_a) as member_id;

  insert into public.participants (match_id, ladder_member_id, side)
  select match_id, member_id, 'b'::public.match_side
  from unnest(side_b) as member_id;

  return match_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reinstate_ladder_member(p_ladder_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
  target_user uuid;
begin
  select ladder_id, status, user_id
  into target_ladder, target_status, target_user
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Leaderboard'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'removed' then
    raise exception 'Only a Removed member can be reinstated'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set status = 'active'
  where id = p_ladder_member_id;

  if target_user is not null then
    perform private.settle_default_ladder(target_user);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_ladder_member(p_ladder_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
  target_user uuid;
begin
  select ladder_id, status, user_id
  into target_ladder, target_status, target_user
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Leaderboard'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'active' then
    raise exception 'Only an active member can be Removed'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set status = 'removed'
  where id = p_ladder_member_id;

  if target_user is not null then
    perform private.settle_default_ladder(target_user);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_default_ladder(p_ladder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Sign in before choosing a Default Leaderboard'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.ladder_members lm
    where lm.ladder_id = p_ladder_id
      and lm.user_id = caller
      and lm.status = 'active'
  ) then
    raise exception 'You need to be Joined to that Leaderboard'
      using errcode = '42501';
  end if;

  update public.profiles
  set default_ladder_id = p_ladder_id
  where id = caller;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_ladder_member_role(p_ladder_member_id uuid, p_role ladder_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_ladder uuid;
  target_status public.ladder_member_status;
begin
  select ladder_id, status
  into target_ladder, target_status
  from public.ladder_members
  where id = p_ladder_member_id;

  if target_ladder is null then
    raise exception 'No member matches that id'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(target_ladder) then
    raise exception 'You need to be an active Admin of this Leaderboard'
      using errcode = '42501';
  end if;

  if target_status is distinct from 'active' then
    raise exception 'Only an active member can change Role'
      using errcode = '22023';
  end if;

  update public.ladder_members
  set role = p_role
  where id = p_ladder_member_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.void_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := auth.uid();
  match_status public.match_status;
  match_ladder uuid;
  was_confirmed boolean;
begin
  if caller is null then
    raise exception 'Sign in before voiding a Match'
      using errcode = '42501';
  end if;

  select matches.status, matches.ladder_id
    into match_status, match_ladder
  from public.matches
  where matches.id = p_match_id
  for update;

  if match_status is null then
    raise exception 'No such Match'
      using errcode = 'P0002';
  end if;

  if not private.caller_is_active_ladder_admin(match_ladder) then
    raise exception 'You need to be an active Admin of this Leaderboard'
      using errcode = '42501';
  end if;

  if match_status = 'voided' then
    raise exception 'This Match is already Voided'
      using errcode = '22023';
  end if;

  was_confirmed := match_status = 'confirmed';

  update public.matches
  set
    status = 'voided',
    void_kind = 'admin',
    voided_by = caller,
    voided_at = now()
  where matches.id = p_match_id;

  if was_confirmed then
    perform private.replay_ladder(match_ladder);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.replay_ladder(p_ladder_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  starting integer;
  match_row record;
begin
  if not exists (select 1 from public.ladders where ladders.id = p_ladder_id) then
    raise exception 'No such Leaderboard'
      using errcode = 'P0002';
  end if;

  select constants.starting_rating into starting
  from public.rating_constants() as constants;

  perform 1
  from public.ladder_members
  where ladder_members.ladder_id = p_ladder_id
  order by ladder_members.id
  for update;

  perform 1
  from public.matches
  where matches.ladder_id = p_ladder_id
  order by matches.id
  for update;

  update public.ladder_members
  set
    rating = starting,
    rated_match_count = 0,
    last_match_at = null
  where ladder_members.ladder_id = p_ladder_id;

  update public.participants
  set rating_before = null, rating_change = null
  where participants.match_id in (
    select matches.id
    from public.matches
    where matches.ladder_id = p_ladder_id
      and matches.status = 'confirmed'
  );

  for match_row in
    select matches.id, matches.confirmed_at
    from public.matches
    where matches.ladder_id = p_ladder_id
      and matches.status = 'confirmed'
      and matches.confirmed_at is not null
    order by matches.confirmed_at asc, matches.id asc
  loop
    perform private.write_match_ratings(match_row.id, match_row.confirmed_at);
  end loop;
end;
$function$
;

revoke all on function public.assert_active_ladder_admin(uuid) from public, anon;
grant execute on function public.assert_active_ladder_admin(uuid) to authenticated;

revoke all on function public.create_ladder(text, boolean) from public, anon;
grant execute on function public.create_ladder(text, boolean) to authenticated;

revoke all on function public.delete_ladder(uuid) from public, anon;
grant execute on function public.delete_ladder(uuid) to authenticated;

revoke all on function public.join_ladder(text, boolean) from public, anon;
grant execute on function public.join_ladder(text, boolean) to authenticated;

revoke all on function public.leave_ladder(uuid) from public, anon;
grant execute on function public.leave_ladder(uuid) to authenticated;

revoke all on function public.preview_ladder(text) from public, anon;
grant execute on function public.preview_ladder(text) to authenticated;

revoke all on function public.record_match(uuid, uuid[], uuid[], public.match_result, text) from public, anon;
grant execute on function public.record_match(uuid, uuid[], uuid[], public.match_result, text) to authenticated;

revoke all on function public.reinstate_ladder_member(uuid) from public, anon;
grant execute on function public.reinstate_ladder_member(uuid) to authenticated;

revoke all on function public.remove_ladder_member(uuid) from public, anon;
grant execute on function public.remove_ladder_member(uuid) to authenticated;

revoke all on function public.set_default_ladder(uuid) from public, anon;
grant execute on function public.set_default_ladder(uuid) to authenticated;

revoke all on function public.set_ladder_member_role(uuid, public.ladder_role) from public, anon;
grant execute on function public.set_ladder_member_role(uuid, public.ladder_role) to authenticated;

revoke all on function public.void_match(uuid) from public, anon;
grant execute on function public.void_match(uuid) to authenticated;

revoke all on function private.replay_ladder(uuid) from public, anon, authenticated, service_role;
