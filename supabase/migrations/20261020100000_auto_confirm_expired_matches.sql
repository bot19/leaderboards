-- Auto-confirm Pending Matches after the Confirmation window.
-- pg_cron calls private.confirm_expired_pending_matches(now()) on a schedule.
-- Tests drive the same function with a chosen time via the database role.

create extension if not exists pg_cron with schema pg_catalog;

drop function if exists public.rating_constants();

create or replace function public.rating_constants()
returns table (
  starting_rating integer,
  k_factor integer,
  provisional_k_factor integer,
  provisional_threshold integer,
  confirmation_window_hours integer
)
language sql
immutable
set search_path = ''
as $$
  select 1000, 32, 64, 5, 48;
$$;

revoke all on function public.rating_constants() from public, anon, authenticated;

-- Rated-at is when the Match becomes Confirmed (manual now(), or window expiry).
drop function if exists private.apply_match_rating(uuid);

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
  match_result public.match_result;
  side_a jsonb;
  side_b jsonb;
  participant_count integer;
  change_count integer;
  change record;
begin
  select matches.status, matches.result
    into match_status, match_result
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

  update public.matches
  set status = 'confirmed', confirmed_at = p_rated_at
  where matches.id = p_match_id;
end;
$$;

revoke all on function private.apply_match_rating(uuid, timestamptz) from public, anon, authenticated;

create or replace function private.confirm_expired_pending_matches(p_as_of timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_hours integer;
  match_row record;
begin
  select constants.confirmation_window_hours into window_hours
  from public.rating_constants() as constants;

  for match_row in
    select
      matches.id,
      matches.recorded_at + make_interval(hours => window_hours) as expired_at
    from public.matches
    where matches.status = 'pending'
      and matches.recorded_at + make_interval(hours => window_hours) <= p_as_of
    order by matches.recorded_at asc, matches.id asc
  loop
    perform private.apply_match_rating(match_row.id, match_row.expired_at);
  end loop;
end;
$$;

revoke all on function private.confirm_expired_pending_matches(timestamptz)
  from public, anon, authenticated, service_role;

select cron.schedule(
  'confirm-expired-pending-matches',
  '* * * * *',
  $$select private.confirm_expired_pending_matches(now())$$
);
