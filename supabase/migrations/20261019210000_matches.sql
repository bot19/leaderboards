-- Matches and Participants.
-- Recording creates a Pending Match. Confirming rates it once, in that transaction,
-- from Ratings as they stand at that moment.

create type public.match_status as enum ('pending', 'confirmed', 'voided');
create type public.match_result as enum ('side_a_won', 'side_b_won', 'draw');
create type public.match_side as enum ('a', 'b');
create type public.match_void_kind as enum ('rejected', 'admin');

-- Rating changes are fractional. Store them exactly so confirmation order
-- matches the rating module on the next Match.
drop view public.leaderboard;

alter table public.ladder_members
  alter column rating type numeric;

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

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  ladder_id uuid not null references public.ladders (id) on delete cascade,
  status public.match_status not null default 'pending',
  result public.match_result not null,
  notes text,
  recorded_by uuid not null references public.profiles (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  confirmed_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  void_kind public.match_void_kind
);

create index matches_ladder_id_idx on public.matches (ladder_id);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  ladder_member_id uuid not null references public.ladder_members (id) on delete cascade,
  side public.match_side not null,
  rating_before numeric,
  rating_change numeric,
  unique (match_id, ladder_member_id)
);

create index participants_ladder_member_id_idx on public.participants (ladder_member_id);

alter table public.matches enable row level security;
alter table public.participants enable row level security;

create policy matches_select_visible
  on public.matches
  for select
  to authenticated
  using (private.caller_can_read_ladder(ladder_id));

create policy participants_select_visible
  on public.participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches
      where matches.id = participants.match_id
        and private.caller_can_read_ladder(matches.ladder_id)
    )
  );

revoke all on table public.matches from public, anon, authenticated;
grant select on table public.matches to authenticated;
grant select, insert, update, delete on table public.matches to service_role;

revoke all on table public.participants from public, anon, authenticated;
grant select on table public.participants to authenticated;
grant select, insert, update, delete on table public.participants to service_role;

create or replace function public.record_match(
  p_ladder_id uuid,
  p_side_a uuid[],
  p_side_b uuid[],
  p_result public.match_result,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
    raise exception 'No such Ladder'
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
    raise exception 'Every Participant must be an active Ladder member of this Ladder'
      using errcode = '22023';
  end if;

  select count(*), count(distinct member_id)
    into listed, distinct_listed
  from unnest(side_a || side_b) as member_id;

  if listed <> distinct_listed then
    raise exception 'A Ladder member can only appear once'
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
$$;

revoke all on function public.record_match(uuid, uuid[], uuid[], public.match_result, text) from public, anon;
grant execute on function public.record_match(uuid, uuid[], uuid[], public.match_result, text) to authenticated;

-- Rates a Pending Match from Ratings as they stand, then marks it Confirmed.
-- Confirm checks who is allowed to call this. Replay does not.
create or replace function private.apply_match_rating(p_match_id uuid)
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
  rated_at timestamptz := now();
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
      last_match_at = rated_at
    from public.participants
    where participants.id = change.participant_key::uuid
      and ladder_members.id = participants.ladder_member_id;
  end loop;

  update public.matches
  set status = 'confirmed', confirmed_at = rated_at
  where matches.id = p_match_id;
end;
$$;

revoke all on function private.apply_match_rating(uuid) from public, anon, authenticated;

create or replace function public.confirm_match(p_match_id uuid)
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
    raise exception 'Sign in before confirming a Match'
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
    raise exception 'Only a Pending Match can be confirmed'
      using errcode = '22023';
  end if;

  select participants.side
    into caller_side
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and ladder_members.user_id = caller;

  if caller_side is null then
    raise exception 'Only a Participant on the opposing Side can confirm'
      using errcode = '42501';
  end if;

  select participants.side
    into recorder_side
  from public.participants
  join public.ladder_members on ladder_members.id = participants.ladder_member_id
  where participants.match_id = p_match_id
    and ladder_members.user_id = recorder_id;

  if recorder_side is null or caller_side = recorder_side then
    raise exception 'The Side that recorded this Match cannot confirm it'
      using errcode = '42501';
  end if;

  perform private.apply_match_rating(p_match_id);
end;
$$;

revoke all on function public.confirm_match(uuid) from public, anon;
grant execute on function public.confirm_match(uuid) to authenticated;
