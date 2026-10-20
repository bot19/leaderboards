-- Reject (opposing Side), Admin void, and Replay.
-- Voiding a Confirmed Match Replays the Ladder so later Ratings match a world
-- without that Match. Confirm and Replay share private.write_match_ratings.

-- Writes Rating before/change on Participants and updates Ladder members.
-- Does not touch Match status. Caller locks the Match and Ladder members.
create or replace function private.write_match_ratings(
  p_match_id uuid,
  p_rated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_result public.match_result;
  side_a jsonb;
  side_b jsonb;
  participant_count integer;
  change_count integer;
  change record;
begin
  select matches.result
    into match_result
  from public.matches
  where matches.id = p_match_id;

  if match_result is null then
    raise exception 'No such Match'
      using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', participants.id::text,
    'rating', ladder_members.rating,
    'rated_match_count', ladder_members.rated_match_count
  ) order by participants.ladder_member_id), '[]'::jsonb)
    into side_a
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and participants.side = 'a';

  select coalesce(jsonb_agg(jsonb_build_object(
    'key', participants.id::text,
    'rating', ladder_members.rating,
    'rated_match_count', ladder_members.rated_match_count
  ) order by participants.ladder_member_id), '[]'::jsonb)
    into side_b
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and participants.side = 'b';

  select count(*) into participant_count
  from public.participants
  where participants.match_id = p_match_id;

  select count(*) into change_count
  from public.rating_changes(side_a, side_b, match_result::text);

  if change_count <> participant_count then
    raise exception 'Could not rate this Match'
      using errcode = 'P0001';
  end if;

  for change in
    select changes.participant_key, changes.rating_change
    from public.rating_changes(side_a, side_b, match_result::text) as changes
  loop
    update public.participants
    set
      rating_before = ladder_members.rating,
      rating_change = change.rating_change
    from public.ladder_members
    where participants.id = change.participant_key::uuid
      and ladder_members.id = participants.ladder_member_id;

    update public.ladder_members
    set
      rating = ladder_members.rating + change.rating_change,
      rated_match_count = ladder_members.rated_match_count + 1,
      last_match_at = p_rated_at
    from public.participants
    where participants.id = change.participant_key::uuid
      and ladder_members.id = participants.ladder_member_id;
  end loop;
end;
$$;

revoke all on function private.write_match_ratings(uuid, timestamptz)
  from public, anon, authenticated;

create or replace function private.apply_match_rating(
  p_match_id uuid,
  p_rated_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_status public.match_status;
begin
  select matches.status
    into match_status
  from public.matches
  where matches.id = p_match_id
  for update;

  if match_status is null then
    raise exception 'No such Match'
      using errcode = 'P0002';
  end if;

  if match_status <> 'pending' then
    raise exception 'Only a Pending Match can be confirmed'
      using errcode = '22023';
  end if;

  perform 1
  from public.ladder_members
  where ladder_members.id in (
    select participants.ladder_member_id
    from public.participants
    where participants.match_id = p_match_id
  )
  order by ladder_members.id
  for update;

  perform private.write_match_ratings(p_match_id, p_rated_at);

  update public.matches
  set status = 'confirmed', confirmed_at = p_rated_at
  where matches.id = p_match_id;
end;
$$;

revoke all on function private.apply_match_rating(uuid, timestamptz)
  from public, anon, authenticated;

create or replace function private.replay_ladder(p_ladder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  starting integer;
  match_row record;
begin
  if not exists (select 1 from public.ladders where ladders.id = p_ladder_id) then
    raise exception 'No such Ladder'
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
$$;

revoke all on function private.replay_ladder(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.reject_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  match_status public.match_status;
  recorder_id uuid;
  caller_side public.match_side;
  recorder_side public.match_side;
begin
  if caller is null then
    raise exception 'Sign in before Rejecting a Match'
      using errcode = '42501';
  end if;

  select matches.status, matches.recorded_by
    into match_status, recorder_id
  from public.matches
  where matches.id = p_match_id
  for update;

  if match_status is null then
    raise exception 'No such Match'
      using errcode = 'P0002';
  end if;

  if match_status <> 'pending' then
    raise exception 'Only a Pending Match can be Rejected'
      using errcode = '22023';
  end if;

  select participants.side
    into caller_side
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and ladder_members.user_id = caller;

  if caller_side is null then
    raise exception 'Only a Participant on the opposing Side can Reject'
      using errcode = '42501';
  end if;

  select participants.side
    into recorder_side
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and ladder_members.user_id = recorder_id;

  if recorder_side is null or caller_side = recorder_side then
    raise exception 'The Side that recorded this Match cannot Reject it'
      using errcode = '42501';
  end if;

  update public.matches
  set
    status = 'voided',
    void_kind = 'rejected',
    voided_by = caller,
    voided_at = now()
  where matches.id = p_match_id;
end;
$$;

revoke all on function public.reject_match(uuid) from public, anon;
grant execute on function public.reject_match(uuid) to authenticated;

create or replace function public.void_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
    raise exception 'You need to be an active Admin of this Ladder'
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
$$;

revoke all on function public.void_match(uuid) from public, anon;
grant execute on function public.void_match(uuid) to authenticated;
